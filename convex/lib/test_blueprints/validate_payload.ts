import type { SectionBlueprint, TestType } from "./types";

type BlueprintQuestion = {
  id?: unknown;
  prompt?: unknown;
  type?: unknown;
  marks?: unknown;
  options?: unknown;
  option_pathway_scores?: unknown;
  pathway_scores?: unknown;
  likert_labels?: unknown;
};

type BlueprintSection = {
  id?: unknown;
  title?: unknown;
  minutes?: unknown;
  marks?: unknown;
  passage?: unknown;
  listening_script?: unknown;
  questions?: unknown;
};

type BlueprintPayload = {
  test_type?: unknown;
  sections?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasNumericPathwayScores(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ["ib", "a_level", "btec"].every((k) => typeof value[k] === "number");
}

function hasLikertLabels(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = ["1", "2", "3", "4", "5"];
  return keys.every((k) => hasNumericPathwayScores(value[k]));
}

export function expectedSectionIds(sectionBlueprint: SectionBlueprint[]): string[] {
  return sectionBlueprint.map((s) => s.id);
}

export function validatePayloadStrict(
  payload: unknown,
  testType: TestType,
  sectionBlueprint: SectionBlueprint[],
): string | null {
  if (!isRecord(payload)) return "Payload must be an object";
  const parsed = payload as BlueprintPayload;

  if (parsed.test_type !== undefined && parsed.test_type !== testType) {
    return `Payload test_type mismatch: expected ${testType}`;
  }

  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return "Payload sections must be a non-empty array";
  }

  const sections = parsed.sections as BlueprintSection[];
  const expected = expectedSectionIds(sectionBlueprint);
  const ids = sections.map((s) => String(s.id ?? ""));
  const unknown = ids.filter((id) => !expected.includes(id));
  if (unknown.length > 0) {
    return `Unexpected sections: ${unknown.join(", ")}`;
  }

  const missing = expected.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    return `Missing sections: ${missing.join(", ")}`;
  }

  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) return `Duplicate section id: ${duplicate}`;

  for (const section of sections) {
    if (typeof section.id !== "string" || !section.id)
      return "Section id must be a non-empty string";
    if (!Array.isArray(section.questions) || section.questions.length === 0) {
      return `Section ${section.id} must have at least one question`;
    }

    const blueprint = sectionBlueprint.find((b) => b.id === section.id);
    if (!blueprint) return `Unknown section id: ${section.id}`;

    if (section.marks !== undefined && Number(section.marks) !== blueprint.marks) {
      return `Section ${section.id} marks mismatch`;
    }
    if (section.minutes !== undefined && Number(section.minutes) !== blueprint.minutes) {
      return `Section ${section.id} minutes mismatch`;
    }

    if (
      testType === "ielts_practice" &&
      section.id === "R" &&
      typeof section.passage !== "string"
    ) {
      return "HKDSE Reading section must include passage text";
    }
    if (
      testType === "ielts_practice" &&
      section.id === "L" &&
      typeof section.listening_script !== "string"
    ) {
      return "HKDSE Listening section must include listening_script";
    }

    for (const q of section.questions as BlueprintQuestion[]) {
      if (typeof q.id !== "string" || !q.id) return `Section ${section.id} has question without id`;
      if (typeof q.prompt !== "string" || !q.prompt) {
        return `Question ${String(q.id)} is missing prompt`;
      }
      if (typeof q.type !== "string" || !q.type) {
        return `Question ${String(q.id)} is missing type`;
      }
      if (typeof q.marks !== "number") return `Question ${String(q.id)} is missing numeric marks`;

      if (testType === "curriculum_fit") {
        if (q.type === "likert" && !hasLikertLabels(q.likert_labels)) {
          return `Curriculum likert question ${String(q.id)} is missing likert_labels 1..5`;
        }
        if (q.type === "mcq") {
          const options = Array.isArray(q.options) ? q.options : [];
          const optionScores = Array.isArray(q.option_pathway_scores)
            ? q.option_pathway_scores
            : [];
          if (optionScores.length > 0 && optionScores.length !== options.length) {
            return `Curriculum mcq question ${String(q.id)} option_pathway_scores length mismatch`;
          }
          const optionScoresValid =
            optionScores.length > 0 && optionScores.every((opt) => hasNumericPathwayScores(opt));
          const fallbackScoresValid = hasNumericPathwayScores(q.pathway_scores);
          if (!optionScoresValid && !fallbackScoresValid) {
            return `Curriculum mcq question ${String(q.id)} is missing pathway scoring`;
          }
        }
      }
    }
  }

  return null;
}
