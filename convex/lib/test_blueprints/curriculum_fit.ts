import type { GenerateContext, SectionBlueprint, TestBlueprint } from "./types";
import { buildToolSchema } from "./shared_schema";
import { validatePayloadStrict } from "./validate_payload";

export const CURRICULUM_SECTION_BLUEPRINT: SectionBlueprint[] = [
  { id: "S1", title: "Learning style & preferences", minutes: 15, marks: 30 },
  { id: "S2", title: "Academic habits & goals", minutes: 15, marks: 20 },
  { id: "S3", title: "Reflection", minutes: 10, marks: 10 },
];

const SECTION_IDS = CURRICULUM_SECTION_BLUEPRINT.map((s) => s.id);

function localeRules(contentLocale: string) {
  if (contentLocale === "zh-Hans") {
    return `
LANGUAGE: Write all prompts and options in Simplified Chinese. Keep proper nouns IB, A-Level, Pearson BTEC in English with Chinese gloss on first mention (e.g. IB（国际文凭）).`;
  }
  return "Write all content in clear British English.";
}

function buildSystemPrompt(ctx: GenerateContext) {
  const { grade, curriculum, contentLocale } = ctx;
  return `You are an expert UK/international schools advisor. Generate a curriculum pathway fit questionnaire for a student (${grade}, current/desired: ${curriculum}) choosing between IB, A-Level, and Pearson BTEC.

${localeRules(contentLocale)}

Section S1 (15 min, 30 marks) — ~18 items:
  - Mix of type="likert" (1–5 agreement) and type="mcq" (4 options).
  - Each likert MUST include "likert_labels" with pathway_scores for values "1" through "5" (objects with ib, a_level, btec numbers summing to meaningful differentiation).
  - Each mcq MUST include "pathway_scores" on the question for the correct scoring: store scores for EACH option as separate - use mcq with options array and for each option index provide scoring via pathway_scores on question keyed by answer index OR use 4 mcq options with answer as index and include array "option_scores" - simpler: use type mcq with "answer" as index and add field "all_option_scores" as array of 3 pathway objects.

  Simpler approach for mcq: add optional array "scores_per_option" in prompt instructions as JSON array aligned to options.

For each mcq question include in the JSON:
  "option_pathway_scores": [ {"ib":n,"a_level":n,"btec":n}, ... ] one per option (length = options.length).

For each likert include "likert_labels" with keys "1"-"5".

Section S2 (15 min, 20 marks) — ~12 situational mcq/likert with same scoring fields.

Section S3 (10 min, 10 marks) — 1 optional type="short_text" reflective question (marks=10, rubric only; scored separately by AI for narrative not pathway).

Question IDs: S1_1..S1_18, S2_1..S2_12, S3_1.
Do not change section IDs S1, S2, S3.`;
}

function validatePayload(payload: { sections?: Array<{ id: string }> }) {
  return validatePayloadStrict(payload, "curriculum_fit", CURRICULUM_SECTION_BLUEPRINT);
}

export type PathwayScores = { ib: number; a_level: number; btec: number };

export function scoreCurriculumQuestion(
  q: Record<string, unknown>,
  answerValue: string,
): PathwayScores {
  const zero = { ib: 0, a_level: 0, btec: 0 };
  if (!answerValue) return zero;

  if (q.type === "likert" && q.likert_labels) {
    const labels = q.likert_labels as Record<string, PathwayScores>;
    const v = labels[answerValue.trim()];
    return v ? { ...v } : zero;
  }

  if (q.type === "mcq") {
    const opts = q.option_pathway_scores as PathwayScores[] | undefined;
    if (opts && opts.length > 0) {
      const idx = parseInt(answerValue, 10);
      if (!Number.isNaN(idx) && opts[idx]) return { ...opts[idx] };
    }
    if (q.pathway_scores) {
      const ps = q.pathway_scores as PathwayScores;
      return { ib: ps.ib ?? 0, a_level: ps.a_level ?? 0, btec: ps.btec ?? 0 };
    }
  }

  return zero;
}

export function buildCurriculumResult(totals: PathwayScores): {
  primary: "ib" | "a_level" | "btec";
  secondary: "ib" | "a_level" | "btec" | null;
  confidence: number;
  dimension_scores: PathwayScores;
  narrative: string;
} {
  const entries: Array<["ib" | "a_level" | "btec", number]> = [
    ["ib", totals.ib],
    ["a_level", totals.a_level],
    ["btec", totals.btec],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][1];
  const second = entries[1][1];
  const sum = totals.ib + totals.a_level + totals.btec || 1;
  const confidence = Math.min(0.95, Math.max(0.4, (top - second) / sum + 0.35));

  const labels = { ib: "IB Diploma", a_level: "A-Levels", btec: "Pearson BTEC" };
  return {
    primary: entries[0][0],
    secondary: top === second ? null : entries[1][0],
    confidence: Math.round(confidence * 100) / 100,
    dimension_scores: totals,
    narrative: `Based on your responses, ${labels[entries[0][0]]} appears to be the strongest fit${
      entries[1][1] > 0 ? `, with ${labels[entries[1][0]]} as a secondary match` : ""
    }.`,
  };
}

export const curriculumFitBlueprint: TestBlueprint = {
  testType: "curriculum_fit",
  sectionBlueprint: CURRICULUM_SECTION_BLUEPRINT,
  toolSchema: buildToolSchema(SECTION_IDS),
  buildSystemPrompt,
  validatePayload,
};
