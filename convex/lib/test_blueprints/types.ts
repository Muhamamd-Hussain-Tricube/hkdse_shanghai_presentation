export type TestType = "hk_aptitude" | "ielts_practice" | "curriculum_fit";
export type ContentLocale = "en" | "zh-Hans";

export type SectionBlueprint = {
  id: string;
  title: string;
  minutes: number;
  marks: number;
};

export type GenerateContext = {
  grade: string;
  curriculum: string;
  contentLocale: ContentLocale;
};

export type TestBlueprint = {
  testType: TestType;
  sectionBlueprint: SectionBlueprint[];
  toolSchema: Record<string, unknown>;
  buildSystemPrompt: (ctx: GenerateContext) => string;
  validatePayload: (payload: {
    sections?: Array<{ id: string; marks?: number; questions?: unknown[] }>;
  }) => string | null;
};
