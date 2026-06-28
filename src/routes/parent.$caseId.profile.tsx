/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { ParentPageShell } from "@/components/parent/ParentPageShell";
import {
  type Case,
  type ProfileSectionId,
  ProfileSectionBody,
  ProfileSectionTabs,
} from "@/components/parent/ProfileSections";
import { buildCaseProfilePayload } from "@/lib/save-case-profile";
import { hasRequiredProfileFields } from "@/lib/case-progress";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/$caseId/profile")({
  component: ParentProfilePage,
});

function ParentProfilePage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const caseDetail = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const updateCaseProfile = useMutation(api.backend.updateCaseProfile);
  const [data, setData] = useState<Case | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<ProfileSectionId>("student");

  useEffect(() => {
    if (caseDetail?.case) setData(caseDetail.case as Case);
  }, [caseDetail]);

  const update = (patch: Partial<Case>) => setData((d) => (d ? { ...d, ...patch } : d));

  const save = async (markComplete = false) => {
    if (!data) return;
    setSaving(true);
    const payload = buildCaseProfilePayload(data, {
      markComplete: markComplete && hasRequiredProfileFields(data),
    });
    try {
      await updateCaseProfile({ caseId: data.id as any, patch: payload });
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Could not save profile");
      return;
    }
    setSaving(false);
    if (markComplete && !hasRequiredProfileFields(data)) {
      toast.error(t("parent.profileRequired"));
      return;
    }
    setData((d) => (d ? { ...d, status: payload.status } : d));
    toast.success(markComplete ? t("parent.profileSaved") : t("parent.saved"));
  };

  if (caseDetail === undefined || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <ParentPageShell
      caseId={caseId}
      backTo={{ label: t("student.portal.backToTests"), to: "/parent/$caseId/tests" }}
    >
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl text-foreground">{t("parent.profilePage.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("parent.profilePage.subtitle")}</p>

        <div className="mt-8">
          <ProfileSectionTabs section={section} setSection={setSection} />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-soft">
          <ProfileSectionBody section={section} data={data} update={update} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>
            {saving ? t("parent.saving") : t("parent.saveDraft")}
          </Button>
          <Button onClick={() => save(true)} disabled={saving}>
            {t("parent.updateProfile")}
          </Button>
        </div>
      </main>
    </ParentPageShell>
  );
}
