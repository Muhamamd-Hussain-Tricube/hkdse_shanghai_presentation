import { Outlet, createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { loadStore } from "@/lib/local-demo/store";
import { ensureDemoSeed } from "@/lib/local-demo/seed";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@/lib/app-data";
import { waitForAuthSession } from "@/lib/wait-for-auth";
import { api } from "@/lib/app-data";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const { user, loading, organizations, activeOrgId, setActiveOrgId, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    ensureDemoSeed();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    const sessionId = loadStore().authSessionUserId;
    if (!sessionId) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  const sessionPending = !user && loadStore().authSessionUserId;

  if (loading || sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeOrg = organizations.find((o) => o.organization_id === activeOrgId);

  const navItems = [
    { to: "/dashboard", label: t("dashboard.cases"), exact: true },
    { to: "/dashboard/classes", label: t("dashboard.classes") },
    { to: "/dashboard/invitations", label: t("dashboard.invitations") },
    { to: "/dashboard/settings", label: t("dashboard.settings") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Logo />
            {organizations.length > 0 && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("common.org")}
                </span>
                <select
                  value={activeOrgId ?? ""}
                  onChange={(e) => setActiveOrgId(e.target.value)}
                  className="rounded-md border border-input bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {organizations.map((o) => (
                    <option key={o.organization_id} value={o.organization_id}>
                      {o.organization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
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
        {i18n.language === "zh-Hans" && (
          <div className="mx-auto max-w-7xl px-6 pt-2">
            <LocaleDisclaimerBanner />
          </div>
        )}
        <nav className="mx-auto flex max-w-7xl gap-1 px-4">
          {navItems.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!activeOrg ? <CreateOrgRecovery /> : <Outlet />}
      </main>
    </div>
  );
}

function CreateOrgRecovery() {
  const { t } = useTranslation();
  const { refreshOrganizations } = useAuth();
  const createOrganization = useMutation(api.backend.createOrganizationWithOwner);
  const seedCatalogs = useMutation(api.backend.seedCatalogs);
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orgName.trim();
    if (trimmed.length < 2) {
      toast.error(t("dashboard.orgNameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await waitForAuthSession();
      await createOrganization({ name: trimmed });
      await seedCatalogs({});
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Could not create organization");
      return;
    }
    setSubmitting(false);
    toast.success(`Welcome to ${trimmed}`);
    await refreshOrganizations();
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8">
      <h2 className="font-display text-2xl text-foreground">{t("dashboard.createOrgTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.createOrgBody")}</p>
      <form onSubmit={handleCreate} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="orgName">{t("dashboard.orgNameLabel")}</Label>
          <Input
            id="orgName"
            placeholder={t("dashboard.orgPlaceholder")}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t("dashboard.creating") : t("dashboard.createSubmit")}
        </Button>
      </form>
    </div>
  );
}
