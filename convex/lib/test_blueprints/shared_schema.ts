/** Shared question properties for Gemini tool schemas */
export const QUESTION_PROPERTIES = {
  id: { type: "string" },
  prompt: { type: "string" },
  marks: { type: "number" },
  type: {
    type: "string",
    enum: ["mcq", "short_text", "number", "essay", "likert"],
  },
  options: { type: "array", items: { type: "string" } },
  answer: { type: "string" },
  essay_prompts: { type: "array", items: { type: "string" } },
  rubric: { type: "string" },
  subskill: { type: "string" },
  pathway_scores: {
    type: "object",
    description: "For curriculum_fit mcq: fallback scores when option_pathway_scores absent",
    properties: {
      ib: { type: "number" },
      a_level: { type: "number" },
      btec: { type: "number" },
    },
  },
  option_pathway_scores: {
    type: "array",
    description:
      "For curriculum_fit mcq: one pathway_scores object per option, same order as options",
    items: {
      type: "object",
      properties: {
        ib: { type: "number" },
        a_level: { type: "number" },
        btec: { type: "number" },
      },
    },
  },
  likert_labels: {
    type: "object",
    description: "For likert 1-5: pathway_scores per value as keys 1..5",
    properties: {
      "1": {
        type: "object",
        properties: {
          ib: { type: "number" },
          a_level: { type: "number" },
          btec: { type: "number" },
        },
      },
      "2": {
        type: "object",
        properties: {
          ib: { type: "number" },
          a_level: { type: "number" },
          btec: { type: "number" },
        },
      },
      "3": {
        type: "object",
        properties: {
          ib: { type: "number" },
          a_level: { type: "number" },
          btec: { type: "number" },
        },
      },
      "4": {
        type: "object",
        properties: {
          ib: { type: "number" },
          a_level: { type: "number" },
          btec: { type: "number" },
        },
      },
      "5": {
        type: "object",
        properties: {
          ib: { type: "number" },
          a_level: { type: "number" },
          btec: { type: "number" },
        },
      },
    },
  },
} as const;

export function buildToolSchema(sectionIds: string[]) {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: sectionIds },
            title: { type: "string" },
            minutes: { type: "number" },
            marks: { type: "number" },
            passage: { type: "string" },
            listening_script: { type: "string" },
            audio_url: { type: "string" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: QUESTION_PROPERTIES,
                required: ["id", "prompt", "marks", "type"],
              },
            },
          },
          required: ["id", "title", "minutes", "marks", "questions"],
        },
      },
    },
    required: ["title", "sections"],
  };
}
