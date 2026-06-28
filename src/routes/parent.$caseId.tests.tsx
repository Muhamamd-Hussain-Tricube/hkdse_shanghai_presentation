/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { ParentPageShell } from "@/components/parent/ParentPageShell";
import {
  getStudentAssignmentDisplayStatus,
  sessionForAssignment,
  type StudentAssignmentDisplayStatus,
} from "@/lib/case-progress";
import { gatesInterview, TEST_TYPE_LABELS, type TestType } from "@/lib/test-types";
import { Button } from "@/components/ui/button";
import type {
  StudentCase as Case,
  TestAssignment as Assignment,
  TestSession as Session,
} from "@/lib/backend-types";

export const Route = createFileRoute("/parent/$caseId/tests")({
  component: StudentTestsHubPage,
});

function statusLabel(display: StudentAssignmentDisplayStatus, t: (k: string) => string): string {
  switch (display) {
    case "pending":
      return t("student.tests.statusPending");
    case "in_progress":
      return t("student.tests.statusInProgress");
    case "grading":
      return t("student.tests.statusGrading");
    case "completed":
      return t("student.tests.statusCompleted");
  }
}

function StudentTestsHubPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const data = useQuery(api.backend.studentTests, { caseId: caseId as any });
  const caseRow = (data?.case ?? null) as Case | null;
  const assignments = (data?.assignments ?? []) as Assignment[];
  const sessions = (data?.sessions ?? []) as Session[];
  const loading = data === undefined;

  useEffect(() => {
    if (caseRow?.status === "profile_incomplete") {
      navigate({ to: "/parent/$caseId/onboarding", params: { caseId } });
    }
  }, [caseId, caseRow?.status, navigate]);

  return (
    <ParentPageShell
      caseId={caseId}
      backTo={{
        label: t("student.portal.editProfile"),
        to: "/parent/$caseId/profile",
      }}
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("student.portal.yourPortal")}
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          {caseRow?.student_name || t("parent.studentProfileFallback")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("student.tests.subtitle")}</p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">{t("common.loading")}</p>
        ) : assignments.length === 0 ? (
          <p className="mt-8 text-muted-foreground">{t("student.tests.noneAssigned")}</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {assignments.map((a) => {
              const testType = a.test_type as TestType;
              const label = TEST_TYPE_LABELS[testType] ?? testType;
              const session = sessionForAssignment(a, sessions);
              const display = getStudentAssignmentDisplayStatus(a, session);
              const done = display === "completed";
              const isHk = gatesInterview(testType);
              const inProgress = display === "in_progress" || display === "grading";
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5"
                >
                  <div>
                    <p className="font-display text-lg text-foreground">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {statusLabel(display, t)}
                      {isHk && (
                        <span className="ml-2 text-xs text-primary">
                          · {t("student.hk.includesInterview")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isHk && (
                      <Button asChild variant={done ? "outline" : "default"}>
                        <Link to="/parent/$caseId/hk" params={{ caseId }}>
                          {done ? t("student.hk.viewJourney") : t("student.hk.continueAdvisory")}
                        </Link>
                      </Button>
                    )}
                    {!isHk && done && (
                      <Button asChild variant="outline">
                        <Link
                          to={
                            testType === "ielts_practice"
                              ? "/parent/$caseId/results/hkdse"
                              : "/parent/$caseId/results/curriculum"
                          }
                          params={{ caseId }}
                        >
                          {t("student.tests.viewResults")}
                        </Link>
                      </Button>
                    )}
                    {!isHk && !done && (
                      <Button asChild>
                        <Link
                          to="/parent/$caseId/test/$assignmentId"
                          params={{ caseId, assignmentId: a.id }}
                        >
                          {inProgress ? t("student.tests.continue") : t("student.tests.start")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </ParentPageShell>
  );
}
