/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { ParentPageShell } from "@/components/parent/ParentPageShell";
import { HkProfileChecklist, type Case } from "@/components/parent/ProfileSections";
import { hkPipelineSteps } from "@/lib/case-progress";
import { buildCaseProfilePayload } from "@/lib/save-case-profile";
import { toast } from "sonner";
import type { TestAssignment as Assignment } from "@/lib/backend-types";

export const Route = createFileRoute("/parent/$caseId/hk")({
  component: ParentHkJourneyPage,
});

function ParentHkJourneyPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const caseDetail = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const updateCaseProfile = useMutation(api.backend.updateCaseProfile);
  const [data, setData] = useState<Case | null>(null);
  const [saving, setSaving] = useState(false);
  const hkAssignment = (caseDetail?.assignments ?? []).find(
    (a: any) => a.test_type === "hk_aptitude",
  ) as Assignment | undefined;
  const hkSession =
    (caseDetail?.sessions ?? []).find((s: any) => s.test_type === "hk_aptitude") ?? null;
  const hkSessionStatus = hkSession?.status ?? null;
  const loading = caseDetail === undefined;

  useEffect(() => {
    if (!caseDetail?.case) return;
    if (caseDetail.case.status === "profile_incomplete") {
      navigate({ to: "/parent/$caseId/onboarding", params: { caseId } });
      return;
    }
    setData(caseDetail.case as Case);
  }, [caseDetail, caseId, navigate]);

  const update = (patch: Partial<Case>) => setData((d) => (d ? { ...d, ...patch } : d));

  const saveChecklist = async () => {
    if (!data) return;
    setSaving(true);
    const payload = buildCaseProfilePayload(data);
    try {
      await updateCaseProfile({ caseId: data.id as any, patch: payload });
      toast.success(t("parent.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!hkAssignment) {
    return (
      <ParentPageShell
        caseId={caseId}
        backTo={{ label: t("student.portal.backToTests"), to: "/parent/$caseId/tests" }}
      >
        <main className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-muted-foreground">{t("student.hk.notAssigned")}</p>
          <Button asChild className="mt-4">
            <Link to="/parent/$caseId/tests" params={{ caseId }}>
              {t("student.portal.backToTests")}
            </Link>
          </Button>
        </main>
      </ParentPageShell>
    );
  }

  const hkCompleted = hkAssignment.status === "completed";
  const pipelineSteps = hkPipelineSteps(
    data,
    hkAssignment,
    hkSessionStatus
      ? {
          assignment_id: hkAssignment.id,
          test_type: "hk_aptitude",
          status: hkSessionStatus as "graded",
        }
      : null,
    t,
  );
  const testInProgress =
    hkSessionStatus === "in_progress" ||
    hkSessionStatus === "not_started" ||
    hkAssignment.status === "in_progress";

  return (
    <ParentPageShell
      caseId={caseId}
      backTo={{ label: t("student.portal.backToTests"), to: "/parent/$caseId/tests" }}
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("student.hk.badge")}
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          {data.student_name || t("parent.studentProfileFallback")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("student.hk.subtitle")}</p>

        <ol
          className="mt-8 grid gap-2 text-xs"
          style={{ gridTemplateColumns: `repeat(${pipelineSteps.length}, minmax(0, 1fr))` }}
        >
          {pipelineSteps.map((s) => (
            <li
              key={s.label}
              className={`rounded-md border px-3 py-2 ${
                s.done
                  ? "border-success/40 bg-success/10 text-success"
                  : s.active
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>

        {!hkCompleted && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5">
            <div>
              <p className="font-display text-lg text-foreground">
                {t("student.hk.startTestTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("student.hk.startTestBody")}</p>
            </div>
            <Button asChild>
              <Link
                to="/parent/$caseId/test/$assignmentId"
                params={{ caseId, assignmentId: hkAssignment.id }}
              >
                {testInProgress ? t("student.tests.continue") : t("student.tests.start")}
              </Link>
            </Button>
          </div>
        )}

        {hkCompleted &&
          ![
            "interview_scheduled",
            "interview_completed",
            "transcript_ready",
            "report_draft",
            "report_published",
          ].includes(data.status) && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <div>
                <p className="font-display text-lg text-foreground">
                  {t("parent.nextInterviewTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("parent.nextInterviewBody")}
                </p>
              </div>
              <Button asChild>
                <Link to="/parent/$caseId/interview" params={{ caseId }}>
                  {t("parent.bookInterview")}
                </Link>
              </Button>
            </div>
          )}

        {data.status === "interview_scheduled" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-success/40 bg-success/10 p-5">
            <div>
              <p className="font-display text-lg text-foreground">
                {t("parent.interviewBookedTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("parent.interviewBookedBody")}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/parent/$caseId/interview" params={{ caseId }}>
                {t("parent.viewBooking")}
              </Link>
            </Button>
          </div>
        )}

        {(data.status === "transcript_ready" ||
          data.status === "interview_completed" ||
          data.status === "report_draft") && (
          <div className="mt-6 rounded-lg border border-border bg-surface p-5">
            <p className="font-display text-lg text-foreground">
              {t("parent.interviewCompleteTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("parent.interviewCompleteBody")}
            </p>
          </div>
        )}

        {data.status === "report_published" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-success/40 bg-success/10 p-5">
            <div>
              <p className="font-display text-lg text-foreground">{t("parent.reportReadyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("parent.reportReadyBody")}</p>
            </div>
            <Button asChild>
              <Link to="/parent/$caseId/report" params={{ caseId }}>
                {t("parent.viewReport")}
              </Link>
            </Button>
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-display text-lg text-foreground">{t("student.hk.checklistTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("student.hk.checklistSubtitle")}</p>
          <div className="mt-4 rounded-lg border border-border bg-surface p-6 shadow-soft">
            <HkProfileChecklist data={data} update={update} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={saveChecklist} disabled={saving}>
              {saving ? t("parent.saving") : t("parent.saveDraft")}
            </Button>
          </div>
        </section>
      </main>
    </ParentPageShell>
  );
}
