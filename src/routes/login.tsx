import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLocalAuthActions } from "@/lib/auth-context";
import { DEMO_ACCOUNTS, localApi } from "@/lib/local-demo/handlers";
import { redirectAfterLogin } from "@/lib/local-demo/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Pathway Advisory" }] }),
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function LoginPage() {
  const { t, i18n } = useTranslation();
  const { signIn } = useLocalAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const completeLogin = async (accountEmail: string, accountPassword: string) => {
    setLoading(true);
    try {
      await signIn("password", {
        flow: "signIn",
        email: accountEmail,
        password: accountPassword,
      });
      const destination = localApi.postLoginDestination();
      toast.success("Welcome back");
      redirectAfterLogin(destination);
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    }
  };

  const handleDemoLogin = (accountEmail: string, accountPassword: string) => {
    setEmail(accountEmail);
    setPassword(accountPassword);
    completeLogin(accountEmail, accountPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    await completeLogin(parsed.data.email, parsed.data.password);
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
        <h1 className="font-display text-3xl text-foreground">{t("login.welcomeBack")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("login.formSubtitle")}</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("login.email")}</Label>
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
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.submit")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("login.newHere")}{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {t("login.createOrgLink")}
          </Link>
        </p>

        <div className="mt-8 rounded-lg border border-border bg-surface/80 p-4 text-sm">
          <p className="font-medium text-foreground">Local demo accounts (no cloud)</p>
          <p className="mt-1 text-muted-foreground">
            Password for all: <span className="font-mono">DemoPass123!</span>
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{a.role}:</span>
                <button
                  type="button"
                  className="font-mono text-primary hover:underline disabled:opacity-50"
                  disabled={loading}
                  onClick={() => handleDemoLogin(a.email, a.password)}
                >
                  {a.email}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Sample class roster: download{" "}
            <a href="/demo-class-roster-30.csv" className="text-primary hover:underline">
              demo-class-roster-30.csv
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
