import type { TestBlueprint, TestType } from "./types";
import { curriculumFitBlueprint } from "./curriculum_fit";
import { hkAptitudeBlueprint } from "./hk_aptitude";
import { ieltsPracticeBlueprint } from "./ielts_practice";
import { validatePayloadStrict } from "./validate_payload";

export type { ContentLocale, GenerateContext, TestBlueprint, TestType } from "./types";
export { hkAptitudeBlueprint, HK_SECTION_BLUEPRINT } from "./hk_aptitude";
export {
  buildHkdseEnglishDemoPayload,
  ieltsPracticeBlueprint,
  IELTS_SECTION_BLUEPRINT,
  percentageToBand,
} from "./ielts_practice";
export {
  curriculumFitBlueprint,
  CURRICULUM_SECTION_BLUEPRINT,
  scoreCurriculumQuestion,
  buildCurriculumResult,
} from "./curriculum_fit";
export { validatePayloadStrict, expectedSectionIds } from "./validate_payload";

const BLUEPRINTS: Record<TestType, TestBlueprint> = {
  hk_aptitude: hkAptitudeBlueprint,
  ielts_practice: ieltsPracticeBlueprint,
  curriculum_fit: curriculumFitBlueprint,
};

export function getBlueprint(testType: string): TestBlueprint {
  const bp = BLUEPRINTS[testType as TestType];
  if (!bp) throw new Error(`Unknown test_type: ${testType}`);
  return bp;
}

export function isKnownTestType(testType: string): testType is TestType {
  return (
    testType === "hk_aptitude" || testType === "ielts_practice" || testType === "curriculum_fit"
  );
}

export function validatePayloadForTestType(payload: unknown, testType: TestType): string | null {
  const bp = BLUEPRINTS[testType];
  if (!bp) return `Unknown test_type: ${testType}`;
  return validatePayloadStrict(payload, testType, bp.sectionBlueprint);
}
