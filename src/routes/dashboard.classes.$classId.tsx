import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ClassCompletionRing } from "@/components/class/ClassCompletionRing";
import { ClassStudentGrid } from "@/components/class/ClassStudentGrid";
import {
  ClassStudentReviewDialog,
  type ClassStudentReviewData,
} from "@/components/class/ClassStudentReviewDialog";
import { ClassStatCards } from "@/components/class/ClassStatCards";
import { ClassScoreChart, type HistoryPoint } from "@/components/class/ClassScoreChart";
import { ClassRoundCompare } from "@/components/class/ClassRoundCompare";
import { ClassPaperEditor } from "@/components/class/ClassPaperEditor";
import { CsvUploadZone } from "@/components/class/CsvUploadZone";
import { HKDSE_PAPER_META, type HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { parseRosterCsv, parseTargetedCsv } from "@/lib/class-csv";
import { useClassLocalStore } from "@/lib/class-local-store";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/dashboard/classes/$classId")({
  component: ClassDetailPage,
});

type Tab = "roster" | "progress" | "analytics" | "history" | "compare";

const bandChartConfig = {
  count: { label: "Students", color: "oklch(0.27 0.06 255)" },
};

function ClassDetailPage() {
  const { activeOrgId } = useAuth();
  const { classId } = Route.useParams();
  return (
    <ClassDetailPageInner
      orgId={activeOrgId ?? "local-demo"}
      classId={classId}
      listPath="/dashboard/classes"
    />
  );
}

export function ClassDetailPageInner({
  orgId,
  classId,
  listPath,
  standalone = false,
}: {
  orgId: string;
  classId: string;
  listPath: string;
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const {
    getClassDashboard,
    uploadClassRoster,
    uploadTargetedRound,
    startRemindSimulation,
    exportTargetedPracticeCsv,
    getRoundComparison,
    updateEnrollmentPapers,
  } = useClassLocalStore(orgId);

  const [tab, setTab] = useState<Tab>("roster");
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>();
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, string>>>([]);
  const [csvRawRows, setCsvRawRows] = useState<Array<{
    name: string;
    email: string;
    grade: string;
    papers: string;
  }> | null>(null);
  const [targetedRawRows, setTargetedRawRows] = useState<Array<{
    name: string;
    email: string;
    grade: string;
    papers: string;
    targeted_paper?: string;
    attempts?: string;
    round_1_band?: string;
    round_1_pct?: string;
  }> | null>(null);
  const [uploadMode, setUploadMode] = useState<"roster" | "targeted">("roster");
  const [dispatching, setDispatching] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [reviewStudent, setReviewStudent] = useState<ClassStudentReviewData | null>(null);

  const dashboard = useMemo(
    () => getClassDashboard(classId, selectedRoundId),
    [getClassDashboard, classId, selectedRoundId],
  );

  const activeRound = dashboard?.active_round;
  const stats = dashboard?.stats;
  const enrollments = dashboard?.enrollments ?? [];
  const hasRoster = (dashboard?.rounds?.length ?? 0) > 0;
  const isRemindRunning = dashboard?.demo_job?.status === "running";

  const bandChartData = useMemo(() => {
    if (!stats?.band_distribution) return [];
    return Object.entries(stats.band_distribution).map(([band, count]) => ({
      band,
      count,
    }));
  }, [stats]);

  const handleRosterCsv = (text: string) => {
    const parsed = parseRosterCsv(text);
    if (!parsed.ok) {
      toast.error(parsed.errors.join("; "));
      return;
    }
    setCsvRawRows(parsed.rawRows);
    setCsvPreview(
      parsed.rawRows.slice(0, 5).map((r) => ({
        name: r.name,
        email: r.email,
        grade: r.grade,
        papers: r.papers,
      })),
    );
    setUploadMode("roster");
  };

  const handleTargetedCsv = (text: string) => {
    const parsed = parseTargetedCsv(text);
    if (!parsed.ok) {
      toast.error(parsed.errors.join("; "));
      return;
    }
    setTargetedRawRows(parsed.rawRows);
    setCsvPreview(
      parsed.rawRows.slice(0, 5).map((r) => ({
        name: r.name,
        email: r.email,
        grade: r.grade,
        papers: r.papers,
        targeted_paper: r.targeted_paper ?? "",
        attempts: r.attempts ?? "",
      })),
    );
    setUploadMode("targeted");
  };

  const handleDispatch = () => {
    if (!csvRawRows && !targetedRawRows) return;
    setDispatching(true);
    try {
      if (uploadMode === "roster" && csvRawRows) {
        const result = uploadClassRoster(classId, csvRawRows);
        toast.success(
          t("classes.dispatchSuccess", {
            count: result.studentCount,
            seeded: result.seededCount,
          }),
        );
        setTab("progress");
      } else if (uploadMode === "targeted" && targetedRawRows) {
        const result = uploadTargetedRound(classId, targetedRawRows);
        toast.success(t("classes.round2Success", { count: result.studentCount }));
        setSelectedRoundId(result.roundId);
        setTab("progress");
      }
      setCsvRawRows(null);
      setTargetedRawRows(null);
      setCsvPreview([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  };

  const handleRemind = () => {
    if (!activeRound) return;
    setReminding(true);
    try {
      startRemindSimulation(classId, activeRound.id);
      toast.success(t("classes.remindStarted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remind failed");
    } finally {
      setReminding(false);
    }
  };

  const handleExportCsv = () => {
    if (!activeRound) return;
    const csv = exportTargetedPracticeCsv(classId, activeRound.id);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `targeted-practice-${classId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("classes.exportSuccess"));
  };

  const downloadSampleRoster = async () => {
    try {
      const res = await fetch("/demo-class-roster-30.csv");
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "demo-class-roster-30.csv";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* fallback below */
    }
    const sample = `name,email,grade,papers\nAmy Chan,amy.chan@demo.hk,Form 5,all\nBen Lee,ben.lee@demo.hk,Form 5,R`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-class-roster.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!dashboard) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <p>{t("classes.notFound")}</p>
        <Link to={listPath} className="mt-4 text-primary hover:underline">
          {t("classes.backToList")}
        </Link>
      </div>
    );
  }

  const comparison = useMemo(() => getRoundComparison(classId), [getRoundComparison, classId]);

  const round1 = dashboard.rounds?.find((r) => r.round_number === 1);
  const round1Enrollments = useMemo(() => {
    if (!round1) return [];
    return getClassDashboard(classId, round1.id)?.enrollments ?? [];
  }, [round1, classId, getClassDashboard]);
  const canStartRound2 =
    round1 && stats && stats.completed_count >= 1 && dashboard.rounds.length === 1;
  const canExport = Boolean(activeRound && stats && stats.completed_count > 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "roster", label: t("classes.tabRoster") },
    { id: "progress", label: t("classes.tabProgress") },
    { id: "analytics", label: t("classes.tabAnalytics") },
    { id: "compare", label: t("classes.tabCompare") },
    { id: "history", label: t("classes.tabHistory") },
  ];

  const round2UploadBlock =
    canStartRound2 ? (
      <div className="rounded-lg border border-border bg-primary-muted/30 p-5">
        <h3 className="font-display text-lg text-foreground">{t("classes.round2Title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("classes.round2Hint")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("classes.round2ReuploadHint")}</p>
        <div className="mt-4">
          <CsvUploadZone hint={t("classes.round2CsvHint")} onFileParsed={handleTargetedCsv} />
          {targetedRawRows && (
            <Button className="mt-4" onClick={handleDispatch} disabled={dispatching}>
              {dispatching
                ? t("classes.dispatching")
                : t("classes.dispatchRound2", { count: targetedRawRows.length })}
            </Button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {standalone && (
        <header className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              {t("classes.localDemoBadge")}
            </span>
          </div>
        </header>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={listPath} className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("classes.backToList")}
          </Link>
          <h1 className="mt-2 font-display text-3xl text-foreground">{dashboard.class.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dashboard.class.grade_label && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {dashboard.class.grade_label}
              </span>
            )}
            {activeRound && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Round {activeRound.round_number} · {activeRound.label}
              </span>
            )}
          </div>
        </div>
        {dashboard.rounds.length > 1 && (
          <select
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm"
            value={selectedRoundId ?? activeRound?.id ?? ""}
            onChange={(e) => setSelectedRoundId(e.target.value || undefined)}
          >
            {dashboard.rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number}: {r.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "roster" && (
        <div className="space-y-6">
          {!hasRoster ? (
            <>
              <CsvUploadZone
                hint={t("classes.csvHint")}
                sampleLabel={t("classes.downloadSample30")}
                onSampleDownload={downloadSampleRoster}
                onFileParsed={handleRosterCsv}
              />
              {csvPreview.length > 0 && <PreviewTable rows={csvPreview} />}
              {csvRawRows && (
                <Button onClick={handleDispatch} disabled={dispatching}>
                  {dispatching
                    ? t("classes.dispatching")
                    : t("classes.dispatch", { count: csvRawRows.length })}
                </Button>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
              <p className="text-sm text-muted-foreground">{t("classes.rosterExists")}</p>
              <Button className="mt-4" variant="outline" onClick={() => setTab("progress")}>
                {t("classes.viewProgress")}
              </Button>
              {round1 && (
                <ClassPaperEditor
                  enrollments={round1Enrollments}
                  onUpdatePapers={(id, papers) => updateEnrollmentPapers(id, papers)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-6">
          {!hasRoster ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              {t("classes.uploadFirst")}
            </div>
          ) : (
            <>
              {isRemindRunning && (
                <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
                  {t("classes.remindBanner")}
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-6 shadow-soft">
                  <ClassCompletionRing
                    pct={stats?.completion_pct ?? 0}
                    completed={stats?.completed_count ?? 0}
                    total={stats?.total_count ?? 0}
                    label={t("classes.complete")}
                  />
                  <div className="mt-4 w-full">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-accent transition-all duration-700 ease-out"
                        style={{ width: `${stats?.completion_pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-6 w-full border-accent text-accent-foreground"
                    variant="outline"
                    disabled={
                      reminding ||
                      isRemindRunning ||
                      !stats ||
                      stats.completed_count >= stats.total_count
                    }
                    onClick={handleRemind}
                  >
                    {reminding || isRemindRunning ? t("classes.reminding") : t("classes.remind")}
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t("classes.remindHint")}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
                  <h3 className="font-display text-lg text-foreground">
                    {t("classes.studentGrid")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("classes.clickStudentReview")}
                  </p>
                  <div className="mt-4">
                    <ClassStudentGrid
                      students={enrollments}
                      onStudentClick={(tile) => {
                        const full = enrollments.find((e) => e.id === tile.id);
                        if (full) setReviewStudent(full as ClassStudentReviewData);
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-8">
          {!stats || stats.completed_count === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              {t("classes.analyticsEmpty")}
            </div>
          ) : (
            <>
              <ClassStatCards title={t("classes.overallStats")} stats={stats.overall} />
              <div className="grid gap-4 md:grid-cols-2">
                {HKDSE_PAPER_META.map((paper) => (
                  <div
                    key={paper.id}
                    className="rounded-lg border border-border bg-surface p-4 shadow-soft"
                  >
                    <ClassStatCards
                      title={paper.title}
                      stats={stats.per_paper[paper.id as HkdsePaperId]}
                    />
                  </div>
                ))}
              </div>
              {bandChartData.length > 0 && (
                <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
                  <h3 className="font-display text-lg text-foreground">{t("classes.bandDist")}</h3>
                  <ChartContainer config={bandChartConfig} className="mt-4 h-[200px] w-full">
                    <BarChart data={bandChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="band" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExportCsv} disabled={!canExport}>
                  {t("classes.exportTargeted")}
                </Button>
              </div>
              {round2UploadBlock}
            </>
          )}
        </div>
      )}

      {tab === "compare" && <ClassRoundCompare comparison={comparison} />}

      {tab === "history" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
            <h3 className="font-display text-lg text-foreground">{t("classes.scoreOverTime")}</h3>
            <div className="mt-4">
              <ClassScoreChart history={(dashboard.history ?? []) as HistoryPoint[]} />
            </div>
          </div>
          {round2UploadBlock}
          {dashboard.rounds.map((r) => {
            const hp = (dashboard.history ?? []).find((h) => h.round_number === r.round_number);
            if (!hp) return null;
            return (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-soft"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Round {r.round_number}
                </p>
                <p className="font-display text-xl text-foreground">{r.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Median {Math.round(hp.median_pct)}% · Mean {Math.round(hp.mean_pct)}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      <ClassStudentReviewDialog
        student={reviewStudent}
        open={reviewStudent != null}
        onOpenChange={(open) => !open && setReviewStudent(null)}
      />
    </div>
  );
}

function PreviewTable({ rows }: { rows: Array<Record<string, string>> }) {
  const keys = Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 text-foreground">
                  {row[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
