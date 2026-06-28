export type TestType = "hk_aptitude" | "ielts_practice" | "curriculum_fit";
export type CaseStatus =
  | "profile_incomplete"
  | "profile_complete"
  | "test_in_progress"
  | "test_completed"
  | "interview_scheduled"
  | "interview_completed"
  | "transcript_ready"
  | "report_draft"
  | "report_published";

export type StudentCase = Record<string, unknown> & {
  id: string;
  status: CaseStatus;
  organization_id: string;
};

export type TestAssignment = Record<string, unknown> & {
  id: string;
  case_id: string;
  test_type: TestType;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  hkdse_papers?: ("R" | "W" | "L" | "S")[];
};

export type TestSession = Record<string, unknown> & {
  id: string;
  case_id: string;
  assignment_id?: string | null;
  test_type: TestType;
  status: "not_started" | "in_progress" | "submitted" | "graded" | "failed";
};

export type Invitation = Record<string, unknown> & {
  id: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export type Interview = Record<string, unknown> & { id: string; case_id: string };
export type ReportRow = Record<string, unknown> & {
  id: string;
  case_id: string;
  status: "draft" | "published";
};
