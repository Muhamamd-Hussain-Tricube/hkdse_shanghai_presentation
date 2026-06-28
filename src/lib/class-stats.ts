import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { ALL_PAPERS } from "@/lib/class-sim-grading";
import { escapeCsvCell, papersToCsvString } from "@/lib/class-csv";

export type EnrollmentWithSession = {
  enrollment_id: string;
  student_name: string;
  email: string;
  grade: string | null;
  hkdse_papers: HkdsePaperId[];
  status: string;
  total_score: number;
  total_max: number;
  overall_pct: number;
  overall_band: string;
  component_scores: Record<HkdsePaperId, { score: number; max: number; pct: number }>;
};

export type StatBlock = {
  mean: number;
  median: number;
  min: number;
  max: number;
  count: number;
};

export type ClassStatsSnapshot = {
  completion_pct: number;
  completed_count: number;
  total_count: number;
  pending_count: number;
  in_progress_count: number;
  overall: StatBlock;
  per_paper: Record<HkdsePaperId, StatBlock>;
  band_distribution: Record<string, number>;
  enrollments: EnrollmentWithSession[];
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function statBlock(values: number[]): StatBlock {
  if (values.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, count: 0 };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    mean: sum / values.length,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

export function aggregateClassStats(
  enrollments: Array<{
    id: string;
    student_name: string;
    email: string;
    grade: string | null;
    hkdse_papers: HkdsePaperId[];
    status: string;
    session?: {
      total_score: number;
      total_max: number;
      component_scores: Record<HkdsePaperId, { score: number; max: number; pct: number }>;
      overall_band: string | null;
    } | null;
  }>,
): ClassStatsSnapshot {
  const total_count = enrollments.length;
  const completed = enrollments.filter((e) => e.status === "completed");
  const pending_count = enrollments.filter((e) => e.status === "pending").length;
  const in_progress_count = enrollments.filter((e) => e.status === "in_progress").length;
  const completed_count = completed.length;
  const completion_pct = total_count > 0 ? (completed_count / total_count) * 100 : 0;

  const overallPcts = completed
    .filter((e) => e.session && e.session.total_max > 0)
    .map((e) => (e.session!.total_score / e.session!.total_max) * 100);

  const per_paper = {} as Record<HkdsePaperId, StatBlock>;
  for (const paper of ALL_PAPERS) {
    const pcts = completed
      .filter((e) => e.session?.component_scores?.[paper])
      .map((e) => e.session!.component_scores[paper].pct);
    per_paper[paper] = statBlock(pcts);
  }

  const band_distribution: Record<string, number> = {};
  for (const e of completed) {
    const band = e.session?.overall_band ?? "Unknown";
    band_distribution[band] = (band_distribution[band] ?? 0) + 1;
  }

  const enrollmentRows: EnrollmentWithSession[] = enrollments.map((e) => {
    const session = e.session;
    const overall_pct =
      session && session.total_max > 0 ? (session.total_score / session.total_max) * 100 : 0;
    return {
      enrollment_id: e.id,
      student_name: e.student_name,
      email: e.email,
      grade: e.grade,
      hkdse_papers: e.hkdse_papers,
      status: e.status,
      total_score: session?.total_score ?? 0,
      total_max: session?.total_max ?? 0,
      overall_pct,
      overall_band: session?.overall_band ?? "",
      component_scores:
        session?.component_scores ??
        ({} as Record<HkdsePaperId, { score: number; max: number; pct: number }>),
    };
  });

  return {
    completion_pct,
    completed_count,
    total_count,
    pending_count,
    in_progress_count,
    overall: statBlock(overallPcts),
    per_paper,
    band_distribution,
    enrollments: enrollmentRows,
  };
}

export type TargetedRecommendation = {
  email: string;
  targeted_paper: HkdsePaperId;
  attempts: number;
  round_1_band: string;
  round_1_pct: number;
};

export function computeTargetedPractice(stats: ClassStatsSnapshot): TargetedRecommendation[] {
  const completed = stats.enrollments.filter((e) => e.status === "completed");
  if (completed.length === 0) return [];

  const medians: Record<HkdsePaperId, number> = {} as Record<HkdsePaperId, number>;
  for (const paper of ALL_PAPERS) {
    medians[paper] = stats.per_paper[paper].median;
  }

  return completed.map((e) => {
    const papers = e.hkdse_papers.length > 0 ? e.hkdse_papers : [...ALL_PAPERS];

    let bestPaper: HkdsePaperId = papers[0];
    let bestGap = -1;
    let weakestPct = 100;

    for (const paper of papers) {
      const cs = e.component_scores[paper];
      const pct = cs?.pct ?? 0;
      const gap = medians[paper] - pct;
      if (gap > bestGap) {
        bestGap = gap;
        bestPaper = paper;
      }
      if (pct < weakestPct) {
        weakestPct = pct;
      }
    }

    if (bestGap < 8) {
      for (const paper of papers) {
        const cs = e.component_scores[paper];
        const pct = cs?.pct ?? 0;
        if (pct < weakestPct) {
          weakestPct = pct;
          bestPaper = paper;
        }
      }
      bestGap = medians[bestPaper] - weakestPct;
    }

    const gap = Math.max(0, bestGap);
    const attempts = Math.min(5, Math.max(1, Math.round(gap / 12)));

    return {
      email: e.email,
      targeted_paper: bestPaper,
      attempts,
      round_1_band: e.overall_band.replace("Band ", ""),
      round_1_pct: Math.round(e.overall_pct),
    };
  });
}

export function buildTargetedPracticeCsv(
  stats: ClassStatsSnapshot,
  recommendations: TargetedRecommendation[],
): string {
  const recByEmail = new Map(recommendations.map((r) => [r.email, r]));
  const header = "name,email,grade,papers,targeted_paper,attempts,round_1_band,round_1_pct";
  const lines = stats.enrollments
    .filter((e) => e.status === "completed")
    .map((e) => {
      const rec = recByEmail.get(e.email);
      if (!rec) return null;
      return [
        escapeCsvCell(e.student_name),
        escapeCsvCell(e.email),
        escapeCsvCell(e.grade ?? ""),
        escapeCsvCell(papersToCsvString(e.hkdse_papers)),
        rec.targeted_paper,
        String(rec.attempts),
        escapeCsvCell(rec.round_1_band),
        String(rec.round_1_pct),
      ].join(",");
    })
    .filter(Boolean);

  return [header, ...lines].join("\n");
}

export function buildHistoryPoint(
  roundNumber: number,
  label: string,
  snapshotAt: number,
  stats: ClassStatsSnapshot,
): {
  round_number: number;
  label: string;
  snapshot_at: number;
  median_pct: number;
  mean_pct: number;
  per_paper_median: Record<HkdsePaperId, number>;
} {
  const per_paper_median = {} as Record<HkdsePaperId, number>;
  for (const paper of ALL_PAPERS) {
    per_paper_median[paper] = stats.per_paper[paper].median;
  }
  return {
    round_number: roundNumber,
    label,
    snapshot_at: snapshotAt,
    median_pct: stats.overall.median,
    mean_pct: stats.overall.mean,
    per_paper_median,
  };
}
