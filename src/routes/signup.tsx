import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLocalAuthActions } from "@/lib/auth-context";
import { useMutation } from "@/lib/app-data";
import { waitForAuthSession } from "@/lib/wait-for-auth";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Create your organization — Pathway Advisory" }] }),
});

const schema = z.object({
  fullName: z.string().trim().min(1, "Your name is required").max(100),
  orgName: z.string().trim().min(2, "Organization name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function SignupPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useLocalAuthActions();
  const createOrganization = useMutation(api.backend.createOrganizationWithOwner);
  const seedCatalogs = useMutation(api.backend.seedCatalogs);
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, orgName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);

    try {
      await signIn("password", {
        flow: "signUp",
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.fullName,
      });
      await waitForAuthSession();
      await createOrganization({ name: parsed.data.orgName });
      await seedCatalogs({});
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not create organization");
      return;
    }

    setLoading(false);
    toast.success(`Welcome to ${parsed.data.orgName}`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <Logo />
          <LanguageToggle />
        </div>
      </header>
      {i18n.language === "zh-Hans" && (
        <div className="mx-auto max-w-6xl px-6 pt-3">
          <LocaleDisclaimerBanner />
        </div>
      )}
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <h1 className="font-display text-3xl text-foreground">{t("signup.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("signup.formSubtitle")}</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("signup.fullName")}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orgName">{t("signup.orgName")}</Label>
            <Input
              id="orgName"
              placeholder={t("signup.orgPlaceholder")}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("signup.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("signup.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signup.creating") : t("signup.submit")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("signup.hasAccountLine")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("signup.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
