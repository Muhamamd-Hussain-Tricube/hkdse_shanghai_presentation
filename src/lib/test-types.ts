export const TEST_TYPES = ["hk_aptitude", "ielts_practice", "curriculum_fit"] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  hk_aptitude: "HK Admissions Aptitude Test",
  ielts_practice: "HKDSE English Practice Set",
  curriculum_fit: "Curriculum Pathway Fit (IB / A-Level / BTEC)",
};

/** Mirrors `test_catalog.gates_interview` — HK advisory track includes interview + report. */
export const GATES_INTERVIEW: Record<TestType, boolean> = {
  hk_aptitude: true,
  ielts_practice: false,
  curriculum_fit: false,
};

export function gatesInterview(testType: TestType): boolean {
  return GATES_INTERVIEW[testType] ?? false;
}

export function testResultsPath(testType: TestType, caseId: string): string {
  if (testType === "ielts_practice") return `/parent/${caseId}/results/hkdse`;
  if (testType === "curriculum_fit") return `/parent/${caseId}/results/curriculum`;
  return `/parent/${caseId}/hk`;
}
