import { useCallback, useEffect, useMemo, useState } from "react";
import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { parsePapersString } from "@/lib/class-csv";
import {
  aggregateClassStats,
  buildHistoryPoint,
  buildTargetedPracticeCsv,
  computeTargetedPractice,
  type ClassStatsSnapshot,
} from "@/lib/class-stats";
import { ALL_PAPERS, generateSimSession, type SimSessionResult } from "@/lib/class-sim-grading";
import { ensureDemoClassSeed } from "@/lib/local-demo/seed";

const STORAGE_KEY = "hkdse-class-demo-v1";

type EnrollmentStatus = "pending" | "in_progress" | "completed";

export type LocalClass = {
  id: string;
  organization_id: string;
  name: string;
  grade_label: string | null;
  created_at: number;
};

export type LocalRound = {
  id: string;
  class_id: string;
  round_number: number;
  label: string;
  status: "active" | "completed";
  created_at: number;
};

export type LocalEnrollment = {
  id: string;
  class_id: string;
  round_id: string;
  student_name: string;
  email: string;
  grade: string | null;
  hkdse_papers: HkdsePaperId[];
  targeted_paper?: HkdsePaperId;
  attempts?: number;
  status: EnrollmentStatus;
  session: SimSessionResult | null;
};

export type LocalDemoJob = {
  class_id: string;
  round_id: string;
  status: "running" | "completed";
  started_at: number;
};

export type HistoryPoint = {
  round_number: number;
  label: string;
  snapshot_at: number;
  median_pct: number;
  mean_pct: number;
  per_paper_median: Record<HkdsePaperId, number>;
};

type StoreData = {
  classes: LocalClass[];
  rounds: LocalRound[];
  enrollments: LocalEnrollment[];
  historyByClass: Record<string, HistoryPoint[]>;
  demoJobs: LocalDemoJob[];
};

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadStore(): StoreData {
  if (typeof window === "undefined") {
    return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
    return JSON.parse(raw) as StoreData;
  } catch {
    return { classes: [], rounds: [], enrollments: [], historyByClass: {}, demoJobs: [] };
  }
}

function saveStore(data: StoreData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function enrollmentRowsForRound(data: StoreData, roundId: string) {
  return data.enrollments
    .filter((e) => e.round_id === roundId)
    .map((e) => ({
      id: e.id,
      student_name: e.student_name,
      email: e.email,
      grade: e.grade,
      hkdse_papers: e.hkdse_papers,
      status: e.status,
      targeted_paper: e.targeted_paper,
      attempts: e.attempts,
      session: e.session
        ? {
            total_score: e.session.total_score,
            total_max: e.session.total_max,
            component_scores: e.session.component_scores,
            bands: e.session.bands,
            overall_band: e.session.overall_band,
            section_scores: e.session.section_scores,
            result_summary: e.session.result_summary,
          }
        : null,
    }));
}

function completeEnrollment(enrollment: LocalEnrollment, round: LocalRound): LocalEnrollment {
  const papers = enrollment.hkdse_papers.length > 0 ? enrollment.hkdse_papers : [...ALL_PAPERS];
  const session = generateSimSession(
    enrollment.email,
    papers,
    round.round_number,
    enrollment.targeted_paper,
  );
  return { ...enrollment, status: "completed", session };
}

function pushHistory(data: StoreData, classId: string, point: HistoryPoint) {
  const existing = data.historyByClass[classId] ?? [];
  const withoutRound = existing.filter((h) => h.round_number !== point.round_number);
  data.historyByClass[classId] = [...withoutRound, point].sort(
    (a, b) => a.round_number - b.round_number,
  );
}

const remindTimers: Map<string, ReturnType<typeof setTimeout>[]> = new Map();

export function useClassLocalStore(organizationId: string | null) {
  const [data, setData] = useState<StoreData>(() => loadStore());

  useEffect(() => {
    if (organizationId) {
      ensureDemoClassSeed(organizationId);
      setData(loadStore());
    }
  }, [organizationId]);

  useEffect(() => {
    saveStore(data);
  }, [data]);

  const orgClasses = useMemo(
    () => (organizationId ? data.classes.filter((c) => c.organization_id === organizationId) : []),
    [data.classes, organizationId],
  );

  const listClasses = useMemo(() => {
    return orgClasses.map((c) => {
      const rounds = data.rounds
        .filter((r) => r.class_id === c.id)
        .sort((a, b) => b.round_number - a.round_number);
      const latestRound = rounds[0];
      let completion_pct = 0;
      let student_count = 0;
      if (latestRound) {
        const enrollments = data.enrollments.filter((e) => e.round_id === latestRound.id);
        student_count = enrollments.length;
        const completed = enrollments.filter((e) => e.status === "completed").length;
        completion_pct = student_count > 0 ? (completed / student_count) * 100 : 0;
      }
      return {
        id: c.id,
        name: c.name,
        grade_label: c.grade_label,
        student_count,
        latest_round: latestRound
          ? {
              id: latestRound.id,
              round_number: latestRound.round_number,
              label: latestRound.label,
            }
          : null,
        completion_pct,
        created_at: c.created_at,
      };
    });
  }, [orgClasses, data.rounds, data.enrollments]);

  const createClass = useCallback(
    (name: string, gradeLabel?: string) => {
      if (!organizationId) throw new Error("No organization");
      const id = uid();
      const t = Date.now();
      setData((prev) => ({
        ...prev,
        classes: [
          ...prev.classes,
          {
            id,
            organization_id: organizationId,
            name,
            grade_label: gradeLabel || null,
            created_at: t,
          },
        ],
      }));
      return id;
    },
    [organizationId],
  );

  const getClassDashboard = useCallback(
    (classId: string, roundId?: string) => {
      const classRow = data.classes.find((c) => c.id === classId);
      if (!classRow) return null;

      const rounds = data.rounds
        .filter((r) => r.class_id === classId)
        .sort((a, b) => a.round_number - b.round_number);
      const activeRound = roundId
        ? rounds.find((r) => r.id === roundId)
        : rounds[rounds.length - 1];

      if (!activeRound) {
        return {
          class: classRow,
          rounds,
          active_round: null,
          stats: null,
          enrollments: [],
          demo_job: null,
          history: data.historyByClass[classId] ?? [],
        };
      }

      const enrollmentData = enrollmentRowsForRound(data, activeRound.id);
      const stats = aggregateClassStats(enrollmentData);
      const demo_job = data.demoJobs.find(
        (j) => j.round_id === activeRound.id && j.class_id === classId,
      );

      return {
        class: classRow,
        rounds,
        active_round: activeRound,
        stats,
        enrollments: enrollmentData.map((e) => ({
          id: e.id,
          student_name: e.student_name,
          email: e.email,
          grade: e.grade,
          hkdse_papers: e.hkdse_papers,
          status: e.status,
          targeted_paper: e.targeted_paper,
          attempts: e.attempts,
          overall_pct:
            e.session && e.session.total_max > 0
              ? (e.session.total_score / e.session.total_max) * 100
              : null,
          overall_band: e.session?.overall_band ?? null,
          session: e.session
            ? {
                total_score: e.session.total_score,
                total_max: e.session.total_max,
                component_scores: e.session.component_scores,
                bands: e.session.bands,
                overall_band: e.session.overall_band,
                section_scores: e.session.section_scores,
                result_summary: e.session.result_summary,
              }
            : null,
        })),
        demo_job,
        history: data.historyByClass[classId] ?? [],
      };
    },
    [data],
  );

  const uploadClassRoster = useCallback(
    (
      classId: string,
      rows: Array<{ name: string; email: string; grade: string; papers: string }>,
    ) => {
      let result = { roundId: "", studentCount: 0, seededCount: 0 };

      setData((prev) => {
        const existingRounds = prev.rounds.filter((r) => r.class_id === classId);
        if (existingRounds.length > 0) {
          throw new Error("This class already has a roster.");
        }

        const roundId = uid();
        const t = Date.now();
        const newRound: LocalRound = {
          id: roundId,
          class_id: classId,
          round_number: 1,
          label: "Initial assessment",
          status: "active",
          created_at: t,
        };

        const newEnrollments: LocalEnrollment[] = rows.map((row) => ({
          id: uid(),
          class_id: classId,
          round_id: roundId,
          student_name: row.name,
          email: row.email,
          grade: row.grade || null,
          hkdse_papers: parsePapersString(row.papers),
          status: "pending" as EnrollmentStatus,
          session: null,
        }));

        const seedCount = Math.floor(newEnrollments.length * 0.3);
        const seeded = newEnrollments.map((e, i) =>
          i < seedCount ? completeEnrollment(e, newRound) : e,
        );

        const stats = aggregateClassStats(
          seeded.map((e) => ({
            id: e.id,
            student_name: e.student_name,
            email: e.email,
            grade: e.grade,
            hkdse_papers: e.hkdse_papers,
            status: e.status,
            session: e.session,
          })),
        );

        const next = {
          ...prev,
          rounds: [...prev.rounds, newRound],
          enrollments: [...prev.enrollments, ...seeded],
        };
        pushHistory(next, classId, buildHistoryPoint(1, newRound.label, t, stats));

        result = { roundId, studentCount: rows.length, seededCount: seedCount };
        return next;
      });

      return result;
    },
    [],
  );

  const uploadTargetedRound = useCallback(
    (
      classId: string,
      rows: Array<{
        name: string;
        email: string;
        grade: string;
        papers: string;
        targeted_paper?: string;
        attempts?: string;
      }>,
    ) => {
      let result = { roundId: "", studentCount: 0 };

      setData((prev) => {
        const rounds = prev.rounds.filter((r) => r.class_id === classId);
        const nextNumber =
          rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1;
        const roundId = uid();
        const t = Date.now();
        const label = `Targeted practice (Round ${nextNumber})`;

        const newRound: LocalRound = {
          id: roundId,
          class_id: classId,
          round_number: nextNumber,
          label,
          status: "active",
          created_at: t,
        };

        const newEnrollments: LocalEnrollment[] = rows.map((row) => {
          const targetedRaw = row.targeted_paper?.trim().toUpperCase();
          const targeted =
            targetedRaw && ["R", "W", "L", "S"].includes(targetedRaw)
              ? (targetedRaw as HkdsePaperId)
              : undefined;
          const attempts = row.attempts ? Number(row.attempts) : undefined;
          const papers = targeted ? [targeted] : parsePapersString(row.papers);
          return {
            id: uid(),
            class_id: classId,
            round_id: roundId,
            student_name: row.name,
            email: row.email,
            grade: row.grade || null,
            hkdse_papers: papers,
            targeted_paper: targeted,
            attempts: attempts && attempts >= 1 ? Math.round(attempts) : undefined,
            status: "pending" as EnrollmentStatus,
            session: null,
          };
        });

        const seedCount = Math.max(1, Math.floor(newEnrollments.length * 0.35));
        const seededEnrollments = newEnrollments.map((e, i) =>
          i < seedCount ? completeEnrollment(e, newRound) : e,
        );

        const stats = aggregateClassStats(
          seededEnrollments.map((e) => ({
            id: e.id,
            student_name: e.student_name,
            email: e.email,
            grade: e.grade,
            hkdse_papers: e.hkdse_papers,
            status: e.status,
            session: e.session,
          })),
        );

        const next = {
          ...prev,
          rounds: [...prev.rounds, newRound],
          enrollments: [...prev.enrollments, ...seededEnrollments],
        };
        pushHistory(next, classId, buildHistoryPoint(nextNumber, label, t, stats));

        result = { roundId, studentCount: rows.length };
        return next;
      });

      return result;
    },
    [],
  );

  const startRemindSimulation = useCallback((classId: string, roundId: string) => {
    setData((prev) => {
      const round = prev.rounds.find((r) => r.id === roundId);
      if (!round) throw new Error("Round not found");

      if (prev.demoJobs.some((j) => j.round_id === roundId && j.status === "running")) {
        throw new Error("Remind simulation already running");
      }

      const pendingIds = prev.enrollments
        .filter((e) => e.round_id === roundId && e.status === "pending")
        .map((e) => e.id);

      const batchCount = 10;
      const delayMs = 3000;
      const perBatch = Math.max(1, Math.ceil(pendingIds.length / batchCount));

      const runBatch = (batchIndex: number, isLast: boolean) => {
        setData((inner) => {
          const currentRound = inner.rounds.find((r) => r.id === roundId);
          if (!currentRound) return inner;

          const start = batchIndex * perBatch;
          const batchIds = pendingIds.slice(start, start + perBatch);

          let enrollments = inner.enrollments.map((e) => {
            if (!batchIds.includes(e.id) || e.status !== "pending") return e;
            return completeEnrollment(
              { ...e, status: "in_progress" as EnrollmentStatus },
              currentRound,
            );
          });

          if (isLast) {
            enrollments = enrollments.map((e) => {
              if (e.round_id !== roundId || e.status !== "pending") return e;
              return completeEnrollment(e, currentRound);
            });
          }

          const enrollmentData = enrollmentRowsForRound({ ...inner, enrollments }, roundId);
          const stats = aggregateClassStats(enrollmentData);
          const next = { ...inner, enrollments };
          pushHistory(
            next,
            classId,
            buildHistoryPoint(currentRound.round_number, currentRound.label, Date.now(), stats),
          );

          if (isLast) {
            next.rounds = next.rounds.map((r) =>
              r.id === roundId ? { ...r, status: "completed" as const } : r,
            );
            next.demoJobs = next.demoJobs.map((j) =>
              j.round_id === roundId ? { ...j, status: "completed" as const } : j,
            );
          }

          return next;
        });
      };

      for (let i = 0; i < batchCount; i++) {
        setTimeout(() => runBatch(i, i === batchCount - 1), i * delayMs);
      }

      return {
        ...prev,
        demoJobs: [
          ...prev.demoJobs.filter((j) => j.round_id !== roundId),
          {
            class_id: classId,
            round_id: roundId,
            status: "running" as const,
            started_at: Date.now(),
          },
        ],
      };
    });
  }, []);

  const exportTargetedPracticeCsv = useCallback(
    (classId: string, roundId: string): string | null => {
      const enrollmentData = enrollmentRowsForRound(data, roundId);
      const stats = aggregateClassStats(enrollmentData);
      if (stats.completed_count === 0) return null;
      const recommendations = computeTargetedPractice(stats);
      return buildTargetedPracticeCsv(stats, recommendations);
    },
    [data],
  );

  const getRoundComparison = useCallback(
    (classId: string) => {
      const rounds = data.rounds
        .filter((r) => r.class_id === classId)
        .sort((a, b) => a.round_number - b.round_number);
      const round1 = rounds.find((r) => r.round_number === 1);
      const round2 = rounds.find((r) => r.round_number >= 2);
      if (!round1) return null;

      const r1Data = enrollmentRowsForRound(data, round1.id);
      const r1Stats = aggregateClassStats(r1Data);

      let round2Stats: ClassStatsSnapshot | null = null;
      let round2Round: LocalRound | null = null;
      if (round2) {
        round2Round = round2;
        round2Stats = aggregateClassStats(enrollmentRowsForRound(data, round2.id));
      }

      const r1ByEmail = new Map(
        r1Stats.enrollments
          .filter((e) => e.status === "completed")
          .map((e) => [e.email.toLowerCase(), e]),
      );
      const r2ByEmail = round2Stats
        ? new Map(
            round2Stats.enrollments
              .filter((e) => e.status === "completed")
              .map((e) => [e.email.toLowerCase(), e]),
          )
        : new Map();

      const studentRows = Array.from(r1ByEmail.entries()).map(([email, r1]) => {
        const r2 = r2ByEmail.get(email);
        const r1Pct = r1.overall_pct;
        const r2Pct = r2?.overall_pct ?? null;
        const delta = r1Pct != null && r2Pct != null ? r2Pct - r1Pct : null;
        return {
          student_name: r1.student_name,
          email: r1.email,
          r1_pct: r1Pct,
          r1_band: r1.overall_band,
          r2_pct: r2Pct,
          r2_band: r2?.overall_band ?? null,
          delta,
        };
      });

      studentRows.sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999));

      return {
        round1: { round: round1, stats: r1Stats },
        round2: round2Round && round2Stats ? { round: round2Round, stats: round2Stats } : null,
        students: studentRows,
      };
    },
    [data],
  );

  const updateEnrollmentPapers = useCallback(
    (enrollmentId: string, papers: HkdsePaperId[]) => {
      setData((prev) => ({
        ...prev,
        enrollments: prev.enrollments.map((e) =>
          e.id === enrollmentId && e.status === "pending"
            ? { ...e, hkdse_papers: papers.length > 0 ? papers : [...ALL_PAPERS] }
            : e,
        ),
      }));
    },
    [],
  );

  return {
    listClasses,
    createClass,
    getClassDashboard,
    uploadClassRoster,
    uploadTargetedRound,
    startRemindSimulation,
    exportTargetedPracticeCsv,
    getRoundComparison,
    updateEnrollmentPapers,
  };
}

export type ClassDashboardView =
  NonNullable<ReturnType<typeof useClassLocalStore>["getClassDashboard"]> extends (
    ...args: never[]
  ) => infer R
    ? R
    : never;

export type ClassStatsView = ClassStatsSnapshot;
