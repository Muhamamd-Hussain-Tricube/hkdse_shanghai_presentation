import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const hkdsePaperId = v.union(v.literal("R"), v.literal("W"), v.literal("L"), v.literal("S"));
const nullableString = v.optional(v.union(v.string(), v.null()));
const nullableNumber = v.optional(v.union(v.number(), v.null()));
const stringArray = v.optional(v.array(v.string()));
const json = v.any();

export default defineSchema({
  ...authTables,

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    primary_color: nullableString,
    logo_url: nullableString,
    calendly_url: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_slug", ["slug"]),

  organization_members: defineTable({
    organization_id: v.id("organizations"),
    user_id: v.id("users"),
    is_owner: v.boolean(),
    created_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_org", ["organization_id"])
    .index("by_org_user", ["organization_id", "user_id"]),

  user_roles: defineTable({
    user_id: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("org_admin"),
      v.literal("parent"),
      v.literal("student"),
    ),
    organization_id: v.optional(v.id("organizations")),
    created_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_role", ["user_id", "role"]),

  invitations: defineTable({
    organization_id: v.id("organizations"),
    invited_by: v.id("users"),
    parent_email: v.string(),
    parent_name: nullableString,
    student_name: nullableString,
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    expires_at: v.number(),
    accepted_at: nullableNumber,
    accepted_by: v.optional(v.id("users")),
    case_id: v.optional(v.id("student_cases")),
    notes: nullableString,
    created_at: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_org", ["organization_id"]),

  student_cases: defineTable({
    organization_id: v.id("organizations"),
    student_user_id: v.optional(v.id("users")),
    invitation_id: v.optional(v.id("invitations")),
    status: v.union(
      v.literal("profile_incomplete"),
      v.literal("profile_complete"),
      v.literal("test_in_progress"),
      v.literal("test_completed"),
      v.literal("interview_scheduled"),
      v.literal("interview_completed"),
      v.literal("transcript_ready"),
      v.literal("report_draft"),
      v.literal("report_published"),
    ),
    student_name: nullableString,
    student_english_name: nullableString,
    date_of_birth: nullableString,
    gender: nullableString,
    current_grade: nullableString,
    current_school: nullableString,
    current_country: nullableString,
    current_city: nullableString,
    hk_residency_status: nullableString,
    passport_status: nullableString,
    desired_entry_grade: nullableString,
    desired_entry_year: nullableString,
    current_academic_performance: nullableString,
    transcript_url: nullableString,
    strongest_subjects: stringArray,
    weakest_subjects: stringArray,
    english_level: nullableString,
    chinese_level: nullableString,
    current_curriculum: nullableString,
    desired_curriculum: nullableString,
    preferred_school_type: nullableString,
    preferred_location: nullableString,
    budget_range: nullableString,
    commute_preference: nullableString,
    school_shortlist: stringArray,
    extracurricular_activities: nullableString,
    awards: nullableString,
    career_interests: nullableString,
    parent_goals: nullableString,
    learning_support_needs: nullableString,
    parent_name: nullableString,
    parent_email: nullableString,
    parent_phone: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_org", ["organization_id"])
    .index("by_student", ["student_user_id"])
    .index("by_invitation", ["invitation_id"]),

  schools: defineTable({
    slug: v.string(),
    name: v.string(),
    short_name: nullableString,
    curriculum: v.string(),
    location: v.string(),
    selectivity: v.string(),
    key_fit_notes: v.string(),
    caveats: nullableString,
    fee_notes: nullableString,
    application_notes: nullableString,
    requires_chinese: v.boolean(),
    pr_quota_notes: nullableString,
    has_eal_support: v.boolean(),
    display_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_display_order", ["display_order"]),

  interviews: defineTable({
    case_id: v.id("student_cases"),
    organization_id: v.id("organizations"),
    status: v.string(),
    provider: nullableString,
    scheduled_at: nullableNumber,
    duration_minutes: nullableNumber,
    meeting_url: nullableString,
    external_event_id: nullableString,
    transcript: nullableString,
    transcript_source: nullableString,
    transcript_uploaded_at: nullableNumber,
    uploaded_by: v.optional(v.id("users")),
    ai_analysis: v.optional(json),
    analyzed_at: nullableNumber,
    analysis_error: nullableString,
    notes: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_case", ["case_id"])
    .index("by_org", ["organization_id"]),

  reports: defineTable({
    case_id: v.id("student_cases"),
    organization_id: v.id("organizations"),
    version: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    payload: json,
    payload_zh: v.optional(json),
    generation_error: nullableString,
    translation_error: nullableString,
    pdf_url: nullableString,
    generated_by: v.optional(v.id("users")),
    published_by: v.optional(v.id("users")),
    published_at: nullableNumber,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_case", ["case_id"])
    .index("by_case_status", ["case_id", "status"])
    .index("by_org", ["organization_id"]),

  test_catalog: defineTable({
    test_type: v.union(
      v.literal("hk_aptitude"),
      v.literal("ielts_practice"),
      v.literal("curriculum_fit"),
    ),
    display_name: v.string(),
    gates_interview: v.boolean(),
    sort_order: v.number(),
    created_at: v.number(),
  })
    .index("by_test_type", ["test_type"])
    .index("by_sort_order", ["sort_order"]),

  case_test_assignments: defineTable({
    case_id: v.id("student_cases"),
    test_type: v.union(
      v.literal("hk_aptitude"),
      v.literal("ielts_practice"),
      v.literal("curriculum_fit"),
    ),
    invitation_id: v.optional(v.id("invitations")),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    sort_order: v.number(),
    assigned_by: v.optional(v.id("users")),
    assigned_at: v.number(),
    session_id: v.optional(v.id("test_sessions")),
    hkdse_papers: v.optional(v.array(hkdsePaperId)),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_case", ["case_id"])
    .index("by_case_test_type", ["case_id", "test_type"])
    .index("by_invitation", ["invitation_id"])
    .index("by_session", ["session_id"]),

  invitation_test_assignments: defineTable({
    invitation_id: v.id("invitations"),
    test_type: v.union(
      v.literal("hk_aptitude"),
      v.literal("ielts_practice"),
      v.literal("curriculum_fit"),
    ),
    hkdse_papers: v.optional(v.array(hkdsePaperId)),
    assigned_at: v.number(),
  }).index("by_invitation", ["invitation_id"]),

  test_sessions: defineTable({
    case_id: v.id("student_cases"),
    organization_id: v.id("organizations"),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("graded"),
      v.literal("failed"),
    ),
    test_type: v.union(
      v.literal("hk_aptitude"),
      v.literal("ielts_practice"),
      v.literal("curriculum_fit"),
    ),
    assignment_id: v.optional(v.id("case_test_assignments")),
    content_locale: v.union(v.literal("en"), v.literal("zh-Hans")),
    test_payload: v.optional(json),
    section_durations: v.optional(json),
    started_at: nullableNumber,
    submitted_at: nullableNumber,
    graded_at: nullableNumber,
    total_score: nullableNumber,
    total_max: nullableNumber,
    section_scores: v.optional(json),
    result_summary: v.optional(json),
    ai_feedback: nullableString,
    grading_error: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_case", ["case_id"])
    .index("by_case_test_type", ["case_id", "test_type"])
    .index("by_assignment", ["assignment_id"])
    .index("by_org", ["organization_id"])
    .index("by_test_type", ["test_type"]),

  test_responses: defineTable({
    session_id: v.id("test_sessions"),
    section_id: v.string(),
    question_id: v.string(),
    answer: json,
    updated_at: v.number(),
  })
    .index("by_session", ["session_id"])
    .index("by_session_question", ["session_id", "question_id"]),

  classes: defineTable({
    organization_id: v.id("organizations"),
    name: v.string(),
    grade_label: nullableString,
    status: v.union(v.literal("active"), v.literal("archived")),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_org", ["organization_id"]),

  class_rounds: defineTable({
    class_id: v.id("classes"),
    round_number: v.number(),
    label: v.string(),
    status: v.union(v.literal("dispatching"), v.literal("active"), v.literal("completed")),
    papers_default: v.optional(v.array(hkdsePaperId)),
    created_at: v.number(),
  }).index("by_class", ["class_id"]),

  class_enrollments: defineTable({
    class_id: v.id("classes"),
    round_id: v.id("class_rounds"),
    student_name: v.string(),
    email: v.string(),
    grade: nullableString,
    hkdse_papers: v.optional(v.array(hkdsePaperId)),
    targeted_paper: v.optional(hkdsePaperId),
    attempts: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed")),
    invite_token: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_class_round", ["class_id", "round_id"])
    .index("by_round", ["round_id"]),

  class_sim_sessions: defineTable({
    enrollment_id: v.id("class_enrollments"),
    round_id: v.id("class_rounds"),
    class_id: v.id("classes"),
    total_score: v.number(),
    total_max: v.number(),
    component_scores: json,
    bands: json,
    overall_band: nullableString,
    graded_at: v.number(),
    created_at: v.number(),
  })
    .index("by_enrollment", ["enrollment_id"])
    .index("by_round", ["round_id"])
    .index("by_class", ["class_id"]),

  class_stat_snapshots: defineTable({
    class_id: v.id("classes"),
    round_id: v.id("class_rounds"),
    snapshot_at: v.number(),
    stats: json,
  })
    .index("by_class", ["class_id"])
    .index("by_round", ["round_id"]),

  class_demo_jobs: defineTable({
    class_id: v.id("classes"),
    round_id: v.id("class_rounds"),
    type: v.literal("remind_simulation"),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    target_pct: v.optional(v.number()),
    started_at: v.number(),
    completed_at: nullableNumber,
  }).index("by_round", ["round_id"]),
});
