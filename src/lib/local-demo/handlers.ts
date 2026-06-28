/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildHkdseEnglishDemoPayload } from "@/lib/hkdse-demo-payload";
import { gradeHkdseSections } from "@/lib/hkdse-grading";
import type { AnswerRecord } from "@/lib/grade-utils";
import { ensureDemoSeed } from "./seed";
import { loadStore, now, publicRow, uid, updateStore } from "./store";
import { DEMO_IDS } from "./types";

function requireUser() {
  const data = loadStore();
  if (!data.authSessionUserId) throw new Error("Unauthenticated");
  const user = data.users.find((u) => u.id === data.authSessionUserId);
  if (!user) throw new Error("Unauthenticated");
  return user;
}

function requireOrgMember(orgId: string) {
  const user = requireUser();
  const data = loadStore();
  const member = data.members.find(
    (m) => m.organization_id === orgId && m.user_id === user.id,
  );
  if (!member) throw new Error("Not a member of this organization");
  return { user, member };
}

function requireCaseAccess(caseId: string) {
  const user = requireUser();
  const data = loadStore();
  const caseRow = data.cases.find((c) => c.id === caseId);
  if (!caseRow) throw new Error("Case not found");
  const isStudent = caseRow.student_user_id === user.id;
  const isAdvisor = data.members.some(
    (m) => m.organization_id === caseRow.organization_id && m.user_id === user.id,
  );
  if (!isStudent && !isAdvisor) throw new Error("Access denied");
  return { user, caseRow, role: isStudent ? "student" : "advisor" as const };
}

export const localApi = {
  me() {
    ensureDemoSeed();
    const data = loadStore();
    const user = data.users.find((u) => u.id === data.authSessionUserId);
    if (!user) return null;
    const memberships = data.members
      .filter((m) => m.user_id === user.id)
      .map((m) => {
        const org = data.organizations.find((o) => o.id === m.organization_id);
        return {
          id: m.id,
          organization_id: m.organization_id,
          is_owner: m.is_owner,
          organization: org
            ? {
                id: org.id,
                name: org.name,
                slug: org.slug,
                calendly_url: org.calendly_url,
              }
            : null,
        };
      })
      .filter((m) => m.organization);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      roles: [],
      organizations: memberships,
    };
  },

  postLoginDestination() {
    ensureDemoSeed();
    const data = loadStore();
    if (!data.authSessionUserId) return null;
    const memberships = data.members.filter((m) => m.user_id === data.authSessionUserId);
    if (memberships.length > 0) return { kind: "dashboard" as const };
    const cases = data.cases
      .filter((c) => c.student_user_id === data.authSessionUserId)
      .sort((a, b) => b.created_at - a.created_at);
    if (cases[0]) return { kind: "student" as const, caseId: cases[0].id };
    return { kind: "none" as const };
  },

  signIn(email: string, password: string) {
    ensureDemoSeed();
    const normalized = email.trim().toLowerCase();
    const data = loadStore();
    const user = data.users.find(
      (u) => u.email.toLowerCase() === normalized && u.password === password,
    );
    if (!user) throw new Error("Invalid email or password");
    updateStore((prev) => ({ ...prev, authSessionUserId: user.id }));
    return user;
  },

  signUp(email: string, password: string, name?: string) {
    ensureDemoSeed();
    const normalized = email.trim().toLowerCase();
    const data = loadStore();
    if (data.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists");
    }
    const user = { id: uid("user"), email: normalized, password, name };
    updateStore((prev) => ({
      ...prev,
      users: [...prev.users, user],
      authSessionUserId: user.id,
    }));
    return user;
  },

  signOut() {
    updateStore((prev) => ({ ...prev, authSessionUserId: null }));
  },

  createOrganizationWithOwner(name: string) {
    const user = requireUser();
    const data = loadStore();
    const existing = data.members.find((m) => m.user_id === user.id);
    if (existing) return existing.organization_id;
    const t = now();
    const orgId = uid("org");
    const slug = `${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
    updateStore((prev) => ({
      ...prev,
      organizations: [
        ...prev.organizations,
        {
          id: orgId,
          name: name.trim(),
          slug,
          primary_color: null,
          logo_url: null,
          calendly_url: null,
          created_at: t,
          updated_at: t,
        },
      ],
      members: [
        ...prev.members,
        {
          id: uid("mem"),
          organization_id: orgId,
          user_id: user.id,
          is_owner: true,
          created_at: t,
        },
      ],
    }));
    return orgId;
  },

  seedCatalogs() {
    return { ok: true, testsSeeded: 0, schoolsSeeded: 0 };
  },

  updateOrganization(args: { organizationId: string; name: string; calendly_url?: string }) {
    requireOrgMember(args.organizationId);
    const t = now();
    updateStore((prev) => ({
      ...prev,
      organizations: prev.organizations.map((o) =>
        o.id === args.organizationId
          ? {
              ...o,
              name: args.name.trim(),
              calendly_url: args.calendly_url?.trim() || null,
              updated_at: t,
            }
          : o,
      ),
    }));
  },

  dashboardCases(args: { organizationId: string }) {
    requireOrgMember(args.organizationId);
    const data = loadStore();
    return data.cases
      .filter((c) => c.organization_id === args.organizationId)
      .sort((a, b) => b.created_at - a.created_at)
      .map(publicRow);
  },

  caseDetail(args: { caseId: string }) {
    const { caseRow, role } = requireCaseAccess(args.caseId);
    const data = loadStore();
    const sessions = data.sessions.filter((s) => s.case_id === args.caseId);
    const assignments = data.assignments.filter((a) => a.case_id === args.caseId);
    const interviews = data.interviews.filter((i) => i.case_id === args.caseId);
    const reports = data.reports.filter((r) => r.case_id === args.caseId);
    const latestReport = reports.sort((a, b) => b.created_at - a.created_at)[0] ?? null;
    const visibleReport =
      role === "student" && latestReport?.status !== "published" ? null : latestReport;
    const organization = data.organizations.find((o) => o.id === caseRow.organization_id);
    return {
      case: publicRow(caseRow),
      organization: organization ? publicRow(organization) : null,
      sessions: sessions.map(publicRow),
      assignments: assignments.sort((a, b) => a.sort_order - b.sort_order).map(publicRow),
      interview: interviews[0] ? publicRow(interviews[0]) : null,
      report: visibleReport ? publicRow(visibleReport) : null,
    };
  },

  updateCaseProfile(args: { caseId: string; patch: Record<string, unknown> }) {
    requireCaseAccess(args.caseId);
    const t = now();
    updateStore((prev) => ({
      ...prev,
      cases: prev.cases.map((c) =>
        c.id === args.caseId ? { ...c, ...args.patch, updated_at: t } : c,
      ),
    }));
  },

  createInvitation(args: {
    organizationId: string;
    parent_email: string;
    parent_name?: string;
    student_name?: string;
    notes?: string;
    testTypes: string[];
    hkdsePapers?: string[];
  }) {
    const { user } = requireOrgMember(args.organizationId);
    if (!args.testTypes.length) throw new Error("Select at least one test");
    const t = now();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const invitationId = uid("inv");
    updateStore((prev) => {
      const invitation = {
        id: invitationId,
        organization_id: args.organizationId,
        invited_by: user.id,
        parent_email: args.parent_email.trim().toLowerCase(),
        parent_name: args.parent_name?.trim() || null,
        student_name: args.student_name?.trim() || null,
        token,
        status: "pending" as const,
        expires_at: t + 30 * 86400000,
        accepted_at: null,
        notes: args.notes?.trim() || null,
        created_at: t,
      };
      const invitationTests = args.testTypes.map((tt) => ({
        id: uid("ita"),
        invitation_id: invitationId,
        test_type: tt as any,
        hkdse_papers:
          tt === "ielts_practice" && args.hkdsePapers?.length
            ? args.hkdsePapers as any
            : undefined,
        assigned_at: t,
      }));
      return {
        ...prev,
        invitations: [...prev.invitations, invitation],
        invitationTests: [...prev.invitationTests, ...invitationTests],
      };
    });
    return { invitationId, token };
  },

  invitationsForOrg(args: { organizationId: string }) {
    requireOrgMember(args.organizationId);
    const data = loadStore();
    const invitations = data.invitations
      .filter((i) => i.organization_id === args.organizationId)
      .sort((a, b) => b.created_at - a.created_at);
    const testsById: Record<string, string[]> = {};
    for (const inv of invitations) {
      testsById[inv.id] = data.invitationTests
        .filter((t) => t.invitation_id === inv.id)
        .map((t) => t.test_type);
    }
    return { invitations: invitations.map(publicRow), testsById };
  },

  invitationByToken(args: { token: string }) {
    const data = loadStore();
    const inv = data.invitations.find((i) => i.token === args.token);
    if (!inv) return null;
    const org = data.organizations.find((o) => o.id === inv.organization_id);
    const tests = data.invitationTests.filter((t) => t.invitation_id === inv.id);
    return {
      invite: publicRow(inv),
      organization: org ? publicRow(org) : null,
      tests: tests.map(publicRow),
    };
  },

  acceptInvitation(args: {
    token: string;
    student_name: string;
    date_of_birth: string;
    current_grade: string;
    desired_entry_grade: string;
  }) {
    const user = requireUser();
    const data = loadStore();
    const inv = data.invitations.find((i) => i.token === args.token);
    if (!inv) throw new Error("This invitation link is invalid.");
    if (inv.status === "revoked") throw new Error("This invitation has been revoked.");
    if (inv.expires_at < now()) throw new Error("This invitation has expired.");
    if (inv.status === "accepted") {
      if (inv.accepted_by === user.id && inv.case_id) return inv.case_id;
      throw new Error("This invitation has already been accepted.");
    }
    if (user.email.toLowerCase() !== inv.parent_email.toLowerCase()) {
      throw new Error("Please sign in with the email address this invitation was sent to.");
    }
    const t = now();
    const caseId = uid("case");
    const invTests = data.invitationTests.filter((it) => it.invitation_id === inv.id);

    updateStore((prev) => {
      const caseRow = {
        id: caseId,
        organization_id: inv.organization_id,
        student_user_id: user.id,
        invitation_id: inv.id,
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
      };
      const assignments = invTests.map((it, i) => ({
        id: uid("assign"),
        case_id: caseId,
        test_type: it.test_type,
        invitation_id: inv.id,
        status: "pending" as const,
        sort_order: i + 1,
        assigned_at: t,
        hkdse_papers: it.hkdse_papers,
        created_at: t,
        updated_at: t,
      }));
      return {
        ...prev,
        cases: [...prev.cases, caseRow],
        assignments: [...prev.assignments, ...assignments],
        invitations: prev.invitations.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                status: "accepted" as const,
                accepted_at: t,
                accepted_by: user.id,
                case_id: caseId,
              }
            : i,
        ),
      };
    });
    return caseId;
  },

  assignTest(args: {
    caseId: string;
    testType: string;
    hkdsePapers?: string[];
  }) {
    const { user } = requireCaseAccess(args.caseId);
    const data = loadStore();
    const existing = data.assignments.filter((a) => a.case_id === args.caseId);
    const t = now();
    const assignId = uid("assign");
    updateStore((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          id: assignId,
          case_id: args.caseId,
          test_type: args.testType as any,
          status: "pending",
          sort_order: existing.length + 1,
          assigned_by: user.id,
          assigned_at: t,
          hkdse_papers: args.hkdsePapers as any,
          created_at: t,
          updated_at: t,
        },
      ],
    }));
  },

  studentTests(args: { caseId: string }) {
    const { caseRow } = requireCaseAccess(args.caseId);
    const data = loadStore();
    const assignments = data.assignments.filter((a) => a.case_id === args.caseId);
    const sessions = data.sessions.filter((s) => s.case_id === args.caseId);
    const reports = data.reports.filter(
      (r) => r.case_id === args.caseId && r.status === "published",
    );
    return {
      case: publicRow(caseRow),
      assignments: assignments.sort((a, b) => a.sort_order - b.sort_order).map(publicRow),
      sessions: sessions.map(publicRow),
      hasPublishedReport: reports.length > 0,
    };
  },

  resolveTestSession(args: { caseId: string; assignmentId: string }) {
    const { caseRow } = requireCaseAccess(args.caseId);
    const data = loadStore();
    const assignment = data.assignments.find((a) => a.id === args.assignmentId);
    if (!assignment || assignment.case_id !== args.caseId || assignment.status === "cancelled") {
      throw new Error("Assigned test not found.");
    }
    let session = assignment.session_id
      ? data.sessions.find((s) => s.id === assignment.session_id)
      : undefined;
    const t = now();
    if (!session) {
      const sessionId = uid("session");
      session = {
        id: sessionId,
        case_id: args.caseId,
        organization_id: caseRow.organization_id,
        status: "not_started",
        test_type: assignment.test_type,
        assignment_id: assignment.id,
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
      };
      updateStore((prev) => ({
        ...prev,
        sessions: [...prev.sessions, session!],
        assignments: prev.assignments.map((a) =>
          a.id === assignment.id ? { ...a, session_id: sessionId, updated_at: t } : a,
        ),
      }));
    }
    const fresh = loadStore();
    const responses = fresh.responses.filter((r) => r.session_id === session!.id);
    const freshAssignment = fresh.assignments.find((a) => a.id === args.assignmentId)!;
    const freshSession = fresh.sessions.find((s) => s.id === session!.id)!;
    return {
      assignment: publicRow(freshAssignment),
      session: publicRow(freshSession),
      responses: responses.map(publicRow),
    };
  },

  startTest(args: { sessionId: string; assignmentId: string }) {
    const data = loadStore();
    const session = data.sessions.find((s) => s.id === args.sessionId);
    if (!session) throw new Error("Session not found");
    requireCaseAccess(session.case_id);
    const t = now();
    updateStore((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === args.sessionId
          ? { ...s, status: "in_progress", started_at: t, updated_at: t }
          : s,
      ),
      assignments: prev.assignments.map((a) =>
        a.id === args.assignmentId ? { ...a, status: "in_progress", updated_at: t } : a,
      ),
    }));
  },

  upsertTestResponse(args: {
    sessionId: string;
    sectionId: string;
    questionId: string;
    answer: unknown;
  }) {
    const data = loadStore();
    const session = data.sessions.find((s) => s.id === args.sessionId);
    if (!session) throw new Error("Session not found");
    requireCaseAccess(session.case_id);
    const t = now();
    updateStore((prev) => {
      const existing = prev.responses.find(
        (r) => r.session_id === args.sessionId && r.question_id === args.questionId,
      );
      if (existing) {
        return {
          ...prev,
          responses: prev.responses.map((r) =>
            r.id === existing.id
              ? { ...r, section_id: args.sectionId, answer: args.answer, updated_at: t }
              : r,
          ),
        };
      }
      return {
        ...prev,
        responses: [
          ...prev.responses,
          {
            id: uid("resp"),
            session_id: args.sessionId,
            section_id: args.sectionId,
            question_id: args.questionId,
            answer: args.answer,
            updated_at: t,
          },
        ],
      };
    });
  },

  generateTest(args: {
    sessionId: string;
    assignmentId?: string;
    contentLocale: "en" | "zh-Hans";
  }) {
    const data = loadStore();
    const session = data.sessions.find((s) => s.id === args.sessionId);
    if (!session) throw new Error("Session not found");
    requireCaseAccess(session.case_id);
    if (session.test_payload && session.status !== "failed") {
      return { ok: true, already_generated: true, test_type: session.test_type };
    }
    if (session.test_type !== "ielts_practice") {
      throw new Error("Only HKDSE English practice is available in local demo mode.");
    }
    const payload = {
      ...buildHkdseEnglishDemoPayload(),
      test_type: session.test_type,
      schema_version: 2,
    };
    const sectionDurations = Object.fromEntries(
      (payload.sections ?? []).map((s: any) => [s.id, Number(s.minutes) || 10]),
    );
    const t = now();
    updateStore((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === args.sessionId
          ? {
              ...s,
              test_payload: payload,
              section_durations: sectionDurations,
              content_locale: args.contentLocale,
              updated_at: t,
            }
          : s,
      ),
    }));
    return { ok: true, test_type: session.test_type, demo_fixture: true };
  },

  gradeTest(args: { sessionId: string }) {
    const data = loadStore();
    const session = data.sessions.find((s) => s.id === args.sessionId);
    if (!session) throw new Error("Session not found");
    requireCaseAccess(session.case_id);
    if (!session.test_payload) throw new Error("Test not generated yet");

    const responses = data.responses.filter((r) => r.session_id === args.sessionId);
    const answersByQ = new Map<string, AnswerRecord>();
    for (const r of responses) answersByQ.set(r.question_id, r.answer as AnswerRecord);

    const sections = (session.test_payload as { sections: any[] }).sections;
    const t = now();

    updateStore((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === args.sessionId
          ? { ...s, status: "submitted", submitted_at: t, updated_at: t }
          : s,
      ),
    }));

    if (session.test_type === "ielts_practice") {
      const { sectionScores, totalScore, totalMax, resultSummary, aiFeedback } = gradeHkdseSections(
        sections,
        answersByQ,
      );
      updateStore((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === args.sessionId
            ? {
                ...s,
                status: "graded",
                graded_at: t,
                total_score: totalScore,
                total_max: totalMax,
                section_scores: sectionScores,
                result_summary: resultSummary,
                ai_feedback: aiFeedback,
                grading_error: null,
                updated_at: t,
              }
            : s,
        ),
        assignments: prev.assignments.map((a) =>
          a.id === session.assignment_id
            ? { ...a, status: "completed", updated_at: t }
            : a,
        ),
        cases: prev.cases.map((c) =>
          c.id === session.case_id ? { ...c, status: "test_completed", updated_at: t } : c,
        ),
      }));
      return { ok: true, result_summary: resultSummary };
    }

    throw new Error("Test type not supported in local demo");
  },

  saveTranscript(args: { caseId: string; transcript: string; notes?: string }) {
    requireCaseAccess(args.caseId);
    const t = now();
    const data = loadStore();
    const existing = data.interviews.find((i) => i.case_id === args.caseId);
    updateStore((prev) => {
      if (existing) {
        return {
          ...prev,
          interviews: prev.interviews.map((i) =>
            i.id === existing.id
              ? { ...i, transcript: args.transcript, updated_at: t }
              : i,
          ),
        };
      }
      const caseRow = prev.cases.find((c) => c.id === args.caseId)!;
      return {
        ...prev,
        interviews: [
          ...prev.interviews,
          {
            id: uid("interview"),
            case_id: args.caseId,
            organization_id: caseRow.organization_id,
            status: "transcript_ready",
            transcript: args.transcript,
            created_at: t,
            updated_at: t,
          },
        ],
      };
    });
  },

  publishReport(args: { caseId: string }) {
    requireCaseAccess(args.caseId);
    return { ok: true };
  },

  unpublishReport(args: { caseId: string }) {
    requireCaseAccess(args.caseId);
    return { ok: true };
  },

  analyzeInterview(args: { caseId: string }) {
    requireCaseAccess(args.caseId);
    return { ok: true, demo: true };
  },

  generateReport(args: { caseId: string }) {
    requireCaseAccess(args.caseId);
    return { ok: true, demo: true };
  },
};

import { DEMO_PASSWORD } from "./types";

export const DEMO_ACCOUNTS = [
  { role: "Teacher", email: "demo-teacher@demo.hk", password: DEMO_PASSWORD },
  { role: "Excellent student", email: "good.student@demo.hk", password: DEMO_PASSWORD },
  { role: "Weak student (live demo)", email: "bad.student@demo.hk", password: DEMO_PASSWORD },
];
