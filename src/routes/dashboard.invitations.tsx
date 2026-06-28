/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import type { Invitation as Invite } from "@/lib/backend-types";
import { TEST_TYPES, TEST_TYPE_LABELS, type TestType } from "@/lib/test-types";
import { HKDSE_PAPER_IDS, HKDSE_PAPER_META, type HkdsePaperId } from "@/lib/hkdse-paper-meta";

export const Route = createFileRoute("/dashboard/invitations")({
  component: InvitationsPage,
});

function inviteStatusLabel(inv: Invite, expired: boolean, t: (k: string) => string): string {
  if (expired && inv.status === "pending") return t("dashboard.invitePage.statusExpired");
  switch (inv.status) {
    case "pending":
      return t("dashboard.invitePage.statusPending");
    case "accepted":
      return t("dashboard.invitePage.statusAccepted");
    case "revoked":
      return t("dashboard.invitePage.statusRevoked");
    case "expired":
      return t("dashboard.invitePage.statusExpired");
    default:
      return inv.status;
  }
}

function InvitationsPage() {
  const { t } = useTranslation();
  const { activeOrgId, user } = useAuth();
  const inviteData = useQuery(
    api.backend.invitationsForOrg,
    user && activeOrgId ? { organizationId: activeOrgId as any } : "skip",
  );
  const createInvitation = useMutation(api.backend.createInvitation);
  const invites = (inviteData?.invitations ?? []) as Invite[];
  const inviteTestsById = (inviteData?.testsById ?? {}) as Record<string, TestType[]>;
  const loading = !!activeOrgId && inviteData === undefined;
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    parent_email: "",
    parent_name: "",
    student_name: "",
    notes: "",
  });
  const [selectedTests, setSelectedTests] = useState<TestType[]>(["hk_aptitude"]);
  const [hkdsePaperMode, setHkdsePaperMode] = useState<"all" | "pick">("all");
  const [selectedHkdsePapers, setSelectedHkdsePapers] = useState<HkdsePaperId[]>([
    ...HKDSE_PAPER_IDS,
  ]);

  const inviteSchema = useMemo(
    () =>
      z.object({
        parent_email: z.string().trim().email(t("dashboard.invitePage.emailInvalid")).max(255),
        parent_name: z.string().trim().max(100).optional().or(z.literal("")),
        student_name: z.string().trim().max(100).optional().or(z.literal("")),
        notes: z.string().trim().max(500).optional().or(z.literal("")),
      }),
    [t],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !user) return;
    const parsed = inviteSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (selectedTests.length === 0) {
      toast.error(t("dashboard.invitePage.selectOneTest"));
      return;
    }
    if (
      selectedTests.includes("ielts_practice") &&
      hkdsePaperMode === "pick" &&
      selectedHkdsePapers.length === 0
    ) {
      toast.error("Select at least one HKDSE English paper.");
      return;
    }
    setCreating(true);
    try {
      await createInvitation({
        organizationId: activeOrgId as any,
        parent_email: parsed.data.parent_email,
        parent_name: parsed.data.parent_name || undefined,
        student_name: parsed.data.student_name || undefined,
        notes: parsed.data.notes || undefined,
        testTypes: selectedTests,
        hkdsePapers: selectedTests.includes("ielts_practice")
          ? hkdsePaperMode === "all"
            ? undefined
            : selectedHkdsePapers
          : undefined,
      });
    } catch (error) {
      setCreating(false);
      toast.error(error instanceof Error ? error.message : "Could not create invitation");
      return;
    }
    setCreating(false);
    toast.success(t("dashboard.invitePage.toastCreated"));
    setForm({ parent_email: "", parent_name: "", student_name: "", notes: "" });
    setSelectedTests(["hk_aptitude"]);
  };

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <section>
        <h1 className="font-display text-2xl text-foreground">{t("dashboard.invitePage.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.invitePage.subtitle")}</p>
        <form
          onSubmit={handleCreate}
          className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-5 shadow-soft"
        >
          <div className="space-y-1.5">
            <Label htmlFor="parent_email">{t("dashboard.invitePage.parentEmail")}</Label>
            <Input
              id="parent_email"
              type="email"
              value={form.parent_email}
              onChange={(e) => setForm((f) => ({ ...f, parent_email: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="parent_name">{t("dashboard.invitePage.parentName")}</Label>
              <Input
                id="parent_name"
                value={form.parent_name}
                onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student_name">{t("dashboard.invitePage.studentName")}</Label>
              <Input
                id="student_name"
                value={form.student_name}
                onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.invitePage.testsLabel")}</Label>
            <div className="space-y-2">
              {TEST_TYPES.map((tt) => (
                <label key={tt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(tt)}
                    onChange={(e) => {
                      setSelectedTests((prev) =>
                        e.target.checked ? [...prev, tt] : prev.filter((x) => x !== tt),
                      );
                    }}
                  />
                  {TEST_TYPE_LABELS[tt]}
                </label>
              ))}
            </div>
            {selectedTests.includes("ielts_practice") && (
              <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/20 p-4">
                <Label>HKDSE English papers</Label>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={hkdsePaperMode === "all"}
                      onChange={() => setHkdsePaperMode("all")}
                    />
                    Full set (Papers 1–4)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={hkdsePaperMode === "pick"}
                      onChange={() => setHkdsePaperMode("pick")}
                    />
                    Select individual paper(s)
                  </label>
                </div>
                {hkdsePaperMode === "pick" && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {HKDSE_PAPER_META.map((paper) => (
                      <label key={paper.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedHkdsePapers.includes(paper.id)}
                          onChange={(e) => {
                            setSelectedHkdsePapers((prev) =>
                              e.target.checked
                                ? [...prev, paper.id]
                                : prev.filter((id) => id !== paper.id),
                            );
                          }}
                        />
                        {paper.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("dashboard.invitePage.internalNotes")}</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("dashboard.invitePage.notesPlaceholder")}
            />
          </div>
          <Button type="submit" disabled={creating} className="w-full">
            {creating
              ? t("dashboard.invitePage.submitCreating")
              : t("dashboard.invitePage.submitIdle")}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl text-foreground">
          {t("dashboard.invitePage.listTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.invitePage.listSubtitle", { count: invites.length })}
        </p>
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : invites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-muted-foreground">
              {t("dashboard.invitePage.empty")}
            </div>
          ) : (
            invites.map((inv) => {
              const expired = inv.expires_at < Date.now();
              const url = inviteUrl(inv.token);
              return (
                <div
                  key={inv.id}
                  className="rounded-lg border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{inv.parent_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.parent_name || "—"}
                        {inv.student_name
                          ? t("dashboard.invitePage.forStudent", { name: inv.student_name })
                          : ""}
                      </p>
                      {(inviteTestsById[inv.id]?.length ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("dashboard.invitePage.assignedTestsOnInvite", {
                            names: (inviteTestsById[inv.id] ?? [])
                              .map((tt) => TEST_TYPE_LABELS[tt])
                              .join(", "),
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === "accepted"
                          ? "bg-success/15 text-success"
                          : expired || inv.status === "expired"
                            ? "bg-muted text-muted-foreground"
                            : inv.status === "revoked"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {inviteStatusLabel(inv, expired, t)}
                    </span>
                  </div>
                  {inv.status === "pending" && !expired && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        readOnly
                        value={url}
                        className="flex-1 truncate rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast.success(t("dashboard.invitePage.toastCopied"));
                        }}
                      >
                        {t("dashboard.invitePage.copyLink")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
