import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";

export type TestType = "hk_aptitude" | "ielts_practice" | "curriculum_fit";

export type LocalUser = {
  id: string;
  email: string;
  password: string;
  name?: string;
};

export type LocalOrganization = {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  logo_url: string | null;
  calendly_url: string | null;
  created_at: number;
  updated_at: number;
};

export type LocalOrgMember = {
  id: string;
  organization_id: string;
  user_id: string;
  is_owner: boolean;
  created_at: number;
};

export type LocalStudentCase = {
  id: string;
  organization_id: string;
  student_user_id?: string;
  invitation_id?: string;
  status: string;
  student_name: string | null;
  student_english_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  current_grade: string | null;
  current_school: string | null;
  current_country: string | null;
  current_city: string | null;
  hk_residency_status: string | null;
  passport_status: string | null;
  desired_entry_grade: string | null;
  desired_entry_year: string | null;
  current_academic_performance: string | null;
  transcript_url: string | null;
  strongest_subjects: string[];
  weakest_subjects: string[];
  english_level: string | null;
  chinese_level: string | null;
  current_curriculum: string | null;
  desired_curriculum: string | null;
  preferred_school_type: string | null;
  preferred_location: string | null;
  budget_range: string | null;
  commute_preference: string | null;
  school_shortlist: string[];
  extracurricular_activities: string | null;
  awards: string | null;
  career_interests: string | null;
  parent_goals: string | null;
  learning_support_needs: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  created_at: number;
  updated_at: number;
};

export type LocalInvitation = {
  id: string;
  organization_id: string;
  invited_by: string;
  parent_email: string;
  parent_name: string | null;
  student_name: string | null;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: number;
  accepted_at: number | null;
  accepted_by?: string;
  case_id?: string;
  notes: string | null;
  created_at: number;
};

export type LocalInvitationTest = {
  id: string;
  invitation_id: string;
  test_type: TestType;
  hkdse_papers?: HkdsePaperId[];
  assigned_at: number;
};

export type LocalAssignment = {
  id: string;
  case_id: string;
  test_type: TestType;
  invitation_id?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  sort_order: number;
  assigned_by?: string;
  assigned_at: number;
  session_id?: string;
  hkdse_papers?: HkdsePaperId[];
  created_at: number;
  updated_at: number;
};

export type LocalTestSession = {
  id: string;
  case_id: string;
  organization_id: string;
  status: "not_started" | "in_progress" | "submitted" | "graded" | "failed";
  test_type: TestType;
  assignment_id?: string;
  content_locale: "en" | "zh-Hans";
  test_payload?: Record<string, unknown>;
  section_durations?: Record<string, number>;
  started_at: number | null;
  submitted_at: number | null;
  graded_at: number | null;
  total_score: number | null;
  total_max: number | null;
  section_scores?: Record<string, unknown>;
  result_summary?: Record<string, unknown>;
  ai_feedback: string | null;
  grading_error: string | null;
  created_at: number;
  updated_at: number;
};

export type LocalTestResponse = {
  id: string;
  session_id: string;
  section_id: string;
  question_id: string;
  answer: unknown;
  updated_at: number;
};

export type LocalInterview = {
  id: string;
  case_id: string;
  organization_id: string;
  status: string;
  transcript: string | null;
  created_at: number;
  updated_at: number;
};

export type LocalReport = {
  id: string;
  case_id: string;
  organization_id: string;
  version: number;
  status: "draft" | "published";
  payload: Record<string, unknown>;
  created_at: number;
  updated_at: number;
};

export type LocalStoreData = {
  users: LocalUser[];
  organizations: LocalOrganization[];
  members: LocalOrgMember[];
  cases: LocalStudentCase[];
  invitations: LocalInvitation[];
  invitationTests: LocalInvitationTest[];
  assignments: LocalAssignment[];
  sessions: LocalTestSession[];
  responses: LocalTestResponse[];
  interviews: LocalInterview[];
  reports: LocalReport[];
  authSessionUserId: string | null;
  seeded: boolean;
};

export const DEMO_IDS = {
  org: "org_demo_school",
  teacher: "user_teacher",
  goodUser: "user_good",
  badUser: "user_bad",
  caseGood: "case_good",
  caseBad: "case_bad",
  assignGood: "assign_good",
  assignBad: "assign_bad",
  sessionGood: "session_good",
  classId: "class_form5",
  roundId: "round_initial",
} as const;

export const DEMO_PASSWORD = "DemoPass123!";
