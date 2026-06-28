import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { buildHkdseEnglishDemoPayload } from "@/lib/hkdse-demo-payload";
import { gradeHkdseSections } from "@/lib/hkdse-grading";
import type { AnswerRecord } from "@/lib/grade-utils";

export const PAPER_MAX: Record<HkdsePaperId, number> = {
  R: 20,
  W: 25,
  L: 30,
  S: 10,
};

export const ALL_PAPERS: HkdsePaperId[] = ["R", "W", "L", "S"];

export type ComponentScore = {
  score: number;
  max: number;
  pct: number;
};

export type SimSessionResult = {
  total_score: number;
  total_max: number;
  component_scores: Record<HkdsePaperId, ComponentScore>;
  bands: Record<string, string>;
  overall_band: string;
  section_scores?: Record<string, unknown>;
  result_summary?: Record<string, unknown>;
};

export function percentageToBand(pct: number): string {
  if (pct >= 88) return "5**";
  if (pct >= 80) return "5*";
  if (pct >= 70) return "5";
  if (pct >= 60) return "4";
  if (pct >= 50) return "3";
  if (pct >= 40) return "2";
  return "1";
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededFloat(seed: number, salt: number): number {
  const x = Math.sin(seed + salt * 9999) * 10000;
  return x - Math.floor(x);
}

function scoreForPaper(
  email: string,
  paper: HkdsePaperId,
  roundNumber: number,
  targetedPaper?: HkdsePaperId,
): number {
  const max = PAPER_MAX[paper];
  const seed = hashSeed(`${email}:${paper}:round${roundNumber}`);
  const base = seededFloat(seed, 1);

  let pct: number;
  if (roundNumber === 1) {
    pct = 0.35 + base * 0.53;
  } else {
    const prevSeed = hashSeed(`${email}:${paper}:round${roundNumber - 1}`);
    const prevBase = seededFloat(prevSeed, 1);
    const prevPct = 0.35 + prevBase * 0.53;
    if (paper === targetedPaper) {
      const bump = 8 + seededFloat(seed, 2) * 15;
      pct = Math.min(0.95, prevPct + bump / 100);
    } else {
      pct = prevPct + (seededFloat(seed, 3) - 0.5) * 0.06;
      pct = Math.max(0.3, Math.min(0.92, pct));
    }
  }

  return Math.round(pct * max);
}

function buildSessionFromGrading(
  papers: HkdsePaperId[],
  useModelAnswers: boolean,
): SimSessionResult {
  const payload = buildHkdseEnglishDemoPayload();
  const answersByQ = new Map<string, AnswerRecord>();

  for (const section of payload.sections) {
    if (!papers.includes(section.id as HkdsePaperId)) continue;
    for (const q of section.questions) {
      if (useModelAnswers) {
        answersByQ.set(q.id, { value: q.answer ?? "" });
      } else {
        answersByQ.set(q.id, { value: "" });
      }
    }
  }

  const gradedSections = payload.sections.filter((s) =>
    papers.includes(s.id as HkdsePaperId),
  );
  const graded = gradeHkdseSections(gradedSections, answersByQ);

  const component_scores = {} as Record<HkdsePaperId, ComponentScore>;
  let total_score = 0;
  let total_max = 0;

  for (const paper of papers) {
    const comp = graded.component_scores[paper];
    const score = comp?.score ?? 0;
    const max = comp?.max ?? PAPER_MAX[paper];
    const pct = max > 0 ? (score / max) * 100 : 0;
    component_scores[paper] = { score, max, pct };
    total_score += score;
    total_max += max;
  }

  const bands: Record<string, string> = {};
  for (const paper of papers) {
    const key =
      paper === "R"
        ? "reading"
        : paper === "W"
          ? "writing"
          : paper === "L"
            ? "listening_integrated_skills"
            : "speaking";
    bands[key] = graded.bands[key] ?? percentageToBand(component_scores[paper]?.pct ?? 0);
  }

  const overallPct = total_max > 0 ? (total_score / total_max) * 100 : 0;

  return {
    total_score,
    total_max,
    component_scores,
    bands,
    overall_band: `Band ${percentageToBand(overallPct)}`,
    section_scores: graded.section_scores,
    result_summary: graded.resultSummary as Record<string, unknown>,
  };
}

export function generateSimSession(
  email: string,
  papers: HkdsePaperId[],
  roundNumber: number,
  targetedPaper?: HkdsePaperId,
): SimSessionResult {
  const lower = email.toLowerCase();
  if (roundNumber === 1 && lower.includes("amy.chan")) {
    return generateExcellentSession(papers);
  }
  if (roundNumber === 1 && lower.includes("ben.lee")) {
    return generatePoorSession(papers);
  }

  const assigned = papers.length > 0 ? papers : ALL_PAPERS;
  const component_scores = {} as Record<HkdsePaperId, ComponentScore>;
  let total_score = 0;
  let total_max = 0;

  for (const paper of assigned) {
    const max = PAPER_MAX[paper];
    const score = scoreForPaper(email, paper, roundNumber, targetedPaper);
    const pct = max > 0 ? (score / max) * 100 : 0;
    component_scores[paper] = { score, max, pct };
    total_score += score;
    total_max += max;
  }

  const bands: Record<string, string> = {};
  for (const paper of assigned) {
    const cs = component_scores[paper];
    const key =
      paper === "R"
        ? "reading"
        : paper === "W"
          ? "writing"
          : paper === "L"
            ? "listening_integrated_skills"
            : "speaking";
    bands[key] = percentageToBand(cs.pct);
  }

  const overallPct = total_max > 0 ? (total_score / total_max) * 100 : 0;

  return {
    total_score,
    total_max,
    component_scores,
    bands,
    overall_band: `Band ${percentageToBand(overallPct)}`,
  };
}

/** Demo showcase: top-band student with full marking-scheme detail. */
export function generateExcellentSession(papers: HkdsePaperId[]): SimSessionResult {
  const assigned = papers.length > 0 ? papers : ALL_PAPERS;
  return buildSessionFromGrading(assigned, true);
}

/** Demo showcase: weak student (~Band 1) with blank responses. */
export function generatePoorSession(papers: HkdsePaperId[]): SimSessionResult {
  const assigned = papers.length > 0 ? papers : ALL_PAPERS;
  return buildSessionFromGrading(assigned, false);
}
