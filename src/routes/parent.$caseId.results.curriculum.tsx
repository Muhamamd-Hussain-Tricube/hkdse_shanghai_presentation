/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type CurriculumResult = {
  primary?: "ib" | "a_level" | "btec";
  secondary?: "ib" | "a_level" | "btec" | null;
  confidence?: number;
  narrative?: string;
};

const PATHWAY_LABELS: Record<string, string> = {
  ib: "IB Diploma",
  a_level: "A-Levels",
  btec: "Pearson BTEC",
};

export const Route = createFileRoute("/parent/$caseId/results/curriculum")({
  component: CurriculumResultsPage,
});

function CurriculumResultsPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const data = useQuery(api.backend.studentTests, { caseId: caseId as any });
  const session = data?.sessions?.find(
    (s: any) => s.test_type === "curriculum_fit" && s.status === "graded",
  );
  const result = (session?.result_summary as CurriculumResult | undefined) ?? null;
  const loading = data === undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl">{t("student.results.curriculumTitle")}</h1>
        {loading ? (
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        ) : !result?.primary ? (
          <p className="mt-4 text-muted-foreground">{t("student.results.notReady")}</p>
        ) : (
          <div className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6">
            <p className="text-xl font-display">
              {t("student.results.primaryFit")}: {PATHWAY_LABELS[result.primary] ?? result.primary}
            </p>
            {result.secondary && (
              <p className="text-sm text-muted-foreground">
                {t("student.results.secondaryFit")}: {PATHWAY_LABELS[result.secondary]}
              </p>
            )}
            {result.confidence != null && (
              <p className="text-sm text-muted-foreground">
                {t("student.results.confidence")}: {Math.round(result.confidence * 100)}%
              </p>
            )}
            {result.narrative && (
              <p className="text-sm leading-relaxed whitespace-pre-line">{result.narrative}</p>
            )}
          </div>
        )}
        <Button asChild className="mt-6" variant="outline">
          <Link to="/parent/$caseId/tests" params={{ caseId }}>
            {t("student.tests.backToList")}
          </Link>
        </Button>
      </main>
    </div>
  );
}
