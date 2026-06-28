import { useTranslation } from "react-i18next";
import type { ClassStatsSnapshot } from "@/lib/class-stats";
import { HKDSE_PAPER_META, type HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { ClassStatCards } from "@/components/class/ClassStatCards";
import type { LocalRound } from "@/lib/class-local-store";

type ComparisonData = {
  round1: { round: LocalRound; stats: ClassStatsSnapshot };
  round2: { round: LocalRound; stats: ClassStatsSnapshot } | null;
  students: Array<{
    student_name: string;
    email: string;
    r1_pct: number | null;
    r1_band: string | null;
    r2_pct: number | null;
    r2_band: string | null;
    delta: number | null;
  }>;
};

export function ClassRoundCompare({ comparison }: { comparison: ComparisonData | null }) {
  const { t } = useTranslation();

  if (!comparison) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {t("classes.compareEmpty")}
      </div>
    );
  }

  const { round1, round2, students } = comparison;

  if (!round2) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {t("classes.compareNeedRound2")}
      </div>
    );
  }

  const r1Overall = round1.stats.overall;
  const r2Overall = round2.stats.overall;
  const medianDelta = r2Overall.median - r1Overall.median;
  const meanDelta = r2Overall.mean - r1Overall.mean;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Round {round1.round.round_number}
          </p>
          <p className="font-display text-lg text-foreground">{round1.round.label}</p>
          <ClassStatCards title={t("classes.overallStats")} stats={r1Overall} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Round {round2.round.round_number}
          </p>
          <p className="font-display text-lg text-foreground">{round2.round.label}</p>
          <ClassStatCards title={t("classes.overallStats")} stats={r2Overall} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-primary-muted/20 p-4 text-sm">
        <span className="font-medium text-foreground">{t("classes.compareDelta")}: </span>
        <span className="text-muted-foreground">
          Median {medianDelta >= 0 ? "+" : ""}
          {medianDelta.toFixed(1)}% · Mean {meanDelta >= 0 ? "+" : ""}
          {meanDelta.toFixed(1)}%
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {HKDSE_PAPER_META.map((paper) => {
          const r1 = round1.stats.per_paper[paper.id as HkdsePaperId];
          const r2 = round2.stats.per_paper[paper.id as HkdsePaperId];
          const delta = r2.median - r1.median;
          return (
            <div
              key={paper.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-soft"
            >
              <p className="text-xs font-medium text-muted-foreground">{paper.shortLabel}</p>
              <div className="mt-2 flex justify-between text-sm">
                <span>R1: {r1.median.toFixed(0)}%</span>
                <span>R2: {r2.median.toFixed(0)}%</span>
              </div>
              <p
                className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h3 className="font-display text-lg text-foreground">{t("classes.compareStudents")}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">{t("classes.compareColName")}</th>
                <th className="py-2 pr-4">{t("classes.compareColR1")}</th>
                <th className="py-2 pr-4">{t("classes.compareColR2")}</th>
                <th className="py-2">{t("classes.compareColDelta")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((row) => (
                <tr key={row.email} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium text-foreground">{row.student_name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.r1_pct != null ? `${row.r1_pct.toFixed(0)}% (${row.r1_band})` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.r2_pct != null ? `${row.r2_pct.toFixed(0)}% (${row.r2_band})` : "—"}
                  </td>
                  <td
                    className={`py-2 font-medium ${(row.delta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {row.delta != null ? `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
