import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <Logo />
          <nav className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                {t("home.signIn")}
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">{t("home.getStarted")}</Button>
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 text-xs text-muted-foreground">
          {t("home.parentHint")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("home.signInHere")}
          </Link>{" "}
          {t("home.parentHintRest")}
        </div>
      </header>
      {i18n.language === "zh-Hans" && (
        <div className="mx-auto max-w-6xl px-6 pt-3">
          <LocaleDisclaimerBanner />
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute left-[-15%] bottom-[-30%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              {t("home.badge")}
            </span>
            <h1 className="mt-6 font-display text-5xl font-medium tracking-tight text-foreground sm:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("home.heroBody")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg">{t("home.createOrg")}</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  {t("home.signInOutline")}
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("home.parentFooter")}</p>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="border-t border-border/60 bg-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-display text-3xl text-foreground">{t("home.journeyTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("home.journeyBody")}</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {(["s1", "s2", "s3", "s4", "s5"] as const).map((sk, i) => (
              <li
                key={sk}
                className="group rounded-xl border border-border bg-surface p-5 shadow-soft transition-shadow hover:shadow-card"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 font-display text-base font-medium text-primary">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">
                  {t(`home.steps.${sk}t`)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`home.steps.${sk}d`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>
            © {new Date().getFullYear()} Pathway Advisory. {t("home.footerCopy")}
          </p>
        </div>
      </footer>
    </div>
  );
}
