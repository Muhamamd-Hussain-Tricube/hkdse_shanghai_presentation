/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { HkdseResultsPanel } from "@/components/hkdse/HkdseResultsPanel";

export const Route = createFileRoute("/parent/$caseId/results/hkdse")({
  component: HkdseResultsPage,
});

function HkdseResultsPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const data = useQuery(api.backend.studentTests, { caseId: caseId as any });
  const session = data?.sessions?.find(
    (s: any) => s.test_type === "ielts_practice" && s.status === "graded",
  );
  const summary = (session?.result_summary as Record<string, unknown>) ?? null;
  const sectionScores = (session?.section_scores as Record<string, any>) ?? {};
  const loading = data === undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Practice report</p>
        <h1 className="mt-2 font-display text-3xl">{t("student.results.ieltsTitle")}</h1>
        {loading ? (
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        ) : !session || !summary ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">{t("student.results.noGradedSession")}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/parent/$caseId/tests" params={{ caseId }}>
                {t("student.tests.backToList")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <HkdseResultsPanel
              summary={summary as any}
              sectionScores={sectionScores}
              totalScore={session.total_score}
              totalMax={session.total_max}
              feedback={session.ai_feedback}
            />
          </div>
        )}
        {session && (
          <Button asChild className="mt-6" variant="outline">
            <Link to="/parent/$caseId/tests" params={{ caseId }}>
              {t("student.tests.backToList")}
            </Link>
          </Button>
        )}
      </main>
    </div>
  );
}
