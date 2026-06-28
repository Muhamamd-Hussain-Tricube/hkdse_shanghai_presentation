import type {
  StudentCase as Case,
  TestAssignment as Assignment,
  TestSession as Session,
} from "@/lib/backend-types";
import { gatesInterview, type TestType } from "@/lib/test-types";

export type StudentAssignmentDisplayStatus = "pending" | "in_progress" | "grading" | "completed";

export function sessionForAssignment(assignment: Assignment, sessions: Session[]): Session | null {
  return (
    sessions.find(
      (s) => s.assignment_id === assignment.id && s.test_type === assignment.test_type,
    ) ??
    sessions.find((s) => s.test_type === assignment.test_type) ??
    null
  );
}

/** Student-facing status: prefer session state when assignment row is stale. */
export function getStudentAssignmentDisplayStatus(
  assignment: Assignment,
  session: Session | null | undefined,
): StudentAssignmentDisplayStatus {
  if (assignment.status === "completed") return "completed";
  if (session?.status === "graded") return "completed";
  if (session?.status === "submitted") return "grading";
  if (session?.status === "in_progress" || assignment.status === "in_progress") {
    return "in_progress";
  }
  if (session?.status === "not_started" && session) return "in_progress";
  return "pending";
}

export type PipelineStep = { label: string; active: boolean; done: boolean };

export function hasRequiredProfileFields(
  data: Pick<Case, "student_name" | "date_of_birth" | "current_grade" | "desired_entry_grade">,
): boolean {
  return !!(
    data.student_name &&
    data.date_of_birth &&
    data.current_grade &&
    data.desired_entry_grade
  );
}

export function getAssignmentProgressLabel(
  assignment: Assignment,
  session: Session | null | undefined,
): string {
  if (assignment.status === "completed") return "completed";
  if (session?.status === "graded" || session?.status === "submitted") return "submitted";
  if (session?.status === "in_progress" || assignment.status === "in_progress")
    return "in_progress";
  if (session?.status === "not_started" && session) return "prepared";
  return "pending";
}

export function getCaseDisplayStatus(
  caseRow: Case,
  assignments: Assignment[],
  sessions: Session[],
): string {
  const active = assignments.filter((a) => a.status !== "cancelled");
  const hasHk = active.some((a) => a.test_type === "hk_aptitude");
  if (hasHk) {
    return caseRow.status.replace(/_/g, " ");
  }
  const done = active.filter((a) => a.status === "completed").length;
  if (active.length === 0) return "active";
  if (done === active.length) return `${done}/${active.length} tests complete`;
  return `${done}/${active.length} tests complete`;
}

export function hkPipelineSteps(
  caseRow: Case,
  hkAssignment: Assignment | undefined,
  hkSession: Session | null | undefined,
  t: (key: string) => string,
): PipelineStep[] {
  const profileDone = hasRequiredProfileFields(caseRow);
  const testDone =
    hkAssignment?.status === "completed" ||
    hkSession?.status === "graded" ||
    hkSession?.status === "submitted";
  const interviewDone = [
    "interview_scheduled",
    "interview_completed",
    "transcript_ready",
    "report_draft",
    "report_published",
  ].includes(caseRow.status);
  const reportDone = caseRow.status === "report_published";
  const reportActive = caseRow.status === "report_draft";

  return [
    { label: t("student.hk.pipelineProfile"), active: !profileDone, done: profileDone },
    {
      label: t("student.hk.pipelineTest"),
      active: profileDone && !testDone,
      done: testDone,
    },
    {
      label: t("student.hk.pipelineInterview"),
      active: testDone && caseRow.status === "test_completed",
      done: interviewDone,
    },
    {
      label: t("student.hk.pipelineReport"),
      active: reportActive,
      done: reportDone,
    },
  ];
}

export function assignmentNeedsHkHub(testType: TestType): boolean {
  return gatesInterview(testType);
}
