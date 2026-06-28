/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

const CALENDLY_RE = /^https?:\/\/(www\.)?calendly\.com\/.+/i;

function SettingsPage() {
  const { t } = useTranslation();
  const { user, organizations, activeOrgId, refreshOrganizations } = useAuth();
  const updateOrganization = useMutation(api.backend.updateOrganization);
  const org = organizations.find((o) => o.organization_id === activeOrgId);

  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCalendlyUrl(org?.organization.calendly_url ?? "");
  }, [org?.organization_id, org?.organization.calendly_url]);

  const saveCalendly = async () => {
    if (!org) return;
    const trimmed = calendlyUrl.trim();
    if (trimmed && !CALENDLY_RE.test(trimmed)) {
      toast.error(t("dashboard.settingsPage.calendlyInvalid"));
      return;
    }
    setSaving(true);
    try {
      await updateOrganization({
        organizationId: org.organization_id as any,
        name: org.organization.name,
        calendly_url: trimmed || undefined,
      });
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Could not save settings");
      return;
    }
    setSaving(false);
    toast.success(t("dashboard.settingsPage.toastSaved"));
    await refreshOrganizations();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">
          {t("dashboard.settingsPage.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.settingsPage.subtitle")}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-medium text-foreground">
          {t("dashboard.settingsPage.account")}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("dashboard.settingsPage.email")}</dt>
            <dd className="text-foreground">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("dashboard.settingsPage.userId")}</dt>
            <dd className="font-mono text-xs text-muted-foreground">{user?.id}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-medium text-foreground">
          {t("dashboard.settingsPage.activeOrg")}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("dashboard.settingsPage.name")}</dt>
            <dd className="text-foreground">{org?.organization.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("dashboard.settingsPage.slug")}</dt>
            <dd className="font-mono text-xs text-muted-foreground">{org?.organization.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("dashboard.settingsPage.role")}</dt>
            <dd className="text-foreground">
              {org?.is_owner
                ? t("dashboard.settingsPage.roleOwner")
                : t("dashboard.settingsPage.roleAdmin")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <h2 className="font-display text-lg text-foreground">
          {t("dashboard.settingsPage.schedulingTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.settingsPage.schedulingBody")}
        </p>

        <div className="mt-5 space-y-2">
          <Label htmlFor="calendly">{t("dashboard.settingsPage.calendlyLabel")}</Label>
          <Input
            id="calendly"
            type="url"
            placeholder={t("dashboard.settingsPage.calendlyPlaceholder")}
            value={calendlyUrl}
            onChange={(e) => setCalendlyUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t("dashboard.settingsPage.calendlyHintBefore")}
            <a
              href="https://calendly.com/signup"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("dashboard.settingsPage.calendlyHintLink")}
            </a>
            {t("dashboard.settingsPage.calendlyHintAfter")}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={saveCalendly} disabled={saving}>
            {saving ? t("dashboard.settingsPage.saveSaving") : t("dashboard.settingsPage.saveIdle")}
          </Button>
        </div>
      </div>
    </div>
  );
}
