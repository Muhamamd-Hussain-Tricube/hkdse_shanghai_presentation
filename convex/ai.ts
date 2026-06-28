/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { geminiChatCompletion } from "./lib/gemini";
import { gradeObjective, GRADE_TOOL_SCHEMA, type AnswerRecord } from "./lib/grade_utils";
import {
  buildCurriculumResult,
  buildHkdseEnglishDemoPayload,
  getBlueprint,
  isKnownTestType,
  scoreCurriculumQuestion,
  validatePayloadForTestType,
  type ContentLocale,
} from "./lib/test_blueprints";
import { gradeHkdseSections } from "./lib/hkdse_grading";

const testType = v.union(
  v.literal("hk_aptitude"),
  v.literal("ielts_practice"),
  v.literal("curriculum_fit"),
);

function apiKey() {
  const key = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!key)
    throw new Error("GOOGLE_AI_STUDIO_API_KEY not configured in Convex environment variables");
  return key;
}

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

function pct(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

async function aiGradeSection(opts: {
  apiKey: string;
  sectionTitle: string;
  passage?: string;
  examinerNote?: string;
  items: Array<{
    question_id: string;
    prompt: string;
    type: string;
    marks: number;
    rubric?: string;
    model_answer?: string;
    student_answer: string;
    essay_prompts?: string[];
  }>;
}) {
  const res = await geminiChatCompletion(opts.apiKey, {
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          opts.examinerNote ??
          "You are an experienced examiner. Grade fairly using rubrics. Return the grade_section tool.",
      },
      {
        role: "user",
        content: JSON.stringify({
          section: opts.sectionTitle,
          passage: opts.passage,
          items: opts.items,
          instructions:
            "Grade each item. Award partial marks where appropriate. One-sentence feedback per item. Section diagnostics.",
        }),
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "grade_section",
          description: "Return per-question scores and section diagnostics.",
          parameters: GRADE_TOOL_SCHEMA,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "grade_section" } },
  });
  if (!res.ok)
    throw new Error(`AI grading failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no grading payload");
  return JSON.parse(args) as {
    items: Array<{
      question_id: string;
      score: number;
      max: number;
      feedback: string;
      subskill?: string;
    }>;
    section_diagnostics: { strengths: string[]; weaknesses: string[]; summary: string };
  };
}

async function gradeStandardSections(
  key: string,
  sections: any[],
  answersByQ: Map<string, AnswerRecord>,
  examinerNote?: string,
) {
  const sectionResults = await Promise.all(
    sections.map(async (section: any) => {
      const subjectiveItems: any[] = [];
      const perQuestion: Record<
        string,
        { score: number; max: number; feedback?: string; subskill?: string }
      > = {};
      let sectionMax = 0;

      for (const q of section.questions ?? []) {
        sectionMax += Number(q.marks) || 0;
        if (q.type === "mcq" || q.type === "number") {
          const r = gradeObjective(q, answersByQ.get(q.id));
          perQuestion[q.id] = {
            score: r.score,
            max: Number(q.marks),
            feedback:
              r.correct === true
                ? "Correct."
                : r.correct === false
                  ? "Incorrect."
                  : "Not answered.",
            subskill: q.subskill,
          };
        } else if (q.type === "likert") {
          perQuestion[q.id] = {
            score: Number(q.marks),
            max: Number(q.marks),
            feedback: "Recorded.",
            subskill: q.subskill,
          };
        } else {
          subjectiveItems.push(q);
        }
      }

      let diagnostics = { strengths: [] as string[], weaknesses: [] as string[], summary: "" };
      if (subjectiveItems.length > 0) {
        try {
          const aiOut = await aiGradeSection({
            apiKey: key,
            sectionTitle: section.title,
            passage: section.passage ?? section.listening_script,
            examinerNote,
            items: subjectiveItems.map((q: any) => {
              const given = answersByQ.get(q.id);
              return {
                question_id: q.id,
                prompt: q.prompt,
                type: q.type,
                marks: Number(q.marks),
                rubric: q.rubric,
                model_answer: q.answer,
                essay_prompts: q.essay_prompts,
                student_answer: given?.value == null ? "" : String(given.value),
              };
            }),
          });
          for (const item of aiOut.items) {
            const max =
              Number(item.max) ||
              subjectiveItems.find((q: any) => q.id === item.question_id)?.marks ||
              0;
            perQuestion[item.question_id] = {
              score: Math.max(0, Math.min(Number(item.score) || 0, max)),
              max,
              feedback: item.feedback,
              subskill: item.subskill,
            };
          }
          diagnostics = aiOut.section_diagnostics;
        } catch {
          for (const q of subjectiveItems) {
            perQuestion[q.id] = {
              score: 0,
              max: Number(q.marks),
              feedback: "Could not be auto-graded.",
            };
          }
        }
      } else {
        const correctCount = Object.values(perQuestion).filter((p) => p.score === p.max).length;
        diagnostics = {
          strengths:
            correctCount >= Math.ceil((section.questions?.length ?? 0) * 0.7)
              ? [`Strong performance in ${section.title}.`]
              : [],
          weaknesses: [],
          summary: `${correctCount} of ${section.questions?.length ?? 0} items correct.`,
        };
      }

      const sectionScore = Object.values(perQuestion).reduce((acc, p) => acc + p.score, 0);
      return {
        id: section.id,
        data: {
          title: section.title,
          score: Number(sectionScore.toFixed(2)),
          max: sectionMax,
          per_question: perQuestion,
          diagnostics,
        },
        score: sectionScore,
        max: sectionMax,
      };
    }),
  );

  const sectionScores: Record<string, any> = {};
  let totalScore = 0;
  let totalMax = 0;
  for (const r of sectionResults) {
    sectionScores[r.id] = r.data;
    totalScore += r.score;
    totalMax += r.max;
  }
  return { sectionScores, totalScore, totalMax };
}

function gradeHkdseDemoSections(sections: any[], answersByQ: Map<string, AnswerRecord>) {
  const groupAnswer =
    String(answersByQ.get("S1")?.value ?? "").trim() ||
    "I think the problem is not simply taking photos, but how people behave when they take them. In Hong Kong, places like the Monster Building, the Tsim Sha Tsui harbourfront, and some old cafes can become crowded because visitors want the same picture. Residents may feel their privacy is being ignored, and shop owners may lose control of the atmosphere.\n\nI agree that rules are needed, but I would avoid a complete ban in most public places. A better balance would be clear signs, no-photo zones near private homes, and reminders not to block entrances or roads. For restaurants, I think owners should be allowed to set their own rules, like the Berlin example, because the dining experience is part of their business.\n\nTo conclude, Hong Kong should still welcome visitors who want to take photos, because photos can promote the city. But we need respectful behaviour. If tourists keep moving, ask before photographing people, and follow local signs, photo-taking can be enjoyable without disturbing residents.";
  const individualAnswer =
    String(answersByQ.get("S2")?.value ?? "").trim() ||
    "Yes, I like taking photos, especially when I travel or spend time with friends. Photos help me remember small details that I might forget later.\n\nI do share photos with friends, but usually only in private chats. I do not post everything online because some moments feel more personal.\n\nYes, I think it is very popular among teenagers because phones make it easy. Many people take photos of food, outfits, concerts, and nice views.\n\nYes, I have gone to the harbourfront and some cafes mainly to take photos. But I try not to block other people or stay too long.\n\nYes, photos are an important part of travelling because they help us remember the trip. However, if we only focus on photos, we may not enjoy the place properly.\n\nI think younger people probably take more photos because they use social media more often. Older people may take fewer photos, but their photos may be more meaningful.\n\nYes, it can spoil an experience if people only care about getting the perfect picture. It can also annoy others if they block paths or make too much noise.\n\nYes, tourism can cause disruption when there are too many visitors in residential areas. But with good rules and respectful behaviour, tourism can still benefit local businesses.";
  const speakingSection = sections.find((section) => section.id === "S");
  const sectionScores = {
    R: {
      title: "Paper 1 Reading",
      score: null,
      max: 20,
      status: "not_attempted",
      diagnostics: { summary: "Available as a separate practice paper." },
    },
    W: {
      title: "Paper 2 Writing",
      score: null,
      max: 25,
      status: "not_attempted",
      diagnostics: { summary: "Available as a separate practice paper." },
    },
    L: {
      title: "Paper 3 Listening & Integrated Skills",
      score: null,
      max: 30,
      status: "not_attempted",
      diagnostics: { summary: "Available as a separate practice paper." },
    },
    S: {
      title: speakingSection?.title ?? "Paper 4 Speaking",
      score: 9.2,
      max: 10,
      status: "graded",
      per_question: {
        S1: {
          score: 5.5,
          max: 6,
          feedback:
            "Strong interaction: clear stance, relevant examples from Hong Kong, and effective response to AI classmates.",
        },
        S2: {
          score: 3.7,
          max: 4,
          feedback:
            "Clear and mature responses with sensible elaboration. Keep pace steady on longer answers.",
        },
      },
      diagnostics: {
        strengths: [
          "Clear preference and topic awareness in the group interaction.",
          "Relevant Hong Kong examples helped localise the discussion.",
          "Individual responses were concise, natural and well organised.",
        ],
        weaknesses: [
          "Invite other speakers slightly more explicitly during the group task.",
          "Pause before contrast markers such as however and although.",
        ],
        summary: "Paper 4 Speaking: Band 6, 9.2/10.",
      },
    },
  };

  return {
    sectionScores,
    totalScore: 9.2,
    totalMax: 10,
    resultSummary: {
      overall_level_estimate: "Band 6",
      bands: {
        speaking: "6",
        reading: "Not attempted",
        writing: "Not attempted",
        listening_integrated_skills: "Not attempted",
      },
      component_scores: {
        S: { title: "Paper 4 Speaking", score: 9.2, max: 10 },
        R: { title: "Paper 1 Reading", score: null, max: 20 },
        W: { title: "Paper 2 Writing", score: null, max: 25 },
        L: { title: "Paper 3 Listening & Integrated Skills", score: null, max: 30 },
      },
      paper4_report: {
        overall_band: 6,
        overall_score: 9.2,
        group_score: 5.5,
        individual_score: 3.7,
        duration_label: "Recorded ~6:40",
        group_transcript: groupAnswer,
        individual_transcript: individualAnswer,
        criteria: [
          {
            name: "Pronunciation & delivery",
            band: 6,
            score: 6,
            feedback:
              "Voice projection and pacing are confident. Sounds and word clusters are clear, with only occasional hesitation when extending longer points.",
          },
          {
            name: "Communication strategies",
            band: 6,
            score: 6,
            feedback:
              "Uses a full range of strategies effectively: agreeing, qualifying, building on others' points, and bringing the group towards a balanced conclusion.",
          },
          {
            name: "Vocabulary & language patterns",
            band: 6,
            score: 6,
            feedback:
              "Wide and accurate vocabulary for the topic, including privacy, crowd control, local residents, atmosphere, and respectful behaviour. Minor slips do not impede communication.",
          },
          {
            name: "Ideas & organization",
            band: 6,
            score: 6,
            feedback:
              "Ideas are well developed, relevant and clearly linked. The response balances tourist enjoyment, business needs, privacy and practical regulation.",
          },
        ],
        strengths: [
          "Clear thesis: the issue is behaviour, not photography itself.",
          "Strong local examples: Monster Building, harbourfront, old cafes and restaurant rules.",
          "Balanced judgement: supports tourism while protecting residents and private businesses.",
          "Individual answers are natural, concise and easy for an examiner to follow.",
        ],
        focus_next: [
          "Invite classmates directly once or twice, for example: 'What do you think about restaurant rules?'",
          "Add one brief concession before the conclusion to sound more interactive.",
          "Keep final answers to about 20-30 seconds each so the pace stays controlled.",
        ],
        examiner_feedback:
          "This was a strong Paper 4 performance. In Part A, the candidate identified the central tension between tourism, privacy and public order, then developed the discussion with relevant Hong Kong examples. The candidate responded naturally to other speakers and helped move the group towards a practical conclusion. In Part B, the answers were fluent, mature and appropriately concise. To move closer to Band 7, the candidate should invite other group members more explicitly and vary follow-up phrases during interaction.",
      },
      disclaimer: "Practice estimate only - not an official HKDSE score.",
    },
    aiFeedback:
      "Predicted HKDSE English Paper 4 Speaking band: 6. Strong group interaction, relevant Hong Kong examples, and clear individual responses.",
  };
}

export const generateTest = action({
  args: {
    sessionId: v.id("test_sessions"),
    assignmentId: v.optional(v.id("case_test_assignments")),
    contentLocale: v.union(v.literal("en"), v.literal("zh-Hans")),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await requireUserId(ctx);
    const { session, caseRow, assignment }: any = await ctx.runQuery(
      internal.backend.generationContext,
      {
        sessionId: args.sessionId,
        userId,
      },
    );
    if (!isKnownTestType(session.test_type))
      throw new Error(`Unknown test_type: ${session.test_type}`);
    if (args.assignmentId && (!assignment || assignment._id !== args.assignmentId)) {
      throw new Error("Test session does not match the requested assignment.");
    }
    if (session.test_payload && session.status !== "failed") {
      const existingPayloadError = validatePayloadForTestType(
        session.test_payload,
        session.test_type,
      );
      if (!existingPayloadError)
        return { ok: true, already_generated: true, test_type: session.test_type };
    }

    const blueprint = getBlueprint(session.test_type);
    if (session.test_type === "ielts_practice") {
      const payload = {
        ...buildHkdseEnglishDemoPayload(),
        test_type: session.test_type,
        schema_version: 2,
      };
      const validationError = validatePayloadForTestType(payload, session.test_type);
      if (validationError) throw new Error(validationError);
      const sectionDurations = Object.fromEntries(
        (payload.sections ?? []).map((s: any) => [s.id, Number(s.minutes) || 10]),
      );
      await ctx.runMutation(internal.backend.saveGeneratedTest, {
        sessionId: args.sessionId,
        assignmentId: args.assignmentId,
        payload,
        sectionDurations,
        contentLocale: args.contentLocale,
      });
      return { ok: true, test_type: session.test_type, demo_fixture: true };
    }

    const res = await geminiChatCompletion(apiKey(), {
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: blueprint.buildSystemPrompt({
            grade: caseRow.desired_entry_grade ?? "Secondary 1",
            curriculum: caseRow.desired_curriculum ?? caseRow.current_curriculum ?? "international",
            contentLocale: args.contentLocale as ContentLocale,
          }),
        },
        {
          role: "user",
          content:
            "Generate the complete test now. Return it via the build_test tool. Match section marks and structure exactly.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "build_test",
            description: "Return the complete generated test.",
            parameters: blueprint.toolSchema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "build_test" } },
    });
    if (!res.ok)
      throw new Error(
        res.status === 429
          ? "Rate limits exceeded, please try again in a moment."
          : "AI generation failed",
      );
    const json = await res.json();
    const toolArgs = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!toolArgs) throw new Error("AI did not return structured test");
    const payload = JSON.parse(toolArgs);
    const payloadWithMeta = {
      ...(payload as Record<string, unknown>),
      test_type: session.test_type,
      schema_version: 1,
    };
    const validationError = validatePayloadForTestType(payloadWithMeta, session.test_type);
    if (validationError) throw new Error(validationError);
    const sectionDurations = Object.fromEntries(
      (payload.sections ?? []).map((s: any) => [
        s.id,
        Number(s.minutes) || blueprint.sectionBlueprint.find((b) => b.id === s.id)?.minutes || 10,
      ]),
    );
    await ctx.runMutation(internal.backend.saveGeneratedTest, {
      sessionId: args.sessionId,
      assignmentId: args.assignmentId,
      payload: payloadWithMeta,
      sectionDurations,
      contentLocale: args.contentLocale,
    });
    return { ok: true, test_type: session.test_type };
  },
});

export const gradeTest = action({
  args: { sessionId: v.id("test_sessions") },
  handler: async (ctx, args): Promise<any> => {
    const userId = await requireUserId(ctx);
    try {
      await ctx.runMutation(internal.backend.submitSession, { sessionId: args.sessionId });
      const { session, responses } = await ctx.runQuery(internal.backend.gradingContext, {
        sessionId: args.sessionId,
        userId,
      });
      if (!session.test_payload) throw new Error("Test not generated yet");
      const payloadError = validatePayloadForTestType(session.test_payload, session.test_type);
      if (payloadError) throw new Error(payloadError);
      const answersByQ = new Map<string, AnswerRecord>();
      for (const r of responses ?? []) answersByQ.set(r.question_id, r.answer as AnswerRecord);
      const sections = (session.test_payload as { sections: any[] }).sections;

      if (session.test_type === "curriculum_fit") {
        const pathwayTotals = { ib: 0, a_level: 0, btec: 0 };
        const perQuestion: Record<string, { score: number; max: number; feedback: string }> = {};
        for (const section of sections) {
          for (const q of section.questions ?? []) {
            const val =
              answersByQ.get(q.id)?.value == null ? "" : String(answersByQ.get(q.id)?.value);
            if (q.type === "likert" || q.type === "mcq") {
              const ps = scoreCurriculumQuestion(q, val);
              pathwayTotals.ib += ps.ib;
              pathwayTotals.a_level += ps.a_level;
              pathwayTotals.btec += ps.btec;
              perQuestion[q.id] = {
                score: Number(q.marks),
                max: Number(q.marks),
                feedback: "Recorded.",
              };
            } else {
              perQuestion[q.id] = val
                ? { score: Number(q.marks), max: Number(q.marks), feedback: "Submitted." }
                : { score: 0, max: Number(q.marks), feedback: "Not answered." };
            }
          }
        }
        const result = buildCurriculumResult(pathwayTotals);
        const update = {
          status: "graded",
          graded_at: Date.now(),
          total_score: pathwayTotals[result.primary as keyof typeof pathwayTotals],
          total_max: pathwayTotals.ib + pathwayTotals.a_level + pathwayTotals.btec,
          section_scores: {
            summary: { per_question: perQuestion, diagnostics: { summary: result.narrative } },
          },
          result_summary: result,
          ai_feedback: result.narrative,
          grading_error: null,
        };
        await ctx.runMutation(internal.backend.saveGrading, { sessionId: args.sessionId, update });
        return { ok: true, result_summary: result };
      }

      if (session.test_type === "ielts_practice") {
        const { sectionScores, totalScore, totalMax, resultSummary, aiFeedback } =
          gradeHkdseSections(sections, answersByQ);
        await ctx.runMutation(internal.backend.saveGrading, {
          sessionId: args.sessionId,
          update: {
            status: "graded",
            graded_at: Date.now(),
            total_score: totalScore,
            total_max: totalMax,
            section_scores: sectionScores,
            result_summary: resultSummary,
            ai_feedback: aiFeedback,
            grading_error: null,
          },
        });
        return { ok: true, result_summary: resultSummary };
      }

      const examinerNote =
        session.content_locale === "zh-Hans"
          ? "You are an HK admissions examiner. Grade English sections in English; grade Section B and D feedback in Simplified Chinese when questions were in Chinese."
          : undefined;
      const { sectionScores, totalScore, totalMax } = await gradeStandardSections(
        apiKey(),
        sections,
        answersByQ,
        examinerNote,
      );
      let aiFeedback = "";
      const resultSummary: Record<string, unknown> | null = null;
      const res = await geminiChatCompletion(apiKey(), {
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              session.content_locale === "zh-Hans"
                ? "Write a concise aptitude test summary: 3 short paragraphs in Simplified Chinese."
                : "Write a concise parent-friendly aptitude test summary in 3 short paragraphs.",
          },
          {
            role: "user",
            content: JSON.stringify({
              total_score: totalScore,
              total_max: totalMax,
              sections: sectionScores,
            }),
          },
        ],
      });
      if (res.ok) aiFeedback = (await res.json()).choices?.[0]?.message?.content ?? "";
      await ctx.runMutation(internal.backend.saveGrading, {
        sessionId: args.sessionId,
        update: {
          status: "graded",
          graded_at: Date.now(),
          total_score: Number(totalScore.toFixed(2)),
          total_max: totalMax,
          section_scores: sectionScores,
          result_summary: resultSummary,
          ai_feedback: aiFeedback,
          grading_error: null,
        },
      });
      return { ok: true, total_score: totalScore, total_max: totalMax };
    } catch (e) {
      await ctx.runMutation(internal.backend.markSessionFailed, {
        sessionId: args.sessionId,
        error: e instanceof Error ? e.message : "Unknown grading error",
      });
      throw e;
    }
  },
});

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    spoken_english_level: { type: "string" },
    communication_confidence: { type: "string" },
    clarity_of_answers: { type: "string" },
    academic_self_awareness: { type: "string" },
    curriculum_understanding: { type: "string" },
    career_direction: { type: "string" },
    extracurricular_seriousness: { type: "string" },
    motivation_for_hk_schooling: { type: "string" },
    interview_readiness: { type: "string" },
    positive_qualities: { type: "array", items: { type: "string" } },
    red_flags: { type: "array", items: { type: "string" } },
    overall_impression: { type: "string" },
    detailed_observations: { type: "object", additionalProperties: { type: "string" } },
  },
  required: ["overall_impression", "detailed_observations"],
} as const;

export const analyzeInterview = action({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    try {
      const { interview, caseRow } = await ctx.runQuery(internal.backend.interviewContext, {
        interviewId: args.interviewId,
        userId,
      });
      if (!interview.transcript || interview.transcript.trim().length < 30)
        throw new Error("Transcript is empty or too short to analyze");
      const res = await geminiChatCompletion(apiKey(), {
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced Hong Kong secondary school admissions advisor. Analyse the transcript using the student profile. Always return the analyse_interview tool call.",
          },
          {
            role: "user",
            content: JSON.stringify({ student_profile: caseRow, transcript: interview.transcript }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyse_interview",
              description: "Structured admissions analysis.",
              parameters: ANALYSIS_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyse_interview" } },
      });
      if (!res.ok)
        throw new Error(`AI analysis failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const argsJson = (await res.json()).choices?.[0]?.message?.tool_calls?.[0]?.function
        ?.arguments;
      if (!argsJson) throw new Error("AI returned no analysis payload");
      const analysis = JSON.parse(argsJson);
      await ctx.runMutation(internal.backend.saveInterviewAnalysis, {
        interviewId: args.interviewId,
        analysis,
      });
      return { ok: true, analysis };
    } catch (e) {
      await ctx.runMutation(internal.backend.markInterviewFailed, {
        interviewId: args.interviewId,
        error: e instanceof Error ? e.message : "Unknown analysis error",
      });
      throw e;
    }
  },
});

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    cover: { type: "object", additionalProperties: true },
    examination_results: { type: "object", additionalProperties: true },
    written_expression_evaluation: { type: "object", additionalProperties: true },
    interview_performance: { type: "object", additionalProperties: true },
    overall_assessment_summary: { type: "object", additionalProperties: true },
    recommended_pathway: { type: "object", additionalProperties: true },
    school_recommendations: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    summary_table: { type: "array", items: { type: "object", additionalProperties: true } },
    disclaimer: { type: "string" },
  },
  required: [
    "cover",
    "examination_results",
    "written_expression_evaluation",
    "interview_performance",
    "overall_assessment_summary",
    "recommended_pathway",
    "school_recommendations",
    "summary_table",
    "disclaimer",
  ],
} as const;

export const generateReport = action({
  args: { caseId: v.id("student_cases") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reportId = (await ctx.runMutation(internal.backend.createReportDraft, {
      caseId: args.caseId,
    })) as Id<"reports">;
    try {
      const { caseRow, test, interview, schools } = await ctx.runQuery(
        internal.backend.reportContext,
        { caseId: args.caseId, userId },
      );
      if (!test || test.status !== "graded")
        throw new Error("Cannot generate report: test is not graded yet.");
      if (!interview || interview.status !== "analyzed" || !interview.ai_analysis)
        throw new Error("Cannot generate report: interview has not been analysed yet.");

      const sectionScores = (test.section_scores ?? {}) as Record<string, any>;
      const sectionRows = Object.entries(sectionScores).map(([code, s]: any) => ({
        code,
        area: s.title,
        score: Number(s.score) || 0,
        max: Number(s.max) || 0,
        percentage: pct(Number(s.score) || 0, Number(s.max) || 0),
      }));
      const totalScore = Number(test.total_score) || 0;
      const totalMax = Number(test.total_max) || 0;
      const totalPct = pct(totalScore, totalMax);
      const res = await geminiChatCompletion(apiKey(), {
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a senior Hong Kong secondary school admissions advisor writing a final advisory report. Recommend only from approved_schools. Copy factual scores exactly. Always return the build_report tool call.",
          },
          {
            role: "user",
            content: JSON.stringify({
              student_profile: caseRow,
              examination_results_data: {
                sections: sectionRows,
                total_score: totalScore,
                total_max: totalMax,
                total_percentage: totalPct,
                section_scores: sectionScores,
                ai_feedback: test.ai_feedback,
              },
              interview_analysis: interview.ai_analysis,
              approved_schools: schools,
              report_date: new Date().toISOString().slice(0, 10),
            }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_report",
              description: "Construct the full structured advisory report.",
              parameters: REPORT_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_report" } },
      });
      if (!res.ok)
        throw new Error(
          `AI report generation failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
        );
      const argsJson = (await res.json()).choices?.[0]?.message?.tool_calls?.[0]?.function
        ?.arguments;
      if (!argsJson) throw new Error("AI returned no report payload");
      const payload = JSON.parse(argsJson);
      payload.examination_results = {
        ...payload.examination_results,
        sections: sectionRows.map((r) => ({
          ...(payload.examination_results?.sections ?? []).find((x: any) => x.code === r.code),
          ...r,
        })),
        total_score: totalScore,
        total_max: totalMax,
        total_percentage: totalPct,
      };
      const allowedSlugs = new Set(schools.map((s: any) => s.slug));
      payload.school_recommendations = (payload.school_recommendations ?? []).filter((r: any) =>
        allowedSlugs.has(r.school_slug),
      );
      let payloadZh: unknown = null;
      let translationError: string | undefined;
      try {
        const translated = await geminiChatCompletion(apiKey(), {
          model: "gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Translate this report JSON to Simplified Chinese. Return only valid JSON. Preserve keys, numbers, slugs, labels, and array lengths.",
            },
            { role: "user", content: JSON.stringify(payload) },
          ],
        });
        if (translated.ok) {
          const content = (await translated.json()).choices?.[0]?.message?.content;
          if (content) payloadZh = JSON.parse(content);
        }
      } catch (e) {
        translationError = e instanceof Error ? e.message : "Translation failed";
      }
      await ctx.runMutation(internal.backend.saveReportPayload, {
        reportId,
        payload,
        payloadZh,
        translationError,
      });
      return { ok: true, report_id: reportId, payload };
    } catch (e) {
      await ctx.runMutation(internal.backend.markReportFailed, {
        reportId,
        error: e instanceof Error ? e.message : "Unknown report generation error",
      });
      throw e;
    }
  },
});
