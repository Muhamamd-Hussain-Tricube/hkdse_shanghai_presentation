export type AnswerRecord = { value: unknown; type?: string };

export function normalizeNumber(s: string) {
  return s.replace(/[\s,]/g, "").replace(/[$£€]/g, "").trim();
}

export function gradeObjective(
  q: { type: string; answer?: string; marks: number },
  given: AnswerRecord | undefined,
): { score: number; correct: boolean | null } {
  if (!given || given.value === undefined || given.value === null || given.value === "") {
    return { score: 0, correct: false };
  }
  if (q.type === "mcq" || q.type === "likert") {
    const expected = String(q.answer ?? "").trim();
    const actual = String(given.value).trim();
    const match = q.type === "likert" ? actual === expected : expected === actual;
    if (q.type === "likert") {
      return { score: match ? Number(q.marks) : Number(q.marks) * 0.5, correct: match };
    }
    return { score: expected === actual ? Number(q.marks) : 0, correct: expected === actual };
  }
  if (q.type === "number") {
    const expected = normalizeNumber(String(q.answer ?? ""));
    const actual = normalizeNumber(String(given.value));
    const numEq = Number(expected) === Number(actual) && expected !== "" && actual !== "";
    return {
      score: expected === actual || numEq ? Number(q.marks) : 0,
      correct: expected === actual || numEq,
    };
  }
  return { score: 0, correct: null };
}

export const GRADE_TOOL_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          score: { type: "number" },
          max: { type: "number" },
          feedback: { type: "string" },
          subskill: { type: "string" },
        },
        required: ["question_id", "score", "max", "feedback"],
      },
    },
    section_diagnostics: {
      type: "object",
      properties: {
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: ["strengths", "weaknesses", "summary"],
    },
  },
  required: ["items", "section_diagnostics"],
} as const;
