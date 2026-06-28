import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";

type ParentPageShellProps = {
  caseId: string;
  backTo?: { label: string; to: string; params?: Record<string, string> };
  children: React.ReactNode;
};

export function ParentPageShell({ caseId, backTo, children }: ParentPageShellProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            {backTo && (
              <Link
                to={backTo.to}
                params={backTo.params ?? { caseId }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {backTo.label}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <LanguageToggle />
            <span className="hidden text-muted-foreground sm:inline">{user?.email}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      </header>
      {i18n.language === "zh-Hans" && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <LocaleDisclaimerBanner />
        </div>
      )}
      {children}
    </div>
  );
}
