/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type ResultSummary = {
  bands?: Record<string, string>;
  overall_band_estimate?: number;
  overall_level_estimate?: string;
  component_scores?: Record<string, { title?: string; score?: number; max?: number }>;
  disclaimer?: string;
};

export const Route = createFileRoute("/parent/$caseId/results/ielts")({
  component: IeltsResultsPage,
});

function IeltsResultsPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const data = useQuery(api.backend.studentTests, { caseId: caseId as any });
  const session = data?.sessions?.find(
    (s: any) => s.test_type === "ielts_practice" && s.status === "graded",
  );
  const summary = (session?.result_summary as ResultSummary | undefined) ?? null;
  const feedback = session?.ai_feedback ?? null;
  const loading = data === undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl">{t("student.results.ieltsTitle")}</h1>
        {loading ? (
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        ) : !summary ? (
          <p className="mt-4 text-muted-foreground">{t("student.results.notReady")}</p>
        ) : (
          <div className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6">
            <p className="text-2xl font-display">
              {t("student.results.overallBand")}:{" "}
              {summary.overall_level_estimate ?? summary.overall_band_estimate ?? "—"}
            </p>
            {summary.bands && (
              <ul className="space-y-2 text-sm">
                {Object.entries(summary.bands).map(([k, v]) => (
                  <li key={k}>
                    <span className="capitalize">{k.replaceAll("_", " ")}</span>: {v}
                  </li>
                ))}
              </ul>
            )}
            {summary.component_scores && (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Component</th>
                      <th className="px-3 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(summary.component_scores).map(([id, component]) => (
                      <tr key={id}>
                        <td className="px-3 py-2">{component.title ?? id}</td>
                        <td className="px-3 py-2">
                          {component.score ?? "—"} / {component.max ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {feedback && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{feedback}</p>
            )}
            <p className="text-xs text-muted-foreground">{summary.disclaimer}</p>
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
