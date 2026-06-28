/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ReportView, type ReportPayload } from "@/components/ReportView";
import { downloadReportPdf, type ReportPdfLang } from "@/components/ReportPdf";
import { gatesInterview, TEST_TYPE_LABELS, TEST_TYPES, type TestType } from "@/lib/test-types";
import {
  getAssignmentProgressLabel,
  getCaseDisplayStatus,
  sessionForAssignment,
} from "@/lib/case-progress";
import type {
  Interview,
  ReportRow,
  StudentCase as Case,
  TestAssignment,
  TestSession,
} from "@/lib/backend-types";

type SectionScoreBlock = {
  title?: string;
  score?: number;
  max?: number;
  diagnostics?: { summary?: string };
};

export const Route = createFileRoute("/dashboard/cases/$caseId")({
  component: AdminCaseDetail,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function AdminCaseDetail() {
  const { t, i18n } = useTranslation();
  const { caseId } = Route.useParams();
  const caseDetail = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const assignTestMutation = useMutation(api.backend.assignTest);
  const saveTranscript = useMutation(api.backend.saveTranscript);
  const publishReportMutation = useMutation(api.backend.publishReport);
  const unpublishReportMutation = useMutation(api.backend.unpublishReport);
  const analyzeInterview = useAction(api.ai.analyzeInterview);
  const generateReport = useAction(api.ai.generateReport);
  const data = (caseDetail?.case ?? null) as Case | null;
  const sessions = (caseDetail?.sessions ?? []) as TestSession[];
  const interview = (caseDetail?.interview ?? null) as Interview | null;
  const report = (caseDetail?.report ?? null) as ReportRow | null;
  const loading = caseDetail === undefined;
  const [busy, setBusy] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const assignments = (caseDetail?.assignments ?? []) as TestAssignment[];
  const refresh = () => {};

  const assignTest = async (testType: TestType) => {
    if (!data) return;
    setBusy("assign");
    try {
      await assignTestMutation({ caseId: caseId as any, testType });
    } catch (error) {
      setBusy(null);
      toast.error(error instanceof Error ? error.message : "Could not assign test");
      return;
    }
    setBusy(null);
    toast.success(t("dashboard.caseDetail.testAssigned"));
  };

  const runAnalyzeAndGenerate = async (transcriptText: string, notesText: string) => {
    setBusy("upload");
    try {
      const interviewId = await saveTranscript({
        caseId: caseId as any,
        transcript: transcriptText,
        notes: notesText || undefined,
      });
      toast.info("Transcript saved. Analysing interview…");
      await analyzeInterview({ interviewId });
      toast.info("Analysis complete. Generating draft report…");
      await generateReport({ caseId: caseId as any });
      toast.success("Draft report ready for review.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const runGenerate = async () => {
    setBusy("generate");
    try {
      await generateReport({ caseId: caseId as any });
      toast.success("Draft report generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setBusy(null);
    }
  };

  const publishReport = async () => {
    if (!report) return;
    setBusy("publish");
    try {
      await publishReportMutation({ reportId: report.id as any });
      toast.success("Report published to parent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const unpublishReport = async () => {
    if (!report) return;
    setBusy("unpublish");
    try {
      await unpublishReportMutation({ reportId: report.id as any });
      toast.success("Report unpublished.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    if (!report?.payload) return;
    setBusy("pdf");
    try {
      const name = `${((report.payload as ReportPayload).cover?.student_name ?? "advisory").replace(/\s+/g, "_")}_report.pdf`;
      const lang: ReportPdfLang =
        i18n.language === "zh-Hans" && report.payload_zh ? "zh-Hans" : "en";
      const body =
        lang === "zh-Hans" && report.payload_zh
          ? (report.payload_zh as ReportPayload)
          : (report.payload as ReportPayload);
      await downloadReportPdf(body, name, "Pathway Advisory", lang);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-muted-foreground">{t("dashboard.caseNotFound")}</div>;

  const hasHkAssignment = assignments.some((a) => a.test_type === "hk_aptitude");
  const hkSession = sessions.find((s) => s.test_type === "hk_aptitude") ?? null;
  const testGraded = !hasHkAssignment || hkSession?.status === "graded";
  const hasTranscript = !!interview?.transcript;
  const canGenerate = testGraded && hasTranscript;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← All cases
          </Link>
          <h1 className="mt-2 font-display text-3xl text-foreground">
            {data.student_name || "(unnamed student)"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.caseDetail.statusLabel")}:{" "}
            <span className="font-medium text-foreground">
              {getCaseDisplayStatus(data, assignments, sessions)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg text-foreground">Student</h2>
          <dl className="mt-3 divide-y divide-border">
            <Row label="English name" value={data.student_english_name} />
            <Row label="Date of birth" value={data.date_of_birth} />
            <Row label="Gender" value={data.gender} />
            <Row label="Current grade" value={data.current_grade} />
            <Row label="Current school" value={data.current_school} />
            <Row
              label="Country / city"
              value={[data.current_city, data.current_country].filter(Boolean).join(", ")}
            />
            <Row label="HK residency" value={data.hk_residency_status} />
            <Row label="Passport" value={data.passport_status} />
            <Row
              label="Target"
              value={[data.desired_entry_grade, data.desired_entry_year]
                .filter(Boolean)
                .join(" · ")}
            />
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg text-foreground">Academic</h2>
          <dl className="mt-3 divide-y divide-border">
            <Row label="Performance" value={data.current_academic_performance} />
            <Row label="Strongest subjects" value={data.strongest_subjects?.join(", ")} />
            <Row label="Weakest subjects" value={data.weakest_subjects?.join(", ")} />
            <Row label="English level" value={data.english_level} />
            <Row label="Chinese level" value={data.chinese_level} />
            <Row label="Current curriculum" value={data.current_curriculum} />
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg text-foreground">Preferences</h2>
          <dl className="mt-3 divide-y divide-border">
            <Row label="Desired curriculum" value={data.desired_curriculum} />
            <Row label="School type" value={data.preferred_school_type} />
            <Row label="Location" value={data.preferred_location} />
            <Row label="Budget" value={data.budget_range} />
            <Row label="Commute" value={data.commute_preference} />
            <Row label="Shortlist" value={data.school_shortlist?.join(", ")} />
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg text-foreground">Personal</h2>
          <dl className="mt-3 divide-y divide-border">
            <Row label="Extracurriculars" value={data.extracurricular_activities} />
            <Row label="Awards" value={data.awards} />
            <Row label="Career interests" value={data.career_interests} />
            <Row label="Parent goals" value={data.parent_goals} />
            <Row label="Learning support" value={data.learning_support_needs} />
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft lg:col-span-2">
          <h2 className="font-display text-lg text-foreground">Parent contact</h2>
          <dl className="mt-3 divide-y divide-border">
            <Row label="Name" value={data.parent_name} />
            <Row label="Email" value={data.parent_email} />
            <Row label="Phone" value={data.parent_phone} />
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">
            {t("dashboard.caseDetail.assignedTests")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.filter((tt) => !assignments.some((a) => a.test_type === tt)).map((tt) => (
              <Button
                key={tt}
                size="sm"
                variant="outline"
                disabled={busy === "assign"}
                onClick={() => assignTest(tt)}
              >
                + {TEST_TYPE_LABELS[tt]}
              </Button>
            ))}
          </div>
        </div>
        {assignments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("dashboard.caseDetail.noTestsAssigned")}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {assignments.map((a) => {
              const session = sessionForAssignment(a, sessions) as TestSession | null;
              const testType = a.test_type as TestType;
              const label = TEST_TYPE_LABELS[testType] ?? a.test_type;
              const progress = getAssignmentProgressLabel(a, session);
              const hkTrack = gatesInterview(testType);
              return (
                <li key={a.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{label}</p>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {progress.replace(/_/g, " ")}
                      {session ? ` · session ${session.status.replace(/_/g, " ")}` : ""}
                      {hkTrack && hasHkAssignment && data.status !== "profile_incomplete" && (
                        <> · case {data.status.replace(/_/g, " ")}</>
                      )}
                    </span>
                  </div>
                  {!session && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("dashboard.caseDetail.testNotStarted")}
                    </p>
                  )}
                  {session && session.status !== "graded" && session.status !== "failed" && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {session.status === "submitted"
                        ? t("dashboard.caseDetail.testSubmitted")
                        : session.status === "in_progress"
                          ? t("dashboard.caseDetail.testInProgress")
                          : t("dashboard.caseDetail.testPrepared")}
                    </p>
                  )}
                  {session?.status === "failed" && (
                    <p className="mt-2 text-sm text-destructive">
                      {t("dashboard.caseDetail.testGradingFailed")}:{" "}
                      {session.grading_error ?? "Unknown error"}
                    </p>
                  )}
                  {session?.status === "graded" && testType === "hk_aptitude" && (
                    <div className="mt-4 space-y-5">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-3xl text-foreground">
                          {session.total_score}
                        </span>
                        <span className="text-sm text-muted-foreground">/ {session.total_max}</span>
                        {session.total_max ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {Math.round(
                              (Number(session.total_score) / Number(session.total_max)) * 100,
                            )}
                            %
                          </span>
                        ) : null}
                      </div>
                      {session.ai_feedback && (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                          {session.ai_feedback}
                        </p>
                      )}
                      <div className="grid gap-3 md:grid-cols-2">
                        {session.section_scores &&
                          typeof session.section_scores === "object" &&
                          !Array.isArray(session.section_scores) &&
                          Object.entries(
                            session.section_scores as Record<string, SectionScoreBlock>,
                          ).map(([id, s]) => (
                            <div key={id} className="rounded-md border border-border p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">
                                  {id}. {s.title}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {s.score} / {s.max}
                                </span>
                              </div>
                              {s.diagnostics?.summary && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {s.diagnostics.summary}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {session?.status === "graded" && testType !== "hk_aptitude" && (
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      {session.total_score != null && session.total_max != null && (
                        <p>
                          {t("dashboard.caseDetail.scoreLine", {
                            score: session.total_score,
                            max: session.total_max,
                          })}
                        </p>
                      )}
                      {session.result_summary && typeof session.result_summary === "object" && (
                        <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs">
                          {JSON.stringify(session.result_summary, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {hasHkAssignment && (
        <>
          <p className="text-sm text-muted-foreground">{t("dashboard.caseDetail.hkTrackNote")}</p>
          {/* Interview transcript & feedback upload */}
          <InterviewUploadPanel
            interview={interview}
            busy={busy}
            onSubmit={runAnalyzeAndGenerate}
          />
        </>
      )}

      {/* Report */}
      {hasHkAssignment && (
        <section className="rounded-lg border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-foreground">Advisory report</h2>
            {report && (
              <span
                className={`rounded-full px-3 py-1 text-xs ${report.status === "published" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {report.status} · v{report.version}
              </span>
            )}
          </div>

          {!report && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                No report yet. Reports can only be generated once the test is graded
                <em> and</em> the interview transcript has been uploaded.
              </p>
              <div>
                <Button onClick={runGenerate} disabled={!canGenerate || busy === "generate"}>
                  {busy === "generate" ? "Generating…" : "Generate draft report"}
                </Button>
                {!canGenerate && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Waiting on: {!testGraded ? "graded test" : ""}
                    {!testGraded && !hasTranscript ? " · " : ""}
                    {!hasTranscript ? "interview transcript" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {report?.generation_error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {report.generation_error}
            </p>
          )}

          {report && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {report.translation_error && (
                  <p className="w-full text-xs text-amber-800">
                    {t("dashboard.reportZhFailed")} {report.translation_error}
                  </p>
                )}
                {!report.translation_error && report.payload_zh && (
                  <p className="w-full text-xs text-muted-foreground">
                    {t("dashboard.reportZhStored")}
                  </p>
                )}
                {!report.translation_error &&
                  !report.payload_zh &&
                  report.payload &&
                  typeof report.payload === "object" &&
                  report.payload !== null &&
                  "cover" in report.payload && (
                    <p className="w-full text-xs text-muted-foreground">
                      {t("dashboard.reportZhLegacy")}
                    </p>
                  )}
                <Button variant="outline" onClick={() => setShowReport((s) => !s)}>
                  {showReport ? "Hide preview" : "Preview report"}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadPdf}
                  disabled={busy === "pdf" || !report.payload}
                >
                  {busy === "pdf" ? "Preparing…" : "Download PDF"}
                </Button>
                <Button
                  onClick={runGenerate}
                  disabled={!canGenerate || busy === "generate"}
                  variant="outline"
                >
                  {busy === "generate" ? "Regenerating…" : "Regenerate"}
                </Button>
                {report.status !== "published" ? (
                  <Button onClick={publishReport} disabled={busy === "publish" || !report.payload}>
                    {busy === "publish" ? "Publishing…" : "Publish to parent"}
                  </Button>
                ) : (
                  <Button
                    onClick={unpublishReport}
                    disabled={busy === "unpublish"}
                    variant="destructive"
                  >
                    {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
                  </Button>
                )}
              </div>

              {showReport && report.payload && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <ReportView payload={report.payload as ReportPayload} />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InterviewUploadPanel({
  interview,
  busy,
  onSubmit,
}: {
  interview: Interview | null;
  busy: string | null;
  onSubmit: (transcript: string, notes: string) => void | Promise<void>;
}) {
  const [transcript, setTranscript] = useState(interview?.transcript ?? "");
  const [notes, setNotes] = useState(interview?.notes ?? "");
  const [editing, setEditing] = useState(!interview?.transcript);

  useEffect(() => {
    setTranscript(interview?.transcript ?? "");
    setNotes(interview?.notes ?? "");
    setEditing(!interview?.transcript);
  }, [interview?.id, interview?.transcript, interview?.notes]);

  const isBusy = busy === "upload";
  const canSubmit = transcript.trim().length > 20 && !isBusy;

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-foreground">Interview transcript & feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the interview transcript and your advisor notes. Submitting will analyse the
            interview and generate a draft report automatically.
          </p>
        </div>
        {interview && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {interview.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {interview?.analysis_error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {interview.analysis_error}
        </p>
      )}

      {!editing && interview?.transcript ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Transcript</p>
            <Textarea
              readOnly
              value={interview.transcript}
              className="mt-2 min-h-[180px] font-mono text-xs"
            />
          </div>
          {interview.notes && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Advisor notes
              </p>
              <Textarea readOnly value={interview.notes} className="mt-2 min-h-[100px] text-sm" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit & re-run analysis
            </Button>
          </div>
          {interview.ai_analysis && (
            <details className="rounded-md border border-border bg-muted/20 p-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                View structured analysis
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
                {JSON.stringify(interview.ai_analysis, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Transcript <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full interview transcript here…"
              className="mt-2 min-h-[220px] font-mono text-xs"
              maxLength={100000}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Advisor feedback / notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, fit comments, red flags…"
              className="mt-2 min-h-[120px] text-sm"
              maxLength={10000}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSubmit(transcript.trim(), notes.trim())} disabled={!canSubmit}>
              {isBusy ? "Processing…" : "Submit & generate report"}
            </Button>
            {interview?.transcript && (
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={isBusy}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
