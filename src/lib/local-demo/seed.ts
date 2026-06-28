import { parsePapersString } from "@/lib/class-csv";
import {
  ALL_PAPERS,
  generateExcellentSession,
  generatePoorSession,
  generateSimSession,
} from "@/lib/class-sim-grading";
import { aggregateClassStats, buildHistoryPoint } from "@/lib/class-stats";
import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { buildHkdseEnglishDemoPayload } from "@/lib/hkdse-demo-payload";
import { gradeHkdseSections } from "@/lib/hkdse-grading";
import type { AnswerRecord } from "@/lib/grade-utils";
import { DEMO_IDS, DEMO_PASSWORD, type LocalStoreData } from "./types";
import { loadStore, now, saveStore, uid } from "./store";

const CLASS_STORAGE_KEY = "hkdse-class-demo-v1";

const ROSTER_CSV = `name,email,grade,papers
Amy Chan,amy.chan@demo.hk,Form 5,all
Ben Lee,ben.lee@demo.hk,Form 5,R
Cathy Wong,cathy.wong@demo.hk,Form 5,W
David Ho,david.ho@demo.hk,Form 5,L
Emily Lau,emily.lau@demo.hk,Form 5,S
Frank Cheung,frank.cheung@demo.hk,Form 5,all
Grace Ng,grace.ng@demo.hk,Form 5,R,W
Henry Tsang,henry.tsang@demo.hk,Form 5,L,S
Ivy Mak,ivy.mak@demo.hk,Form 5,all
Jack Yip,jack.yip@demo.hk,Form 5,R
Kelly Fung,kelly.fung@demo.hk,Form 5,W
Leo Tam,leo.tam@demo.hk,Form 5,L
Mandy Chu,mandy.chu@demo.hk,Form 5,S
Nathan Ko,nathan.ko@demo.hk,Form 5,all
Olivia Pang,olivia.pang@demo.hk,Form 5,R,L
Paul Szeto,paul.szeto@demo.hk,Form 5,W,S
Queenie Lam,queenie.lam@demo.hk,Form 5,all
Raymond Hui,raymond.hui@demo.hk,Form 5,R
Sandy Yeung,sandy.yeung@demo.hk,Form 5,W
Tommy Cheng,tommy.cheng@demo.hk,Form 5,L
Una Tse,una.tse@demo.hk,Form 5,S
Victor Au,victor.au@demo.hk,Form 5,all
Wendy Ip,wendy.ip@demo.hk,Form 5,R,W
Xavier Lo,xavier.lo@demo.hk,Form 5,L,S
Yvonne Tang,yvonne.tang@demo.hk,Form 5,all
Zoe Wan,zoe.wan@demo.hk,Form 5,R
Aaron Kwok,aaron.kwok@demo.hk,Form 5,W
Bella Shum,bella.shum@demo.hk,Form 5,L
Chris Lai,chris.lai@demo.hk,Form 5,S
Diana Mok,diana.mok@demo.hk,Form 5,all`;

function parseRoster() {
  const lines = ROSTER_CSV.trim().split("\n").slice(1);
  return lines.map((line) => {
    const [name, email, grade, papers] = line.split(",");
    return { name, email, grade, papers };
  });
}

function buildExcellentGradedSession() {
  const payload = buildHkdseEnglishDemoPayload();
  const answersByQ = new Map<string, AnswerRecord>();
  const responses: Array<{ section_id: string; question_id: string; answer: AnswerRecord }> = [];

  for (const section of payload.sections) {
    for (const q of section.questions) {
      const value = q.answer ?? "";
      answersByQ.set(q.id, { value });
      responses.push({
        section_id: section.id,
        question_id: q.id,
        answer: { value },
      });
    }
  }

  const graded = gradeHkdseSections(payload.sections, answersByQ);
  const sectionDurations = Object.fromEntries(
    payload.sections.map((s) => [s.id, Number(s.minutes) || 10]),
  );

  return {
    payload: {
      ...payload,
      test_type: "ielts_practice",
      schema_version: 2,
    },
    sectionDurations,
    responses,
    graded,
  };
}

function buildEnrollments(classId: string, roundId: string) {
  const rows = parseRoster();
  type Enrollment = {
    id: string;
    class_id: string;
    round_id: string;
    student_name: string;
    email: string;
    grade: string | null;
    hkdse_papers: HkdsePaperId[];
    status: "pending" | "in_progress" | "completed";
    session: ReturnType<typeof generateSimSession> | null;
  };

  return rows.map((row, i) => {
    const papers = parsePapersString(row.papers);
    const email = row.email.toLowerCase();
    let session: Enrollment["session"] = null;
    let status: Enrollment["status"] = "pending";

    if (email === "amy.chan@demo.hk") {
      session = generateExcellentSession(papers.length ? papers : [...ALL_PAPERS]);
      status = "completed";
    } else if (email === "ben.lee@demo.hk") {
      session = generatePoorSession(papers.length ? papers : ["R"]);
      status = "completed";
    } else if (i % 3 === 0) {
      session = generateSimSession(email, papers.length ? papers : [...ALL_PAPERS], 1);
      status = "completed";
    }

    return {
      id: uid("enr"),
      class_id: classId,
      round_id: roundId,
      student_name: row.name,
      email,
      grade: row.grade || null,
      hkdse_papers: papers.length ? papers : [...ALL_PAPERS],
      status,
      session,
    };
  });
}

type ClassStoreShape = {
  classes: Array<{
    id: string;
    organization_id: string;
    name: string;
    grade_label: string | null;
    created_at: number;
  }>;
  rounds: Array<{
    id: string;
    class_id: string;
    round_number: number;
    label: string;
    status: "active" | "completed";
    created_at: number;
  }>;
  enrollments: Array<{
    id: string;
    class_id: string;
    round_id: string;
    student_name: string;
    email: string;
    grade: string | null;
    hkdse_papers: HkdsePaperId[];
    status: "pending" | "in_progress" | "completed";
    session: ReturnType<typeof generateSimSession> | null;
  }>;
  historyByClass: Record<string, unknown[]>;
  demoJobs: unknown[];
};

function loadClassStore(): ClassStoreShape {
  if (typeof window === "undefined") {
    return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
  }
  try {
    const raw = localStorage.getItem(CLASS_STORAGE_KEY);
    if (!raw) return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
    return JSON.parse(raw) as ClassStoreShape;
  } catch {
    return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
  }
}

/** Ensure demo org has Form 5 English with 30-student roster (repairs empty classes). */
export function ensureDemoClassSeed(orgId: string = DEMO_IDS.org) {
  if (typeof window === "undefined") return;

  const store = loadClassStore();
  const t = now();

  let classRow = store.classes.find(
    (c) => c.organization_id === orgId && c.name === "Form 5 English",
  );

  if (!classRow) {
    classRow = {
      id: DEMO_IDS.classId,
      organization_id: orgId,
      name: "Form 5 English",
      grade_label: "Form 5",
      created_at: t,
    };
    store.classes.push(classRow);
  }

  const classId = classRow.id;
  const enrollmentCount = store.enrollments.filter((e) => e.class_id === classId).length;
  if (enrollmentCount >= 30) return;

  const roundId = uid("round");
  const round = {
    id: roundId,
    class_id: classId,
    round_number: 1,
    label: "Initial assessment",
    status: "active" as const,
    created_at: t,
  };

  store.rounds = store.rounds.filter((r) => r.class_id !== classId);
  store.rounds.push(round);
  store.enrollments = store.enrollments.filter((e) => e.class_id !== classId);

  const enrollments = buildEnrollments(classId, roundId);
  store.enrollments.push(...enrollments);

  const enrollmentData = enrollments.map((e) => ({
    id: e.id,
    student_name: e.student_name,
    email: e.email,
    grade: e.grade,
    hkdse_papers: e.hkdse_papers,
    status: e.status,
    session: e.session,
  }));

  const stats = aggregateClassStats(enrollmentData);
  store.historyByClass[classId] = [buildHistoryPoint(1, "Initial assessment", t, stats)];

  localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(store));

  if (!store.classes.some((c) => c.organization_id === orgId && c.name === "English for Form Six")) {
    store.classes.push({
      id: uid("class"),
      organization_id: orgId,
      name: "English for Form Six",
      grade_label: "Form 6",
      created_at: t,
    });
    localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(store));
  }
}

function repairDemoAccounts(data: LocalStoreData): LocalStoreData {
  const t = now();
  const orgId = DEMO_IDS.org;
  const next = structuredClone(data);

  const demoUsers = [
    {
      id: DEMO_IDS.teacher,
      email: "demo-teacher@demo.hk",
      password: DEMO_PASSWORD,
      name: "Demo Teacher",
    },
    {
      id: DEMO_IDS.goodUser,
      email: "good.student@demo.hk",
      password: DEMO_PASSWORD,
      name: "Alex Wong (Excellent)",
    },
    {
      id: DEMO_IDS.badUser,
      email: "bad.student@demo.hk",
      password: DEMO_PASSWORD,
      name: "Sam Ng (Weak)",
    },
  ];

  for (const du of demoUsers) {
    const idx = next.users.findIndex((u) => u.email.toLowerCase() === du.email);
    if (idx === -1) {
      next.users.push(du);
    } else {
      next.users[idx] = { ...next.users[idx], password: DEMO_PASSWORD, name: du.name };
    }
  }

  if (!next.organizations.some((o) => o.id === orgId)) {
    next.organizations.push({
      id: orgId,
      name: "Demo HK School",
      slug: "demo-hk-school",
      primary_color: null,
      logo_url: null,
      calendly_url: null,
      created_at: t,
      updated_at: t,
    });
  }

  if (
    !next.members.some(
      (m) => m.user_id === DEMO_IDS.teacher && m.organization_id === orgId,
    )
  ) {
    next.members.push({
      id: uid("mem"),
      organization_id: orgId,
      user_id: DEMO_IDS.teacher,
      is_owner: true,
      created_at: t,
    });
  }

  next.seeded = true;
  return next;
}

function seedClassData(orgId: string) {
  ensureDemoClassSeed(orgId);
}

export function ensureDemoSeed(): LocalStoreData {
  const data = loadStore();
  const needsFullSeed =
    !data.seeded ||
    !data.users.some((u) => u.email.toLowerCase() === "demo-teacher@demo.hk") ||
    !data.cases.some((c) => c.id === DEMO_IDS.caseGood);

  if (!needsFullSeed) {
    const repaired = repairDemoAccounts(data);
    const changed =
      repaired.users.length !== data.users.length ||
      repaired.members.length !== data.members.length ||
      repaired.users.some(
        (u, i) => data.users[i]?.password !== u.password || data.users[i]?.email !== u.email,
      );
    if (changed) {
      saveStore(repaired);
    }
    ensureDemoClassSeed(DEMO_IDS.org);
    return loadStore();
  }

  const t = now();
  const excellent = buildExcellentGradedSession();
  const orgId = DEMO_IDS.org;

  const seeded: LocalStoreData = {
    users: [
      {
        id: DEMO_IDS.teacher,
        email: "demo-teacher@demo.hk",
        password: DEMO_PASSWORD,
        name: "Demo Teacher",
      },
      {
        id: DEMO_IDS.goodUser,
        email: "good.student@demo.hk",
        password: DEMO_PASSWORD,
        name: "Alex Wong (Excellent)",
      },
      {
        id: DEMO_IDS.badUser,
        email: "bad.student@demo.hk",
        password: DEMO_PASSWORD,
        name: "Sam Ng (Weak)",
      },
    ],
    organizations: [
      {
        id: orgId,
        name: "Demo HK School",
        slug: "demo-hk-school",
        primary_color: null,
        logo_url: null,
        calendly_url: null,
        created_at: t,
        updated_at: t,
      },
    ],
    members: [
      {
        id: uid("mem"),
        organization_id: orgId,
        user_id: DEMO_IDS.teacher,
        is_owner: true,
        created_at: t,
      },
    ],
    cases: [
      {
        id: DEMO_IDS.caseGood,
        organization_id: orgId,
        student_user_id: DEMO_IDS.goodUser,
        status: "test_completed",
        student_name: "Alex Wong",
        student_english_name: "Alex Wong",
        date_of_birth: "2009-03-15",
        gender: null,
        current_grade: "Form 5",
        current_school: "Demo Secondary School",
        current_country: "Hong Kong",
        current_city: "Hong Kong",
        hk_residency_status: null,
        passport_status: null,
        desired_entry_grade: "Form 6",
        desired_entry_year: null,
        current_academic_performance: null,
        transcript_url: null,
        strongest_subjects: ["English"],
        weakest_subjects: [],
        english_level: "Advanced",
        chinese_level: null,
        current_curriculum: "HKDSE",
        desired_curriculum: "HKDSE",
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
        parent_name: "Mrs Wong",
        parent_email: "good.student@demo.hk",
        parent_phone: null,
        created_at: t,
        updated_at: t,
      },
      {
        id: DEMO_IDS.caseBad,
        organization_id: orgId,
        student_user_id: DEMO_IDS.badUser,
        status: "profile_complete",
        student_name: "Sam Ng",
        student_english_name: "Sam Ng",
        date_of_birth: "2009-08-22",
        gender: null,
        current_grade: "Form 5",
        current_school: "Demo Secondary School",
        current_country: "Hong Kong",
        current_city: "Hong Kong",
        hk_residency_status: null,
        passport_status: null,
        desired_entry_grade: "Form 6",
        desired_entry_year: null,
        current_academic_performance: null,
        transcript_url: null,
        strongest_subjects: [],
        weakest_subjects: ["English"],
        english_level: "Basic",
        chinese_level: null,
        current_curriculum: "HKDSE",
        desired_curriculum: "HKDSE",
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
        parent_name: "Mr Ng",
        parent_email: "bad.student@demo.hk",
        parent_phone: null,
        created_at: t,
        updated_at: t,
      },
    ],
    invitations: [],
    invitationTests: [],
    assignments: [
      {
        id: DEMO_IDS.assignGood,
        case_id: DEMO_IDS.caseGood,
        test_type: "ielts_practice",
        status: "completed",
        sort_order: 1,
        assigned_by: DEMO_IDS.teacher,
        assigned_at: t,
        session_id: DEMO_IDS.sessionGood,
        hkdse_papers: ["R", "W", "L", "S"],
        created_at: t,
        updated_at: t,
      },
      {
        id: DEMO_IDS.assignBad,
        case_id: DEMO_IDS.caseBad,
        test_type: "ielts_practice",
        status: "pending",
        sort_order: 1,
        assigned_by: DEMO_IDS.teacher,
        assigned_at: t,
        hkdse_papers: ["R", "W", "L", "S"],
        created_at: t,
        updated_at: t,
      },
    ],
    sessions: [
      {
        id: DEMO_IDS.sessionGood,
        case_id: DEMO_IDS.caseGood,
        organization_id: orgId,
        status: "graded",
        test_type: "ielts_practice",
        assignment_id: DEMO_IDS.assignGood,
        content_locale: "en",
        test_payload: excellent.payload,
        section_durations: excellent.sectionDurations,
        started_at: t - 86400000,
        submitted_at: t - 86000000,
        graded_at: t - 86000000,
        total_score: excellent.graded.totalScore,
        total_max: excellent.graded.totalMax,
        section_scores: excellent.graded.sectionScores,
        result_summary: excellent.graded.resultSummary,
        ai_feedback: excellent.graded.aiFeedback,
        grading_error: null,
        created_at: t - 86400000,
        updated_at: t - 86000000,
      },
    ],
    responses: excellent.responses.map((r, i) => ({
      id: uid(`resp_${i}`),
      session_id: DEMO_IDS.sessionGood,
      section_id: r.section_id,
      question_id: r.question_id,
      answer: r.answer,
      updated_at: t,
    })),
    interviews: [],
    reports: [],
    authSessionUserId: null,
    seeded: true,
  };

  saveStore(seeded);
  seedClassData(orgId);
  return seeded;
}
