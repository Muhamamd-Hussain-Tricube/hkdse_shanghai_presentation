/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ReportView, type ReportPayload } from "@/components/ReportView";
import { downloadReportPdf, type ReportPdfLang } from "@/components/ReportPdf";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";

export const Route = createFileRoute("/parent/$caseId/report")({
  component: ParentReportPage,
});

type ReportRow = {
  payload: ReportPayload | null;
  payload_zh: ReportPayload | null;
  status: string;
  published_at: string | null;
};

function ParentReportPage() {
  const { caseId } = Route.useParams();
  const { t, i18n } = useTranslation();
  const data = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const report = data?.report?.status === "published" ? data.report : null;
  const row = report?.payload
    ? ({
        payload: report.payload as ReportPayload,
        payload_zh: (report.payload_zh as ReportPayload | null) ?? null,
        status: report.status,
        published_at: report.published_at,
      } satisfies ReportRow)
    : null;
  const loading = data === undefined;
  const [downloading, setDownloading] = useState(false);

  const lang = i18n.language === "zh-Hans" ? "zh-Hans" : "en";
  const zhMissing = lang === "zh-Hans" && row?.payload && !row.payload_zh;

  const displayPayload = useMemo(() => {
    if (!row?.payload) return null;
    if (lang === "zh-Hans" && row.payload_zh) return row.payload_zh;
    return row.payload;
  }, [row, lang]);

  const pdfLang: ReportPdfLang = zhMissing || lang === "en" ? "en" : "zh-Hans";

  const onDownload = async () => {
    const payload = displayPayload ?? row?.payload;
    if (!payload) return;
    setDownloading(true);
    try {
      const name = `${payload.cover.student_name?.replace(/\s+/g, "_") ?? "advisory"}_report.pdf`;
      await downloadReportPdf(payload, name, "Pathway Advisory", pdfLang);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-3">
          <Logo />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LanguageToggle />
            <Link
              to="/parent/$caseId/hk"
              params={{ caseId }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("parent.report.backHkHeader")}
            </Link>
            {displayPayload && !zhMissing && (
              <Button onClick={onDownload} disabled={downloading} size="sm">
                {downloading ? t("parent.report.preparingPdf") : t("parent.report.downloadPdf")}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        {lang === "zh-Hans" && <LocaleDisclaimerBanner />}
        {loading ? (
          <p className="text-center text-muted-foreground">{t("parent.report.loading")}</p>
        ) : !row?.payload ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-soft">
            <p className="font-display text-xl text-foreground">
              {t("parent.report.titlePublished")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("parent.report.bodyPublished")}</p>
            <Button asChild className="mt-4">
              <Link to="/parent/$caseId/hk" params={{ caseId }}>
                {t("parent.report.backHk")}
              </Link>
            </Button>
          </div>
        ) : zhMissing ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-soft">
            <p className="font-display text-xl text-foreground">
              {t("parent.report.zhUnavailableTitle")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("parent.report.zhUnavailableBody")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void i18n.changeLanguage("en")}
              >
                {t("common.langEnglish")}
              </Button>
              <Button asChild variant="outline">
                <Link to="/parent/$caseId/hk" params={{ caseId }}>
                  {t("parent.report.backHk")}
                </Link>
              </Button>
            </div>
          </div>
        ) : displayPayload ? (
          <ReportView payload={displayPayload} />
        ) : null}
      </main>
    </div>
  );
}
