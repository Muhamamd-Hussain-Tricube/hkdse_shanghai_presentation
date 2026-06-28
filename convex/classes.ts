/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { HkdsePaperId } from "./lib/class_sim_grading";
import { ALL_PAPERS, generateSimSession } from "./lib/class_sim_grading";
import {
  aggregateClassStats,
  buildHistoryPoint,
  buildTargetedPracticeCsv,
  computeTargetedPractice,
  type ClassStatsSnapshot,
} from "./lib/class_stats";
import { parseRosterRows, parseTargetedRows, type ClassCsvRow } from "./lib/class_csv";

const hkdsePaperId = v.union(v.literal("R"), v.literal("W"), v.literal("L"), v.literal("S"));

const now = () => Date.now();

function publicRow<T extends { _id: Id<any> }>(row: T) {
  return { ...row, id: row._id };
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

async function requireClassAccess(ctx: any, classId: Id<"classes">) {
  const user = await requireUser(ctx);
  const classRow = await ctx.db.get(classId);
  if (!classRow) throw new Error("Class not found");
  await requireOrgMember(ctx, classRow.organization_id, user._id);
  return { user, classRow };
}

async function loadRoundEnrollmentsWithSessions(
  ctx: any,
  classId: Id<"classes">,
  roundId: Id<"class_rounds">,
) {
  const enrollments = await ctx.db
    .query("class_enrollments")
    .withIndex("by_round", (q: any) => q.eq("round_id", roundId))
    .collect();

  const sessions = await ctx.db
    .query("class_sim_sessions")
    .withIndex("by_round", (q: any) => q.eq("round_id", roundId))
    .collect();

  const sessionByEnrollment = new Map(
    sessions.map((s: Doc<"class_sim_sessions">) => [s.enrollment_id, s]),
  );

  return enrollments.map((e: Doc<"class_enrollments">) => {
    const session = sessionByEnrollment.get(e._id);
    return {
      id: e._id,
      student_name: e.student_name,
      email: e.email,
      grade: e.grade,
      hkdse_papers: (e.hkdse_papers ?? ALL_PAPERS) as HkdsePaperId[],
      status: e.status,
      targeted_paper: e.targeted_paper,
      attempts: e.attempts,
      session: session
        ? {
            total_score: session.total_score,
            total_max: session.total_max,
            component_scores: session.component_scores as Record<
              HkdsePaperId,
              { score: number; max: number; pct: number }
            >,
            overall_band: session.overall_band,
          }
        : null,
    };
  });
}

async function saveSnapshot(
  ctx: any,
  classId: Id<"classes">,
  roundId: Id<"class_rounds">,
  roundNumber: number,
  label: string,
  stats: ClassStatsSnapshot,
) {
  const t = now();
  const historyPoint = buildHistoryPoint(roundNumber, label, t, stats);
  const existing = await ctx.db
    .query("class_stat_snapshots")
    .withIndex("by_round", (q: any) => q.eq("round_id", roundId))
    .collect();

  const snapshotPayload = {
    ...stats,
    history_point: historyPoint,
  };

  if (existing.length > 0) {
    await ctx.db.patch(existing[existing.length - 1]._id, {
      snapshot_at: t,
      stats: snapshotPayload,
    });
  } else {
    await ctx.db.insert("class_stat_snapshots", {
      class_id: classId,
      round_id: roundId,
      snapshot_at: t,
      stats: snapshotPayload,
    });
  }
}

async function completeEnrollment(
  ctx: any,
  enrollment: Doc<"class_enrollments">,
  round: Doc<"class_rounds">,
) {
  const papers = (enrollment.hkdse_papers ?? ALL_PAPERS) as HkdsePaperId[];
  const result = generateSimSession(
    enrollment.email,
    papers,
    round.round_number,
    enrollment.targeted_paper as HkdsePaperId | undefined,
  );

  const existing = await ctx.db
    .query("class_sim_sessions")
    .withIndex("by_enrollment", (q: any) => q.eq("enrollment_id", enrollment._id))
    .first();

  const t = now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      total_score: result.total_score,
      total_max: result.total_max,
      component_scores: result.component_scores,
      bands: result.bands,
      overall_band: result.overall_band,
      graded_at: t,
    });
  } else {
    await ctx.db.insert("class_sim_sessions", {
      enrollment_id: enrollment._id,
      round_id: enrollment.round_id,
      class_id: enrollment.class_id,
      total_score: result.total_score,
      total_max: result.total_max,
      component_scores: result.component_scores,
      bands: result.bands,
      overall_band: result.overall_band,
      graded_at: t,
      created_at: t,
    });
  }

  await ctx.db.patch(enrollment._id, {
    status: "completed",
    updated_at: t,
  });
}

export const createClass = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    gradeLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOrgMember(ctx, args.organizationId, user._id);
    const t = now();
    const classId = await ctx.db.insert("classes", {
      organization_id: args.organizationId,
      name: args.name.trim(),
      grade_label: args.gradeLabel?.trim() || null,
      status: "active",
      created_by: user._id,
      created_at: t,
      updated_at: t,
    });
    return { classId };
  },
});

export const listClasses = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOrgMember(ctx, args.organizationId, user._id);

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_org", (q) => q.eq("organization_id", args.organizationId))
      .collect();

    const result = await Promise.all(
      classes.map(async (c) => {
        const rounds = await ctx.db
          .query("class_rounds")
          .withIndex("by_class", (q) => q.eq("class_id", c._id))
          .collect();
        const latestRound = rounds.sort((a, b) => b.round_number - a.round_number)[0];

        let completion_pct = 0;
        let student_count = 0;
        if (latestRound) {
          const enrollments = await ctx.db
            .query("class_enrollments")
            .withIndex("by_round", (q) => q.eq("round_id", latestRound._id))
            .collect();
          student_count = enrollments.length;
          const completed = enrollments.filter((e) => e.status === "completed").length;
          completion_pct = student_count > 0 ? (completed / student_count) * 100 : 0;
        }

        return {
          ...publicRow(c),
          student_count,
          latest_round: latestRound ? publicRow(latestRound) : null,
          completion_pct,
        };
      }),
    );

    return result.sort((a, b) => b.created_at - a.created_at);
  },
});

export const classDashboard = query({
  args: {
    classId: v.id("classes"),
    roundId: v.optional(v.id("class_rounds")),
  },
  handler: async (ctx, args) => {
    const { classRow } = await requireClassAccess(ctx, args.classId);

    const rounds = await ctx.db
      .query("class_rounds")
      .withIndex("by_class", (q) => q.eq("class_id", args.classId))
      .collect();

    const sortedRounds = rounds.sort((a, b) => a.round_number - b.round_number);
    const activeRound = args.roundId
      ? rounds.find((r) => r._id === args.roundId)
      : sortedRounds[sortedRounds.length - 1];

    if (!activeRound) {
      return {
        class: publicRow(classRow),
        rounds: sortedRounds.map(publicRow),
        active_round: null,
        stats: null,
        enrollments: [],
        demo_job: null,
        history: [],
      };
    }

    const enrollmentData = await loadRoundEnrollmentsWithSessions(
      ctx,
      args.classId,
      activeRound._id,
    );
    const stats = aggregateClassStats(enrollmentData);

    const demoJobs = await ctx.db
      .query("class_demo_jobs")
      .withIndex("by_round", (q) => q.eq("round_id", activeRound._id))
      .collect();
    const demo_job = demoJobs.sort((a, b) => b.started_at - a.started_at)[0];

    const snapshots = await ctx.db
      .query("class_stat_snapshots")
      .withIndex("by_class", (q) => q.eq("class_id", args.classId))
      .collect();

    const history = sortedRounds.map((r) => {
      const snap = snapshots.find((s) => s.round_id === r._id);
      const hp = snap?.stats?.history_point;
      return (
        hp ?? {
          round_number: r.round_number,
          label: r.label,
          snapshot_at: r.created_at,
          median_pct: 0,
          mean_pct: 0,
          per_paper_median: { R: 0, W: 0, L: 0, S: 0 },
        }
      );
    });

    return {
      class: publicRow(classRow),
      rounds: sortedRounds.map(publicRow),
      active_round: publicRow(activeRound),
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
      })),
      demo_job: demo_job ? publicRow(demo_job) : null,
      history,
    };
  },
});

export const uploadClassRoster = mutation({
  args: {
    classId: v.id("classes"),
    rows: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        grade: v.string(),
        papers: v.string(),
      }),
    ),
    roundLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { classRow } = await requireClassAccess(ctx, args.classId);
    const parsed = parseRosterRows(args.rows);
    if (!parsed.ok) throw new Error(parsed.errors.join("; "));

    const existingRounds = await ctx.db
      .query("class_rounds")
      .withIndex("by_class", (q) => q.eq("class_id", args.classId))
      .collect();

    if (existingRounds.length > 0) {
      throw new Error("This class already has a roster. Create a new class or upload Round 2 CSV.");
    }

    const t = now();
    const roundId = await ctx.db.insert("class_rounds", {
      class_id: args.classId,
      round_number: 1,
      label: args.roundLabel?.trim() || "Initial assessment",
      status: "active",
      created_at: t,
    });

    for (const row of parsed.rows) {
      await ctx.db.insert("class_enrollments", {
        class_id: args.classId,
        round_id: roundId,
        student_name: row.name,
        email: row.email,
        grade: row.grade || null,
        hkdse_papers: row.papers,
        status: "pending",
        created_at: t,
        updated_at: t,
      });
    }

    await ctx.db.patch(args.classId, { updated_at: t });

    // Seed ~30% completion for demo presentation
    const enrollments = await ctx.db
      .query("class_enrollments")
      .withIndex("by_round", (q) => q.eq("round_id", roundId))
      .collect();
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");

    const seedCount = Math.floor(enrollments.length * 0.3);
    const toSeed = enrollments.slice(0, seedCount);
    for (const e of toSeed) {
      await completeEnrollment(ctx, e, round);
    }

    const enrollmentData = await loadRoundEnrollmentsWithSessions(ctx, args.classId, roundId);
    const stats = aggregateClassStats(enrollmentData);
    await saveSnapshot(ctx, args.classId, roundId, 1, round.label, stats);

    return {
      roundId,
      studentCount: parsed.rows.length,
      seededCount: seedCount,
    };
  },
});

export const uploadTargetedRound = mutation({
  args: {
    classId: v.id("classes"),
    rows: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        grade: v.string(),
        papers: v.string(),
        targeted_paper: v.optional(v.string()),
        attempts: v.optional(v.string()),
        round_1_band: v.optional(v.string()),
        round_1_pct: v.optional(v.string()),
      }),
    ),
    roundLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireClassAccess(ctx, args.classId);
    const parsed = parseTargetedRows(args.rows);
    if (!parsed.ok) throw new Error(parsed.errors.join("; "));

    const rounds = await ctx.db
      .query("class_rounds")
      .withIndex("by_class", (q) => q.eq("class_id", args.classId))
      .collect();
    const nextNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1;

    const t = now();
    const roundId = await ctx.db.insert("class_rounds", {
      class_id: args.classId,
      round_number: nextNumber,
      label: args.roundLabel?.trim() || `Targeted practice (Round ${nextNumber})`,
      status: "active",
      created_at: t,
    });

    for (const row of parsed.rows) {
      await ctx.db.insert("class_enrollments", {
        class_id: args.classId,
        round_id: roundId,
        student_name: row.name,
        email: row.email,
        grade: row.grade || null,
        hkdse_papers: row.papers,
        targeted_paper: row.targeted_paper,
        attempts: row.attempts,
        status: "pending",
        created_at: t,
        updated_at: t,
      });
    }

    await ctx.db.patch(args.classId, { updated_at: t });

    const enrollmentData = await loadRoundEnrollmentsWithSessions(ctx, args.classId, roundId);
    const stats = aggregateClassStats(enrollmentData);
    const round = await ctx.db.get(roundId);
    await saveSnapshot(
      ctx,
      args.classId,
      roundId,
      nextNumber,
      round?.label ?? `Round ${nextNumber}`,
      stats,
    );

    return { roundId, studentCount: parsed.rows.length };
  },
});

export const startRemindSimulation = mutation({
  args: {
    classId: v.id("classes"),
    roundId: v.id("class_rounds"),
  },
  handler: async (ctx, args) => {
    await requireClassAccess(ctx, args.classId);

    const running = await ctx.db
      .query("class_demo_jobs")
      .withIndex("by_round", (q) => q.eq("round_id", args.roundId))
      .collect();
    if (running.some((j) => j.status === "running")) {
      throw new Error("A remind simulation is already running");
    }

    const t = now();
    const jobId = await ctx.db.insert("class_demo_jobs", {
      class_id: args.classId,
      round_id: args.roundId,
      type: "remind_simulation",
      status: "running",
      target_pct: 100,
      started_at: t,
    });

    const pending = await ctx.db
      .query("class_enrollments")
      .withIndex("by_round", (q) => q.eq("round_id", args.roundId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const batchCount = 10;
    const delayMs = 3000;
    const perBatch = Math.max(1, Math.ceil(pending.length / batchCount));

    for (let i = 0; i < batchCount; i++) {
      await ctx.scheduler.runAfter(i * delayMs, internal.classes.remindSimulationBatch, {
        jobId,
        classId: args.classId,
        roundId: args.roundId,
        batchIndex: i,
        perBatch,
        isLast: i === batchCount - 1,
      });
    }

    return { jobId, pendingCount: pending.length };
  },
});

export const remindSimulationBatch = internalMutation({
  args: {
    jobId: v.id("class_demo_jobs"),
    classId: v.id("classes"),
    roundId: v.id("class_rounds"),
    batchIndex: v.number(),
    perBatch: v.number(),
    isLast: v.boolean(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "running") return;

    const round = await ctx.db.get(args.roundId);
    if (!round) return;

    const pending = await ctx.db
      .query("class_enrollments")
      .withIndex("by_round", (q) => q.eq("round_id", args.roundId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const start = args.batchIndex * args.perBatch;
    const batch = pending.slice(start, start + args.perBatch);

    for (const enrollment of batch) {
      await ctx.db.patch(enrollment._id, { status: "in_progress", updated_at: now() });
      await completeEnrollment(ctx, enrollment, round);
    }

    const enrollmentData = await loadRoundEnrollmentsWithSessions(ctx, args.classId, args.roundId);
    const stats = aggregateClassStats(enrollmentData);
    await saveSnapshot(ctx, args.classId, args.roundId, round.round_number, round.label, stats);

    if (args.isLast) {
      const stillPending = await ctx.db
        .query("class_enrollments")
        .withIndex("by_round", (q) => q.eq("round_id", args.roundId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      for (const e of stillPending) {
        await completeEnrollment(ctx, e, round);
      }

      const finalData = await loadRoundEnrollmentsWithSessions(ctx, args.classId, args.roundId);
      const finalStats = aggregateClassStats(finalData);
      await saveSnapshot(
        ctx,
        args.classId,
        args.roundId,
        round.round_number,
        round.label,
        finalStats,
      );

      await ctx.db.patch(args.roundId, { status: "completed" });
      await ctx.db.patch(args.jobId, {
        status: "completed",
        completed_at: now(),
      });
    }
  },
});

export const exportTargetedPracticeCsv = query({
  args: {
    classId: v.id("classes"),
    roundId: v.id("class_rounds"),
  },
  handler: async (ctx, args) => {
    await requireClassAccess(ctx, args.classId);

    const enrollmentData = await loadRoundEnrollmentsWithSessions(ctx, args.classId, args.roundId);
    const stats = aggregateClassStats(enrollmentData);
    const recommendations = computeTargetedPractice(stats);
    return buildTargetedPracticeCsv(stats, recommendations);
  },
});
