import type { GenerateContext, SectionBlueprint, TestBlueprint } from "./types";
import { buildToolSchema } from "./shared_schema";
import { validatePayloadStrict } from "./validate_payload";

export const HK_SECTION_BLUEPRINT: SectionBlueprint[] = [
  { id: "A", title: "Verbal Reasoning", minutes: 10, marks: 12 },
  { id: "B", title: "Quantitative Reasoning", minutes: 10, marks: 12 },
  { id: "C", title: "Reading Comprehension", minutes: 12, marks: 16 },
  { id: "D", title: "Mathematics Achievement", minutes: 15, marks: 20 },
  { id: "E", title: "Written Expression", minutes: 13, marks: 10 },
];

const SECTION_IDS = HK_SECTION_BLUEPRINT.map((s) => s.id);

function localeRules(contentLocale: string) {
  if (contentLocale === "zh-Hans") {
    return `
LANGUAGE (critical):
- Sections B and D ONLY: write ALL prompts, options, rubrics, and model answers in Simplified Chinese (简体中文). Use consistent mathematical terminology. Keep HKD and metric units.
- Sections A, C, and E: British English only (reading and writing assessment).
- Section titles for B and D may be Chinese (e.g. 数量推理, 数学成就).`;
  }
  return "- All content in British English spellings, HKD where currency appears, and metric units.";
}

function buildSystemPrompt(ctx: GenerateContext) {
  const { grade, curriculum, contentLocale } = ctx;
  return `You are an expert assessment author for Hong Kong secondary school admissions. Generate a fresh aptitude test for a candidate seeking entry to ${grade || "Secondary 1"} (curriculum: ${curriculum || "international"}). The test must mirror this exact structure (do not change section IDs, titles, or marks):

Section A — Verbal Reasoning (10 min, 12 marks):
  - Part 1: Word Analogies — 4 MCQ × 1 mark
  - Part 2: Odd One Out — 3 short_text × 1 mark (each requires a brief reason)
  - Part 3: Sentence Completion — 3 MCQ × 1 mark
  - Part 4: Verbal Classification — 2 MCQ × 1 mark

Section B — Quantitative Reasoning (10 min, 12 marks):
  - Part 1: Number Sequences — 4 number × 1 mark
  - Part 2: Logical Reasoning — 3 short_text × 2 marks (require working)
  - Part 3: Number Relationships — 2 number × 1 mark

Section C — Reading Comprehension (12 min, 16 marks):
  - One original passage of 220–280 words on a fresh topic
  - 10 questions totalling 16 marks: mix of short_text questions (1 or 2 marks each)

Section D — Mathematics Achievement (15 min, 20 marks):
  - Part 1 Computation: 5 short_text × 1 mark
  - Part 2 Algebra: 3 short_text × 2 marks
  - Part 3 Geometry/Measurement: 2 short_text × 2 marks
  - Part 4 Word Problems: 2 short_text × 3 marks

Section E — Written Expression (13 min, 10 marks):
  - One essay question (10 marks) with two prompt choices: one narrative, one expository/argumentative.

${localeRules(contentLocale)}

Requirements:
- Question content must NOT reuse well-known sample items (e.g. Petal:Flower::Brick:?, Wood Wide Web passage, $240 jacket problem).
- For every MCQ, "answer" must be the 0-based index of the correct option as a string ("0".."3").
- For "number" questions, "answer" must be the exact numeric answer as a string.
- For "short_text" in A/B/C/D, include model "answer" and "rubric".
- For Section E essay: type="essay", marks=10, "essay_prompts" with both prompts, and "rubric".
- Question IDs: "A1", "A2", ... "E1".
- Total marks: A=12, B=12, C=16, D=20, E=10 (70 total).`;
}

function validatePayload(payload: { sections?: Array<{ id: string }> }) {
  return validatePayloadStrict(payload, "hk_aptitude", HK_SECTION_BLUEPRINT);
}

export const hkAptitudeBlueprint: TestBlueprint = {
  testType: "hk_aptitude",
  sectionBlueprint: HK_SECTION_BLUEPRINT,
  toolSchema: buildToolSchema(SECTION_IDS),
  buildSystemPrompt,
  validatePayload,
};
