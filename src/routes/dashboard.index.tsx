/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import type { StudentCase as Case } from "@/lib/backend-types";

export const Route = createFileRoute("/dashboard/")({
  component: CasesPage,
});

const STATUS_TONE: Record<string, string> = {
  profile_incomplete: "bg-muted text-muted-foreground",
  profile_complete: "bg-primary/10 text-primary",
  test_in_progress: "bg-accent/20 text-accent-foreground",
  test_completed: "bg-success/15 text-success",
  interview_scheduled: "bg-primary/10 text-primary",
  interview_completed: "bg-success/15 text-success",
  transcript_ready: "bg-success/15 text-success",
  report_draft: "bg-warning/20 text-warning-foreground",
  report_published: "bg-success/15 text-success",
};

function CasesPage() {
  const { t } = useTranslation();
  const { activeOrgId, user } = useAuth();
  const casesResult = useQuery(
    api.backend.dashboardCases,
    user && activeOrgId ? { organizationId: activeOrgId as any } : "skip",
  );
  const cases = (casesResult ?? []) as Case[];
  const loading = !!activeOrgId && casesResult === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">{t("dashboard.casesTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.casesSubtitle")}</p>
        </div>
        <Link to="/dashboard/invitations">
          <Button>{t("dashboard.inviteParent")}</Button>
        </Link>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-muted-foreground">
          {t("dashboard.loadingCases")}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <p className="font-display text-lg text-foreground">{t("dashboard.noCasesTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.noCasesBody")}</p>
          <Link to="/dashboard/invitations" className="mt-4 inline-block">
            <Button>{t("dashboard.sendFirst")}</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("dashboard.thStudent")}</th>
                <th className="px-4 py-3 font-medium">{t("dashboard.thParent")}</th>
                <th className="px-4 py-3 font-medium">{t("dashboard.thTarget")}</th>
                <th className="px-4 py-3 font-medium">{t("dashboard.thStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("dashboard.thCreated")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {cases.map((c) => {
                const tone = STATUS_TONE[c.status] ?? STATUS_TONE.profile_incomplete;
                const statusLabel = t(
                  `dashboard.status.${c.status}` as "dashboard.status.profile_incomplete",
                  {
                    defaultValue: c.status.replace(/_/g, " "),
                  },
                );
                return (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.student_name || c.student_english_name || t("dashboard.unnamed")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.parent_name || c.parent_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.desired_entry_grade
                        ? `${c.desired_entry_grade} ${c.desired_entry_year ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/dashboard/cases/$caseId"
                        params={{ caseId: c.id }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t("dashboard.view")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
