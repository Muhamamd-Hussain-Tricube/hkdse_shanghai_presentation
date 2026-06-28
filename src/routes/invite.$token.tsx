import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthActions, useConvexAuth } from "@/lib/auth-context";
import { useConvex, useMutation, useQuery } from "@/lib/app-data";
import { waitForAuthSession } from "@/lib/wait-for-auth";
import { api } from "@/lib/app-data";
import { hasRequiredProfileFields } from "@/lib/case-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
  head: () => ({ meta: [{ title: "Your invitation — Pathway Advisory" }] }),
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function InvitePage() {
  const { t } = useTranslation();
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const invitationData = useQuery(api.backend.invitationByToken, { token });
  const acceptInvitation = useMutation(api.backend.acceptInvitation);
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const invite = invitationData?.invite ?? null;
  const org = invitationData?.organization ?? null;
  const loading = invitationData === undefined;
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentGrade, setCurrentGrade] = useState("");
  const [desiredEntryGrade, setDesiredEntryGrade] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!invite) setError("This invitation link is invalid.");
    else if (invite.status === "revoked") setError("This invitation has been revoked.");
    else if (invite.expires_at < Date.now())
      setError("This invitation has expired. Please request a new link.");
    else {
      setError(null);
      setStudentName((current) => current || invite.student_name || "");
      if (invite.status === "accepted" && invite.case_id) {
        navigate({ to: "/parent/$caseId/tests", params: { caseId: invite.case_id } });
      }
    }
  }, [invite, loading, navigate]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const profile = {
      student_name: studentName.trim(),
      date_of_birth: dateOfBirth,
      current_grade: currentGrade.trim(),
      desired_entry_grade: desiredEntryGrade.trim(),
    };
    if (!hasRequiredProfileFields(profile)) {
      toast.error(t("parent.profileRequired"));
      return;
    }
    setAccepting(true);
    try {
      if (isAuthenticated) await signOut();
      try {
        await signIn("password", {
          flow: "signUp",
          email: invite.parent_email,
          password,
          name: invite.parent_name ?? invite.parent_email,
        });
      } catch {
        await signIn("password", {
          flow: "signIn",
          email: invite.parent_email,
          password,
        });
      }
      await waitForAuthSession();
      const caseId = await acceptInvitation({
        token,
        student_name: profile.student_name,
        date_of_birth: profile.date_of_birth,
        current_grade: profile.current_grade,
        desired_entry_grade: profile.desired_entry_grade,
      });
      setAccepting(false);
      toast.success(t("invite.welcomeToast"));
      navigate({ to: "/parent/$caseId/tests", params: { caseId } });
    } catch (error) {
      setAccepting(false);
      toast.error(error instanceof Error ? error.message : "Could not accept invitation");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/60">
          <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
            <Logo />
          </div>
        </header>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Link not available</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Logo />
        </div>
      </header>
      <div className="mx-auto max-w-md px-6 py-16">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Invitation</p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          You've been invited
          {invite.student_name ? ` to begin ${invite.student_name}'s journey` : ""}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("invite.body", { org: org?.name ?? t("invite.defaultOrg") })}
        </p>

        <form
          onSubmit={handleAccept}
          className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-5 shadow-card"
        >
          <div className="space-y-1.5">
            <Label>{t("invite.emailLabel")}</Label>
            <Input value={invite.parent_email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("invite.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{t("invite.passwordHint")}</p>
          </div>
          <p className="border-t border-border pt-4 text-sm font-medium text-foreground">
            {t("invite.studentSectionTitle")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="student_name">{t("parent.fields.studentName")}</Label>
            <Input
              id="student_name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">{t("parent.fields.dob")}</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="current_grade">{t("parent.fields.currentGrade")}</Label>
            <Input
              id="current_grade"
              value={currentGrade}
              onChange={(e) => setCurrentGrade(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desired_grade">{t("parent.fields.desiredGrade")}</Label>
            <Input
              id="desired_grade"
              value={desiredEntryGrade}
              onChange={(e) => setDesiredEntryGrade(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={accepting}>
            {accepting ? t("invite.submitting") : t("invite.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
