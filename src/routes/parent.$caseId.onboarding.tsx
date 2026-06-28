/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParentPageShell } from "@/components/parent/ParentPageShell";
import { hasRequiredProfileFields } from "@/lib/case-progress";
import { toast } from "sonner";
import type { StudentCase as Case } from "@/lib/backend-types";

export const Route = createFileRoute("/parent/$caseId/onboarding")({
  component: ParentOnboardingPage,
});

function ParentOnboardingPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const caseDetail = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const updateCaseProfile = useMutation(api.backend.updateCaseProfile);
  const [data, setData] = useState<Case | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!caseDetail?.case) return;
    const c = caseDetail.case as Case;
    if (c.status !== "profile_incomplete" && hasRequiredProfileFields(c)) {
      navigate({ to: "/parent/$caseId/tests", params: { caseId } });
      return;
    }
    setData(c);
  }, [caseDetail, caseId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!hasRequiredProfileFields(data)) {
      toast.error(t("parent.profileRequired"));
      return;
    }
    setSaving(true);
    try {
      await updateCaseProfile({
        caseId: caseId as any,
        patch: {
          student_name: data.student_name,
          date_of_birth: data.date_of_birth,
          current_grade: data.current_grade,
          desired_entry_grade: data.desired_entry_grade,
          status: "profile_complete",
        },
      });
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Could not save profile");
      return;
    }
    setSaving(false);
    toast.success(t("parent.onboarding.completeToast"));
    navigate({ to: "/parent/$caseId/tests", params: { caseId } });
  };

  if (caseDetail === undefined || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <ParentPageShell caseId={caseId}>
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="font-display text-3xl text-foreground">{t("parent.onboarding.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("parent.onboarding.subtitle")}</p>
        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
          <div className="space-y-1.5">
            <Label>{t("parent.fields.studentName")}</Label>
            <Input
              value={data.student_name ?? ""}
              onChange={(e) => setData({ ...data, student_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("parent.fields.dob")}</Label>
            <Input
              type="date"
              value={data.date_of_birth ?? ""}
              onChange={(e) => setData({ ...data, date_of_birth: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("parent.fields.currentGrade")}</Label>
            <Input
              value={data.current_grade ?? ""}
              onChange={(e) => setData({ ...data, current_grade: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("parent.fields.desiredGrade")}</Label>
            <Input
              value={data.desired_entry_grade ?? ""}
              onChange={(e) => setData({ ...data, desired_entry_grade: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t("parent.saving") : t("parent.onboarding.continue")}
          </Button>
        </form>
      </main>
    </ParentPageShell>
  );
}
