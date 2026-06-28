/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const TEST_TYPES = ["hk_aptitude", "ielts_practice", "curriculum_fit"] as const;
const testType = v.union(
  v.literal("hk_aptitude"),
  v.literal("ielts_practice"),
  v.literal("curriculum_fit"),
);
const now = () => Date.now();
const inThirtyDays = () => now() + 30 * 24 * 60 * 60 * 1000;

function publicRow<T extends { _id: Id<any> }>(row: T) {
  return { ...row, id: row._id };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function requireUser(ctx: any): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

async function requireOrgMember(
  ctx: any,
  organizationId: Id<"organizations">,
  userId?: Id<"users">,
) {
  const uid = userId ?? (await requireUser(ctx))._id;
  const membership = await ctx.db
    .query("organization_members")
    .withIndex("by_org_user", (q: any) =>
      q.eq("organization_id", organizationId).eq("user_id", uid),
    )
    .unique();
  if (!membership) throw new Error("You do not have access to this organization");
  return membership;
}

async function requireCaseAccess(ctx: any, caseId: Id<"student_cases">) {
  const user = await requireUser(ctx);
  const caseRow = await ctx.db.get(caseId);
  if (!caseRow) throw new Error("Case not found");
  if (caseRow.student_user_id === user._id) return { user, caseRow, role: "student" as const };
  const membership = await ctx.db
    .query("organization_members")
    .withIndex("by_org_user", (q: any) =>
      q.eq("organization_id", caseRow.organization_id).eq("user_id", user._id),
    )
    .unique();
  if (!membership) throw new Error("You do not have access to this case");
  return { user, caseRow, role: "advisor" as const };
}

async function requireAdvisorForCase(ctx: any, caseId: Id<"student_cases">) {
  const { user, caseRow, role } = await requireCaseAccess(ctx, caseId);
  if (role !== "advisor") throw new Error("Advisor access required");
  return { user, caseRow };
}

async function requireStudentCaseOwner(ctx: any, caseId: Id<"student_cases">) {
  const { user, caseRow } = await requireCaseAccess(ctx, caseId);
  if (caseRow.student_user_id !== user._id) throw new Error("Student access required");
  return { user, caseRow };
}

async function upsertRole(
  ctx: any,
  userId: Id<"users">,
  role: "student" | "org_admin",
  organizationId?: Id<"organizations">,
) {
  const existing = await ctx.db
    .query("user_roles")
    .withIndex("by_user_role", (q: any) => q.eq("user_id", userId).eq("role", role))
    .first();
  if (!existing) {
    await ctx.db.insert("user_roles", {
      user_id: userId,
      role,
      organization_id: organizationId,
      created_at: now(),
    });
  }
}

async function linkedSessionForAssignment(ctx: any, assignment: Doc<"case_test_assignments">) {
  if (assignment.session_id) {
    const session = await ctx.db.get(assignment.session_id);
    if (
      session &&
      session.case_id === assignment.case_id &&
      session.test_type === assignment.test_type
    ) {
      return session;
    }
  }
  return await ctx.db
    .query("test_sessions")
    .withIndex("by_case_test_type", (q: any) =>
      q.eq("case_id", assignment.case_id).eq("test_type", assignment.test_type),
    )
    .unique();
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const memberships = await ctx.db
      .query("organization_members")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    const organizations = await Promise.all(
      memberships.map(async (m) => {
        const organization = await ctx.db.get(m.organization_id);
        return organization ? { ...publicRow(m), organization: publicRow(organization) } : null;
      }),
    );
    const roles = await ctx.db
      .query("user_roles")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    return {
      user: publicRow(user),
      roles: roles.map(publicRow),
      organizations: organizations.filter(Boolean),
    };
  },
});

export const postLoginDestination = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const memberships = await ctx.db
      .query("organization_members")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
    if (memberships.length > 0) return { kind: "dashboard" as const };
    const cases = await ctx.db
      .query("student_cases")
      .withIndex("by_student", (q) => q.eq("student_user_id", user._id))
      .order("desc")
      .collect();
    if (cases[0]) return { kind: "student" as const, caseId: cases[0]._id };
    return { kind: "none" as const };
  },
});

export const createOrganizationWithOwner = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("organization_members")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .first();
    if (existing) return existing.organization_id;
    const t = now();
    const slug = `${slugify(args.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      slug,
      primary_color: null,
      logo_url: null,
      calendly_url: null,
      created_at: t,
      updated_at: t,
    });
    await ctx.db.insert("organization_members", {
      organization_id: organizationId,
      user_id: user._id,
      is_owner: true,
      created_at: t,
    });
    await upsertRole(ctx, user._id, "org_admin", organizationId);
    return organizationId;
  },
});

export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    calendly_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);
    await ctx.db.patch(args.organizationId, {
      name: args.name.trim(),
      calendly_url: args.calendly_url?.trim() || null,
      updated_at: now(),
    });
  },
});

export const dashboardCases = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);
    const rows = await ctx.db
      .query("student_cases")
      .withIndex("by_org", (q) => q.eq("organization_id", args.organizationId))
      .order("desc")
      .collect();
    return rows.map(publicRow);
  },
});

export const createInvitation = mutation({
  args: {
    organizationId: v.id("organizations"),
    parent_email: v.string(),
    parent_name: v.optional(v.string()),
    student_name: v.optional(v.string()),
    notes: v.optional(v.string()),
    testTypes: v.array(testType),
    hkdsePapers: v.optional(
      v.array(v.union(v.literal("R"), v.literal("W"), v.literal("L"), v.literal("S"))),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOrgMember(ctx, args.organizationId, user._id);
    if (args.testTypes.length === 0) throw new Error("Select at least one test");
    const t = now();
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const invitationId = await ctx.db.insert("invitations", {
      organization_id: args.organizationId,
      invited_by: user._id,
      parent_email: args.parent_email.trim().toLowerCase(),
      parent_name: args.parent_name?.trim() || null,
      student_name: args.student_name?.trim() || null,
      token,
      status: "pending",
      expires_at: inThirtyDays(),
      accepted_at: null,
      notes: args.notes?.trim() || null,
      created_at: t,
    });
    for (const tt of [...new Set(args.testTypes)]) {
      await ctx.db.insert("invitation_test_assignments", {
        invitation_id: invitationId,
        test_type: tt,
        hkdse_papers:
          tt === "ielts_practice" && args.hkdsePapers && args.hkdsePapers.length > 0
            ? args.hkdsePapers
            : undefined,
        assigned_at: t,
      });
    }
    return { invitationId, token };
  },
});

export const invitationsForOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_org", (q) => q.eq("organization_id", args.organizationId))
      .order("desc")
      .collect();
    const testsById: Record<string, string[]> = {};
    for (const inv of invitations) {
      const tests = await ctx.db
        .query("invitation_test_assignments")
        .withIndex("by_invitation", (q) => q.eq("invitation_id", inv._id))
        .collect();
      testsById[inv._id] = tests.map((t) => t.test_type);
    }
    return { invitations: invitations.map(publicRow), testsById };
  },
});

export const invitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!inv) return null;
    const org = await ctx.db.get(inv.organization_id);
    const tests = await ctx.db
      .query("invitation_test_assignments")
      .withIndex("by_invitation", (q) => q.eq("invitation_id", inv._id))
      .collect();
    return {
      invite: publicRow(inv),
      organization: org ? publicRow(org) : null,
      tests: tests.map(publicRow),
    };
  },
});

export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    student_name: v.string(),
    date_of_birth: v.string(),
    current_grade: v.string(),
    desired_entry_grade: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!inv) throw new Error("This invitation link is invalid.");
    if (inv.status === "revoked") throw new Error("This invitation has been revoked.");
    if (inv.expires_at < now())
      throw new Error("This invitation has expired. Please request a new link.");
    if (inv.status === "accepted") {
      if (inv.accepted_by === user._id && inv.case_id) return inv.case_id;
      throw new Error("This invitation has already been accepted.");
    }
    if ((user.email ?? "").toLowerCase() !== inv.parent_email.toLowerCase()) {
      throw new Error("Please sign in with the email address this invitation was sent to.");
    }
    const t = now();
    await upsertRole(ctx, user._id, "student");
    const caseId = await ctx.db.insert("student_cases", {
      organization_id: inv.organization_id,
      student_user_id: user._id,
      invitation_id: inv._id,
      status: "profile_complete",
      student_name: args.student_name.trim(),
      student_english_name: null,
      date_of_birth: args.date_of_birth,
      gender: null,
      current_grade: args.current_grade.trim(),
      current_school: null,
      current_country: null,
      current_city: null,
      hk_residency_status: null,
      passport_status: null,
      desired_entry_grade: args.desired_entry_grade.trim(),
      desired_entry_year: null,
      current_academic_performance: null,
      transcript_url: null,
      strongest_subjects: [],
      weakest_subjects: [],
      english_level: null,
      chinese_level: null,
      current_curriculum: null,
      desired_curriculum: null,
      preferred_school_type: null,
      preferred_location: null,
      budget_range: null,
      commute_preference: null,
      school_shortlist: [],
      extracurricular_activities: null,
      awards: null,
      career_interests: null,
      parent_goals: null,
      learning_support_needs: null,
      parent_name: inv.parent_name,
      parent_email: inv.parent_email,
      parent_phone: null,
      created_at: t,
      updated_at: t,
    });
    const tests = await ctx.db
      .query("invitation_test_assignments")
      .withIndex("by_invitation", (q) => q.eq("invitation_id", inv._id))
      .collect();
    for (const [i, test] of tests.entries()) {
      await ctx.db.insert("case_test_assignments", {
        case_id: caseId,
        test_type: test.test_type,
        invitation_id: inv._id,
        hkdse_papers: test.hkdse_papers,
        status: "pending",
        sort_order: i + 1,
        assigned_by: inv.invited_by,
        assigned_at: t,
        created_at: t,
        updated_at: t,
      });
    }
    await ctx.db.patch(inv._id, {
      status: "accepted",
      accepted_at: t,
      accepted_by: user._id,
      case_id: caseId,
    });
    return caseId;
  },
});

export const caseDetail = query({
  args: { caseId: v.id("student_cases") },
  handler: async (ctx, args) => {
    const { caseRow, role } = await requireCaseAccess(ctx, args.caseId);
    const [sessions, assignments, interviews, reports] = await Promise.all([
      ctx.db
        .query("test_sessions")
        .withIndex("by_case", (q: any) => q.eq("case_id", args.caseId))
        .collect(),
      ctx.db
        .query("case_test_assignments")
        .withIndex("by_case", (q: any) => q.eq("case_id", args.caseId))
        .collect(),
      ctx.db
        .query("interviews")
        .withIndex("by_case", (q: any) => q.eq("case_id", args.caseId))
        .collect(),
      ctx.db
        .query("reports")
        .withIndex("by_case", (q: any) => q.eq("case_id", args.caseId))
        .collect(),
    ]);
    const latestReport = reports.sort((a: any, b: any) => b.created_at - a.created_at)[0] ?? null;
    const visibleReport =
      role === "student" && latestReport?.status !== "published" ? null : latestReport;
    const organization = await ctx.db.get(caseRow.organization_id);
    return {
      case: publicRow(caseRow),
      organization: organization ? publicRow(organization) : null,
      sessions: sessions.map(publicRow),
      assignments: assignments.sort((a: any, b: any) => a.sort_order - b.sort_order).map(publicRow),
      interview: interviews[0] ? publicRow(interviews[0]) : null,
      report: visibleReport ? publicRow(visibleReport) : null,
    };
  },
});

export const updateCaseProfile = mutation({
  args: { caseId: v.id("student_cases"), patch: v.any() },
  handler: async (ctx, args) => {
    await requireCaseAccess(ctx, args.caseId);
    await ctx.db.patch(args.caseId, { ...args.patch, updated_at: now() });
  },
});

export const assignTest = mutation({
  args: {
    caseId: v.id("student_cases"),
    testType,
    hkdsePapers: v.optional(
      v.array(v.union(v.literal("R"), v.literal("W"), v.literal("L"), v.literal("S"))),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdvisorForCase(ctx, args.caseId);
    const existing = await ctx.db
      .query("case_test_assignments")
      .withIndex("by_case_test_type", (q) =>
        q.eq("case_id", args.caseId).eq("test_type", args.testType),
      )
      .unique();
    if (existing) throw new Error("This test is already assigned");
    const existingAssignments = await ctx.db
      .query("case_test_assignments")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .collect();
    const t = now();
    await ctx.db.insert("case_test_assignments", {
      case_id: args.caseId,
      test_type: args.testType,
      hkdse_papers:
        args.testType === "ielts_practice" && args.hkdsePapers && args.hkdsePapers.length > 0
          ? args.hkdsePapers
          : undefined,
      status: "pending",
      sort_order: existingAssignments.length + 1,
      assigned_by: user._id,
      assigned_at: t,
      created_at: t,
      updated_at: t,
    });
  },
});

export const studentTests = query({
  args: { caseId: v.id("student_cases") },
  handler: async (ctx, args) => {
    const { caseRow } = await requireStudentCaseOwner(ctx, args.caseId);
    const assignments = await ctx.db
      .query("case_test_assignments")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .collect();
    const sessions = await ctx.db
      .query("test_sessions")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .collect();
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_case_status", (q) => q.eq("case_id", args.caseId).eq("status", "published"))
      .collect();
    return {
      case: publicRow(caseRow),
      assignments: assignments.sort((a, b) => a.sort_order - b.sort_order).map(publicRow),
      sessions: sessions.map(publicRow),
      hasPublishedReport: reports.length > 0,
    };
  },
});

export const resolveTestSession = mutation({
  args: { caseId: v.id("student_cases"), assignmentId: v.id("case_test_assignments") },
  handler: async (ctx, args) => {
    const { caseRow } = await requireStudentCaseOwner(ctx, args.caseId);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.case_id !== args.caseId || assignment.status === "cancelled") {
      throw new Error("Assigned test not found.");
    }
    let session = await linkedSessionForAssignment(ctx, assignment);
    const t = now();
    if (!session) {
      const sessionId = await ctx.db.insert("test_sessions", {
        case_id: args.caseId,
        organization_id: caseRow.organization_id,
        status: "not_started",
        test_type: assignment.test_type,
        assignment_id: assignment._id,
        content_locale: "en",
        started_at: null,
        submitted_at: null,
        graded_at: null,
        total_score: null,
        total_max: null,
        ai_feedback: null,
        grading_error: null,
        created_at: t,
        updated_at: t,
      });
      await ctx.db.patch(assignment._id, { session_id: sessionId, updated_at: t });
      session = (await ctx.db.get(sessionId))!;
    } else if (session.assignment_id !== assignment._id || assignment.session_id !== session._id) {
      await ctx.db.patch(session._id, { assignment_id: assignment._id, updated_at: t });
      await ctx.db.patch(assignment._id, { session_id: session._id, updated_at: t });
    }
    const responses = await ctx.db
      .query("test_responses")
      .withIndex("by_session", (q) => q.eq("session_id", session._id))
      .collect();
    return {
      assignment: publicRow(assignment),
      session: publicRow(session),
      responses: responses.map(publicRow),
    };
  },
});

export const startTest = mutation({
  args: { sessionId: v.id("test_sessions"), assignmentId: v.id("case_test_assignments") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    await requireStudentCaseOwner(ctx, session.case_id);
    const t = now();
    await ctx.db.patch(session._id, { status: "in_progress", started_at: t, updated_at: t });
    await ctx.db.patch(args.assignmentId, { status: "in_progress", updated_at: t });
  },
});

export const upsertTestResponse = mutation({
  args: {
    sessionId: v.id("test_sessions"),
    sectionId: v.string(),
    questionId: v.string(),
    answer: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    await requireStudentCaseOwner(ctx, session.case_id);
    const existing = await ctx.db
      .query("test_responses")
      .withIndex("by_session_question", (q) =>
        q.eq("session_id", args.sessionId).eq("question_id", args.questionId),
      )
      .unique();
    const t = now();
    if (existing)
      await ctx.db.patch(existing._id, {
        section_id: args.sectionId,
        answer: args.answer,
        updated_at: t,
      });
    else
      await ctx.db.insert("test_responses", {
        session_id: args.sessionId,
        section_id: args.sectionId,
        question_id: args.questionId,
        answer: args.answer,
        updated_at: t,
      });
  },
});

export const schools = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("schools").withIndex("by_display_order").collect();
    return rows.map(publicRow);
  },
});

export const seedCatalogs = mutation({
  args: {},
  handler: async (ctx) => {
    const t = now();
    let testsSeeded = 0;
    for (const [i, tt] of TEST_TYPES.entries()) {
      const existing = await ctx.db
        .query("test_catalog")
        .withIndex("by_test_type", (q) => q.eq("test_type", tt))
        .unique();
      if (!existing) {
        await ctx.db.insert("test_catalog", {
          test_type: tt,
          display_name:
            tt === "hk_aptitude"
              ? "HK Admissions Aptitude Test"
              : tt === "ielts_practice"
                ? "HKDSE English Practice Set"
                : "Curriculum Pathway Fit (IB / A-Level / BTEC)",
          gates_interview: tt === "hk_aptitude",
          sort_order: i + 1,
          created_at: t,
        });
        testsSeeded++;
      } else if (
        tt === "ielts_practice" &&
        existing.display_name !== "HKDSE English Practice Set"
      ) {
        await ctx.db.patch(existing._id, { display_name: "HKDSE English Practice Set" });
      }
    }
    const schoolRows = seedSchools(t);
    let schoolsSeeded = 0;
    for (const row of schoolRows) {
      const existing = await ctx.db
        .query("schools")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("schools", row);
        schoolsSeeded++;
      }
    }
    return { ok: true, testsSeeded, schoolsSeeded };
  },
});

export const saveTranscript = mutation({
  args: { caseId: v.id("student_cases"), transcript: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user, caseRow } = await requireAdvisorForCase(ctx, args.caseId);
    const t = now();
    const existing = await ctx.db
      .query("interviews")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .unique();
    let interviewId: Id<"interviews">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        transcript: args.transcript,
        notes: args.notes || null,
        status: "transcript_ready",
        transcript_uploaded_at: t,
        uploaded_by: user._id,
        updated_at: t,
      });
      interviewId = existing._id;
    } else {
      interviewId = await ctx.db.insert("interviews", {
        case_id: args.caseId,
        organization_id: caseRow.organization_id,
        status: "transcript_ready",
        provider: null,
        scheduled_at: null,
        duration_minutes: 10,
        meeting_url: null,
        external_event_id: null,
        transcript: args.transcript,
        transcript_source: null,
        transcript_uploaded_at: t,
        uploaded_by: user._id,
        analyzed_at: null,
        analysis_error: null,
        notes: args.notes || null,
        created_at: t,
        updated_at: t,
      });
    }
    await ctx.db.patch(args.caseId, { status: "transcript_ready", updated_at: t });
    return interviewId;
  },
});

export const publishReport = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    const { user } = await requireAdvisorForCase(ctx, report.case_id);
    const t = now();
    await ctx.db.patch(report._id, {
      status: "published",
      published_at: t,
      published_by: user._id,
      updated_at: t,
    });
    await ctx.db.patch(report.case_id, { status: "report_published", updated_at: t });
  },
});

export const unpublishReport = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await requireAdvisorForCase(ctx, report.case_id);
    const t = now();
    await ctx.db.patch(report._id, {
      status: "draft",
      published_at: null,
      published_by: undefined,
      updated_at: t,
    });
    await ctx.db.patch(report.case_id, { status: "report_draft", updated_at: t });
  },
});

export const submitSession = internalMutation({
  args: { sessionId: v.id("test_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    const t = now();
    await ctx.db.patch(session._id, { status: "submitted", submitted_at: t, updated_at: t });
    if (session.assignment_id)
      await ctx.db.patch(session.assignment_id, { status: "in_progress", updated_at: t });
    return session;
  },
});

export const saveGeneratedTest = internalMutation({
  args: {
    sessionId: v.id("test_sessions"),
    assignmentId: v.optional(v.id("case_test_assignments")),
    payload: v.any(),
    sectionDurations: v.any(),
    contentLocale: v.union(v.literal("en"), v.literal("zh-Hans")),
  },
  handler: async (ctx, args) => {
    const t = now();
    const responses = await ctx.db
      .query("test_responses")
      .withIndex("by_session", (q) => q.eq("session_id", args.sessionId))
      .collect();
    for (const response of responses) await ctx.db.delete(response._id);
    await ctx.db.patch(args.sessionId, {
      test_payload: args.payload,
      section_durations: args.sectionDurations,
      content_locale: args.contentLocale,
      status: "not_started",
      started_at: null,
      submitted_at: null,
      graded_at: null,
      section_scores: undefined,
      total_score: null,
      total_max: null,
      ai_feedback: null,
      result_summary: undefined,
      grading_error: null,
      updated_at: t,
    });
    if (args.assignmentId)
      await ctx.db.patch(args.assignmentId, { session_id: args.sessionId, updated_at: t });
  },
});

export const saveGrading = internalMutation({
  args: { sessionId: v.id("test_sessions"), update: v.any() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    const t = now();
    await ctx.db.patch(session._id, { ...args.update, updated_at: t });
    if (session.assignment_id) {
      await ctx.db.patch(session.assignment_id, {
        status: "completed",
        session_id: session._id,
        updated_at: t,
      });
    }
    const catalog = await ctx.db
      .query("test_catalog")
      .withIndex("by_test_type", (q) => q.eq("test_type", session.test_type))
      .unique();
    if (catalog?.gates_interview) {
      const caseRow = await ctx.db.get(session.case_id);
      if (caseRow?.status === "profile_complete" || caseRow?.status === "test_in_progress") {
        await ctx.db.patch(session.case_id, { status: "test_completed", updated_at: t });
      }
    }
  },
});

export const markSessionFailed = internalMutation({
  args: { sessionId: v.id("test_sessions"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "failed",
      grading_error: args.error,
      updated_at: now(),
    });
  },
});

export const saveInterviewAnalysis = internalMutation({
  args: { interviewId: v.id("interviews"), analysis: v.any() },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");
    const t = now();
    await ctx.db.patch(interview._id, {
      ai_analysis: args.analysis,
      analyzed_at: t,
      status: "analyzed",
      analysis_error: null,
      updated_at: t,
    });
    await ctx.db.patch(interview.case_id, { status: "interview_completed", updated_at: t });
  },
});

export const markInterviewFailed = internalMutation({
  args: { interviewId: v.id("interviews"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interviewId, {
      status: "failed",
      analysis_error: args.error,
      updated_at: now(),
    });
  },
});

export const createReportDraft = internalMutation({
  args: { caseId: v.id("student_cases") },
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get(args.caseId);
    if (!caseRow) throw new Error("Case not found");
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .collect();
    const t = now();
    return await ctx.db.insert("reports", {
      case_id: args.caseId,
      organization_id: caseRow.organization_id,
      version: reports.length + 1,
      status: "draft",
      payload: {},
      payload_zh: null,
      generation_error: null,
      translation_error: null,
      pdf_url: null,
      created_at: t,
      updated_at: t,
    });
  },
});

export const saveReportPayload = internalMutation({
  args: {
    reportId: v.id("reports"),
    payload: v.any(),
    payloadZh: v.any(),
    translationError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    const t = now();
    await ctx.db.patch(report._id, {
      payload: args.payload,
      payload_zh: args.payloadZh,
      translation_error: args.translationError ?? null,
      generation_error: null,
      updated_at: t,
    });
    await ctx.db.patch(report.case_id, { status: "report_draft", updated_at: t });
  },
});

export const markReportFailed = internalMutation({
  args: { reportId: v.id("reports"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { generation_error: args.error, updated_at: now() });
  },
});

export const generationContext = internalQuery({
  args: { sessionId: v.id("test_sessions"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    const caseRow = await ctx.db.get(session.case_id);
    if (!caseRow) throw new Error("Case not found");
    if (caseRow.student_user_id !== args.userId) {
      const membership = await ctx.db
        .query("organization_members")
        .withIndex("by_org_user", (q) =>
          q.eq("organization_id", session.organization_id).eq("user_id", args.userId),
        )
        .unique();
      if (!membership) throw new Error("You do not have access to this session");
    }
    const assignment = session.assignment_id ? await ctx.db.get(session.assignment_id) : null;
    return { session, caseRow, assignment };
  },
});

export const gradingContext = internalQuery({
  args: { sessionId: v.id("test_sessions"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    const caseRow = await ctx.db.get(session.case_id);
    if (!caseRow) throw new Error("Case not found");
    if (caseRow.student_user_id !== args.userId) {
      const membership = await ctx.db
        .query("organization_members")
        .withIndex("by_org_user", (q) =>
          q.eq("organization_id", session.organization_id).eq("user_id", args.userId),
        )
        .unique();
      if (!membership) throw new Error("You do not have access to this session");
    }
    const assignment = session.assignment_id ? await ctx.db.get(session.assignment_id) : null;
    const responses = await ctx.db
      .query("test_responses")
      .withIndex("by_session", (q) => q.eq("session_id", args.sessionId))
      .collect();
    const catalog = await ctx.db
      .query("test_catalog")
      .withIndex("by_test_type", (q) => q.eq("test_type", session.test_type))
      .unique();
    return { session, caseRow, assignment, responses, catalog };
  },
});

export const interviewContext = internalQuery({
  args: { interviewId: v.id("interviews"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");
    const caseRow = await ctx.db.get(interview.case_id);
    if (!caseRow) throw new Error("Case not found");
    const membership = await ctx.db
      .query("organization_members")
      .withIndex("by_org_user", (q) =>
        q.eq("organization_id", interview.organization_id).eq("user_id", args.userId),
      )
      .unique();
    if (!membership) throw new Error("Advisor access required");
    return { interview, caseRow };
  },
});

export const reportContext = internalQuery({
  args: { caseId: v.id("student_cases"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get(args.caseId);
    if (!caseRow) throw new Error("Case not found");
    const membership = await ctx.db
      .query("organization_members")
      .withIndex("by_org_user", (q) =>
        q.eq("organization_id", caseRow.organization_id).eq("user_id", args.userId),
      )
      .unique();
    if (!membership) throw new Error("Advisor access required");
    const test = await ctx.db
      .query("test_sessions")
      .withIndex("by_case_test_type", (q) =>
        q.eq("case_id", args.caseId).eq("test_type", "hk_aptitude"),
      )
      .unique();
    const interview = await ctx.db
      .query("interviews")
      .withIndex("by_case", (q) => q.eq("case_id", args.caseId))
      .unique();
    const schools = await ctx.db.query("schools").withIndex("by_display_order").collect();
    return { caseRow, test, interview, schools };
  },
});

function seedSchools(t: number): Array<Omit<Doc<"schools">, "_id" | "_creationTime">> {
  return [
    {
      slug: "ichk",
      name: "International College Hong Kong (Hong Lok Yuen)",
      short_name: "ICHK",
      curriculum: "IB MYP -> IB Diploma Programme",
      location: "Hong Lok Yuen, New Territories",
      selectivity: "low-moderate",
      key_fit_notes:
        "Inclusive, broad-ability intake. Strong EAL support and pastoral care. Good fit for students who need a supportive environment to grow into IB.",
      caveats:
        "Located in HLY - commute from urban HK can be long. Smaller school community than ESF.",
      fee_notes:
        "Tuition approx HK$210,000-230,000/year. No debenture required for standard entry.",
      application_notes:
        "Rolling admissions; assessment includes English/Maths test and interview.",
      requires_chinese: false,
      has_eal_support: true,
      pr_quota_notes: "Open to all residency types - HKID not required.",
      display_order: 1,
      created_at: t,
      updated_at: t,
    },
    {
      slug: "esf-discovery",
      name: "ESF Discovery College",
      short_name: "ESF Discovery",
      curriculum: "IB MYP -> IB Diploma Programme",
      location: "Discovery Bay, Lantau",
      selectivity: "moderate",
      key_fit_notes:
        "Inquiry-based IB continuum. Good for students who thrive in collaborative, project-based learning.",
      caveats:
        "Discovery Bay location - ferry/bus commute required from HK Island or Kowloon. Highly competitive at Year 7 entry.",
      fee_notes: "Tuition approx HK$210,000/year. Capital levy and nomination rights may apply.",
      application_notes: "Annual round + waitlist. Apply via ESF central system.",
      requires_chinese: false,
      has_eal_support: true,
      pr_quota_notes:
        "ESF prioritises HK residents but accepts non-residents subject to availability.",
      display_order: 2,
      created_at: t,
      updated_at: t,
    },
    {
      slug: "esf-renaissance",
      name: "ESF Renaissance College",
      short_name: "ESF Renaissance",
      curriculum: "IB MYP -> IB Diploma Programme",
      location: "Ma On Shan, New Territories",
      selectivity: "moderate-high",
      key_fit_notes: "Through-train K-12 IB, strong academic record and IBDP results.",
      caveats: "Ma On Shan commute from urban HK is long. Highly oversubscribed.",
      fee_notes:
        "Tuition approx HK$215,000/year. Capital levy/nomination certificate strongly preferred.",
      application_notes: "ESF central application; competitive at all entry years.",
      requires_chinese: false,
      has_eal_support: true,
      pr_quota_notes: "ESF residency preference applies.",
      display_order: 3,
      created_at: t,
      updated_at: t,
    },
    {
      slug: "esf-standard",
      name: "ESF Standard Secondary Schools (King George V, Island, South Island, Sha Tin College, West Island)",
      short_name: "ESF Standard",
      curriculum: "IGCSE -> IBDP (or IB MYP at some)",
      location: "Various - HK Island, Kowloon, NT",
      selectivity: "moderate",
      key_fit_notes:
        "Broad pathway with multiple campuses. Diverse student body, strong sports/arts programmes, well-established IBDP track record.",
      caveats:
        "Each campus has different culture and entry difficulty. Catchment-based zoning influences placement.",
      fee_notes:
        "Tuition approx HK$170,000-180,000/year. Capital levy/nomination certificate strongly recommended for placement priority.",
      application_notes:
        "Apply through ESF central system; campus assigned based on zone, siblings, and nomination rights.",
      requires_chinese: false,
      has_eal_support: true,
      pr_quota_notes:
        "ESF residency preference; non-PR families face stronger waitlist competition.",
      display_order: 4,
      created_at: t,
      updated_at: t,
    },
    {
      slug: "sishk",
      name: "Singapore International School (Hong Kong)",
      short_name: "SISHK",
      curriculum: "IGCSE -> A-Level (also IBDP track)",
      location: "Aberdeen, HK Island",
      selectivity: "moderate-high",
      key_fit_notes:
        "Rigorous academics with strong Mathematics and Mandarin programmes. Singapore-style discipline and structure.",
      caveats:
        "Mandarin is core - limited English-only pathway. Demanding academic pace can pressure students with weaker reasoning skills.",
      fee_notes: "Tuition approx HK$190,000-220,000/year. Debenture HK$500K+ for priority.",
      application_notes: "Annual entry + assessment in English, Maths, and Mandarin.",
      requires_chinese: true,
      has_eal_support: false,
      pr_quota_notes: "Open to all but Singaporean nationals receive priority.",
      display_order: 5,
      created_at: t,
      updated_at: t,
    },
    {
      slug: "vsa",
      name: "Victoria Shanghai Academy",
      short_name: "VSA",
      curriculum: "Bilingual IB MYP -> IBDP (English + Mandarin)",
      location: "Aberdeen, HK Island",
      selectivity: "moderate-high",
      key_fit_notes:
        "True bilingual IB - strong fit for families committed to Chinese fluency alongside English.",
      caveats:
        "Demanding bilingual workload. Students with weak Chinese will struggle. Aspirational unless Putonghua is already at upper-intermediate level.",
      fee_notes:
        "Tuition approx HK$180,000-200,000/year. Capital certificate HK$500K+ recommended.",
      application_notes: "Bilingual assessment required - English, Maths, and Putonghua.",
      requires_chinese: true,
      has_eal_support: true,
      pr_quota_notes: "Open admissions but Chinese requirement is the practical filter.",
      display_order: 6,
      created_at: t,
      updated_at: t,
    },
  ];
}
