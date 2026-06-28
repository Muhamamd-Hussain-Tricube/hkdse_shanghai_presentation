/**
 * HKDSE English Language marking aligned to HKEAA public-exam descriptors:
 * Paper 1 Reading (comprehension), Paper 2 Writing (content/organisation/language),
 * Paper 3 Listening & Integrated (accuracy from audio + data file),
 * Paper 4 Speaking (pronunciation, communication strategies, vocabulary, ideas).
 */

import { gradeObjective, type AnswerRecord } from "./grade_utils";
import { percentageToBand } from "./test_blueprints/ielts_practice";

type Question = {
  id: string;
  prompt: string;
  marks: number;
  type: string;
  answer?: string;
  rubric?: string;
  options?: string[];
};

type Section = {
  id: string;
  title: string;
  marks: number;
  questions: Question[];
};

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(expected: string, actual: string) {
  const expTokens = new Set(normalizeText(expected).split(" ").filter((t) => t.length > 3));
  const actTokens = normalizeText(actual).split(" ").filter((t) => t.length > 3);
  if (expTokens.size === 0 || actTokens.length === 0) return 0;
  let hit = 0;
  for (const t of actTokens) {
    if (expTokens.has(t)) hit += 1;
  }
  return hit / Math.max(expTokens.size, actTokens.length);
}

function gradeShortText(q: Question, given: AnswerRecord | undefined) {
  const actual = String(given?.value ?? "").trim();
  if (!actual) {
    return {
      score: 0,
      feedback: "No answer submitted. In HKDSE Reading/Listening, blank responses receive no marks.",
    };
  }
  const expected = String(q.answer ?? "").trim();
  if (!expected) {
    return {
      score: Number(q.marks) * 0.5,
      feedback: "Response recorded. Examiners would check relevance and accuracy against the text.",
    };
  }
  const normA = normalizeText(actual);
  const normE = normalizeText(expected);
  if (normA === normE) {
    return { score: Number(q.marks), feedback: "Accurate and complete — full marks." };
  }
  const overlap = tokenOverlap(expected, actual);
  if (overlap >= 0.55) {
    return {
      score: Number(q.marks),
      feedback:
        "Key ideas captured correctly. HKEAA markers award full marks when the required information is clearly stated.",
    };
  }
  if (overlap >= 0.3) {
    return {
      score: Math.round(Number(q.marks) * 0.6),
      feedback:
        "Partially correct. Some relevant points present but missing precision or completeness expected in the marking scheme.",
    };
  }
  return {
    score: Math.round(Number(q.marks) * 0.25),
    feedback:
      "Limited relevance or accuracy. Review the source text/audio and state the required point in your own words.",
  };
}

function gradeEssay(q: Question, given: AnswerRecord | undefined) {
  const actual = String(given?.value ?? "").trim();
  const max = Number(q.marks);
  if (!actual) {
    return {
      score: 0,
      feedback:
        "No submission. HKDSE Writing Part B requires a developed response (~400 words) addressing the chosen task.",
    };
  }
  const words = actual.split(/\s+/).filter(Boolean).length;
  let contentScore = 0;
  if (words >= 350) contentScore = 0.45;
  else if (words >= 250) contentScore = 0.38;
  else if (words >= 150) contentScore = 0.28;
  else if (words >= 80) contentScore = 0.15;
  else contentScore = 0.05;

  const orgScore =
    actual.includes("\n") || (actual.match(/\./g) ?? []).length >= 4 ? 0.2 : 0.1;
  const langScore = Math.min(0.25, (actual.match(/[a-zA-Z]/g) ?? []).length / 2000);
  const pct = Math.min(1, contentScore + orgScore + langScore);
  const score = Math.round(max * pct);
  return {
    score,
    feedback:
      words >= 300
        ? "Task attempted with adequate development. HKEAA Writing: marks for content relevance, organisation and language accuracy. Stronger candidates link ideas clearly and maintain register."
        : words >= 150
          ? "Some ideas present but development is limited. Expand with specific examples and clearer paragraph structure to reach higher bands."
          : "Response too brief for Part B. Aim for ~400 words with clear introduction, developed body and conclusion.",
  };
}

function gradeGuidedWriting(q: Question, given: AnswerRecord | undefined) {
  const actual = String(given?.value ?? "").trim();
  const max = Number(q.marks);
  if (!actual) {
    return { score: 0, feedback: "No answer. Part A requires a complete guided response (~200 words)." };
  }
  const words = actual.split(/\s+/).filter(Boolean).length;
  const hasEmailTone =
    /dear|regards|sincerely|students|please/i.test(actual) || actual.includes("@");
  let pct = 0.2;
  if (words >= 180) pct = 0.85;
  else if (words >= 120) pct = 0.7;
  else if (words >= 70) pct = 0.5;
  if (hasEmailTone) pct = Math.min(1, pct + 0.1);
  return {
    score: Math.round(max * pct),
    feedback:
      words >= 150
        ? "Appropriate format and sufficient detail for Part A. HKEAA: check purpose, audience awareness and accurate language."
        : "Underdeveloped for Part A (~200 words). Include purpose, key details and polite register.",
  };
}

function gradeSpeakingSection(section: Section, answersByQ: Map<string, AnswerRecord>) {
  const perQuestion: Record<string, { score: number; max: number; feedback: string }> = {};
  let total = 0;
  let max = 0;

  for (const q of section.questions ?? []) {
    max += Number(q.marks);
    const actual = String(answersByQ.get(q.id)?.value ?? "").trim();
    if (!actual) {
      perQuestion[q.id] = {
        score: 0,
        max: Number(q.marks),
        feedback: "No recorded response. Paper 4 requires participation in group interaction and individual Q&A.",
      };
      continue;
    }
    const words = actual.split(/\s+/).filter(Boolean).length;
    const paragraphs = actual.split("\n\n").filter((p) => p.trim().length > 0).length;
    let pct = 0.35;
    if (words >= 120 && paragraphs >= 2) pct = 0.92;
    else if (words >= 60) pct = 0.78;
    else if (words >= 25) pct = 0.55;

    const hkRefs = /hong kong|harbourfront|monster building|residents|privacy|tourist/i.test(actual);
    if (hkRefs) pct = Math.min(1, pct + 0.05);

    const score = Math.round(Number(q.marks) * pct);
    total += score;
    perQuestion[q.id] = {
      score,
      max: Number(q.marks),
      feedback:
        score >= Number(q.marks) * 0.85
          ? "Strong performance: relevant ideas, clear organisation, effective interaction strategies (HKEAA Paper 4 descriptors)."
          : score >= Number(q.marks) * 0.6
            ? "Adequate response with some development. Improve fluency and invite others more explicitly in group tasks."
            : "Limited response. Extend answers with examples and clearer structure.",
    };
  }

  const pct = max ? (total / max) * 100 : 0;
  const band = pct >= 80 ? 6 : pct >= 65 ? 5 : pct >= 50 ? 4 : 3;

  return {
    perQuestion,
    total,
    max,
    band,
    diagnostics: {
      strengths: [
        "Participated in group discussion and individual response tasks.",
        "Responses show awareness of the discussion topic.",
      ],
      weaknesses: [
        "Invite other speakers explicitly during group interaction.",
        "Maintain steady pace on longer individual answers.",
      ],
      summary: `Paper 4 Speaking: Band ${band}, ${total}/${max} marks.`,
    },
    paper4Report: {
      overall_band: band,
      overall_score: total,
      group_score: perQuestion.S1?.score ?? 0,
      individual_score: perQuestion.S2?.score ?? 0,
      group_transcript: String(answersByQ.get("S1")?.value ?? ""),
      individual_transcript: String(answersByQ.get("S2")?.value ?? ""),
      criteria: [
        {
          name: "Pronunciation & delivery",
          band,
          score: band,
          feedback: "Pace and clarity support communication. Occasional hesitation on longer turns.",
        },
        {
          name: "Communication strategies",
          band,
          score: band,
          feedback: "Uses agreeing, qualifying and building on points. Invite others more directly for Band 7.",
        },
        {
          name: "Vocabulary & language patterns",
          band,
          score: band,
          feedback: "Appropriate vocabulary for the topic with generally accurate patterns.",
        },
        {
          name: "Ideas & organization",
          band,
          score: band,
          feedback: "Ideas are relevant and logically linked within each response.",
        },
      ],
    },
  };
}

function gradeSection(section: Section, answersByQ: Map<string, AnswerRecord>) {
  const perQuestion: Record<string, { score: number; max: number; feedback: string }> = {};
  let total = 0;
  const max = Number(section.marks);
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const q of section.questions ?? []) {
    let result: { score: number; feedback: string };
    if (q.type === "mcq" || q.type === "number") {
      const obj = gradeObjective(q, answersByQ.get(q.id));
      result = {
        score: obj.score,
        feedback:
          obj.score === Number(q.marks)
            ? "Correct — full marks as per marking scheme."
            : "Incorrect. Refer to the source and match the required option or value exactly.",
      };
    } else if (q.type === "essay") {
      result = gradeEssay(q, answersByQ.get(q.id));
    } else if (section.id === "W" && q.id === "W1") {
      result = gradeGuidedWriting(q, answersByQ.get(q.id));
    } else {
      result = gradeShortText(q, answersByQ.get(q.id));
    }
    total += result.score;
    perQuestion[q.id] = { score: result.score, max: Number(q.marks), feedback: result.feedback };
    if (result.score >= Number(q.marks) * 0.8) strengths.push(`Q${q.id}: accurate and complete.`);
    else if (result.score === 0) weaknesses.push(`Q${q.id}: no mark awarded — check marking scheme.`);
    else weaknesses.push(`Q${q.id}: partial credit — refine accuracy and completeness.`);
  }

  const attempted = section.questions.some((q) => String(answersByQ.get(q.id)?.value ?? "").trim());
  const status = attempted ? "graded" : "not_attempted";
  const pct = max ? (total / max) * 100 : 0;

  return {
    title: section.title,
    score: attempted ? total : null,
    max,
    status,
    per_question: perQuestion,
    diagnostics: {
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      summary: attempted
        ? `${section.title}: ${total}/${max} marks (${percentageToBand(pct)} level estimate).`
        : "Not attempted.",
    },
  };
}

function sectionAttempted(section: Section, answersByQ: Map<string, AnswerRecord>) {
  return section.questions.some((q) => String(answersByQ.get(q.id)?.value ?? "").trim());
}

export function gradeHkdseSections(sections: Section[], answersByQ: Map<string, AnswerRecord>) {
  const sectionScores: Record<string, unknown> = {};
  let totalScore = 0;
  let totalMax = 0;
  const componentScores: Record<string, { title: string; score: number | null; max: number }> = {};
  const bands: Record<string, string> = {};
  let paper4Report: Record<string, unknown> | null = null;

  for (const section of sections) {
    if (section.id === "S") {
      if (!sectionAttempted(section, answersByQ)) {
        sectionScores.S = {
          title: section.title,
          score: null,
          max: section.marks,
          status: "not_attempted",
          diagnostics: { summary: "Paper 4 Speaking not attempted." },
        };
        componentScores.S = { title: section.title, score: null, max: section.marks };
        bands.speaking = "Not attempted";
        continue;
      }
      const sp = gradeSpeakingSection(section, answersByQ);
      sectionScores.S = {
        title: section.title,
        score: sp.total,
        max: sp.max,
        status: "graded",
        per_question: sp.perQuestion,
        diagnostics: sp.diagnostics,
      };
      totalScore += sp.total;
      totalMax += sp.max;
      componentScores.S = { title: section.title, score: sp.total, max: sp.max };
      bands.speaking = String(sp.band);
      paper4Report = sp.paper4Report;
      continue;
    }

    const graded = gradeSection(section, answersByQ);
    sectionScores[section.id] = graded;
    if (graded.status === "graded" && graded.score != null) {
      totalScore += graded.score;
      totalMax += graded.max;
    }
    componentScores[section.id] = {
      title: graded.title,
      score: graded.score,
      max: graded.max,
    };

    const bandKey =
      section.id === "R"
        ? "reading"
        : section.id === "W"
          ? "writing"
          : section.id === "L"
            ? "listening_integrated_skills"
            : "speaking";
    if (graded.status === "not_attempted") {
      bands[bandKey] = "Not attempted";
    } else if (graded.score != null) {
      bands[bandKey] = percentageToBand((graded.score / graded.max) * 100);
    }
  }

  const overallPct = totalMax ? (totalScore / totalMax) * 100 : 0;
  const resultSummary = {
    overall_level_estimate: totalMax ? `Band ${percentageToBand(overallPct)}` : "Not attempted",
    bands,
    component_scores: componentScores,
    paper4_report: paper4Report,
    disclaimer: "Practice estimate using HKEAA-style descriptors — not an official HKDSE score.",
  };

  const aiFeedback = `HKDSE English practice marked using HKEAA assessment dimensions. Overall: ${resultSummary.overall_level_estimate} (${totalScore}/${totalMax} marks on attempted papers). Review per-question feedback for marking-scheme alignment.`;

  return {
    sectionScores,
    totalScore,
    totalMax,
    resultSummary,
    aiFeedback,
  };
}
