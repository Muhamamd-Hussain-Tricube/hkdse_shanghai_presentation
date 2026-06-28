import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClassCompletionRing } from "@/components/class/ClassCompletionRing";
import { useClassLocalStore } from "@/lib/class-local-store";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/classes/")({
  component: ClassesIndexPage,
});

function ClassesIndexPage() {
  const { activeOrgId } = useAuth();
  return <ClassesPageInner orgId={activeOrgId ?? "local-demo"} backTo="/dashboard" />;
}

export function ClassesPageInner({
  orgId,
  backTo,
  standalone = false,
}: {
  orgId: string;
  backTo?: string;
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const { listClasses, createClass } = useClassLocalStore(orgId);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error(t("classes.nameRequired"));
      return;
    }
    setCreating(true);
    try {
      createClass(name.trim(), gradeLabel.trim() || undefined);
      toast.success(t("classes.created"));
      setName("");
      setGradeLabel("");
      setShowForm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create class");
    } finally {
      setCreating(false);
    }
  };

  const classBase = standalone ? "/demo/classes" : "/dashboard/classes";

  return (
    <div className="space-y-8">
      {standalone && (
        <header className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              {t("classes.localDemoBadge")}
            </span>
          </div>
        </header>
      )}

      <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("classes.heroTag")}
        </p>
        <h1 className="mt-1 font-display text-3xl text-foreground">{t("classes.heroTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("classes.heroSubtitle")}</p>
        {standalone && (
          <p className="mt-2 text-sm text-muted-foreground">{t("classes.localDemoHint")}</p>
        )}
        <Button className="mt-4" onClick={() => setShowForm(true)}>
          {t("classes.newClass")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-xl text-foreground">{t("classes.createTitle")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="className">{t("classes.className")}</Label>
              <Input
                id="className"
                placeholder={t("classes.classNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gradeLabel">{t("classes.gradeLabel")}</Label>
              <Input
                id="gradeLabel"
                placeholder={t("classes.gradePlaceholder")}
                value={gradeLabel}
                onChange={(e) => setGradeLabel(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t("classes.creating") : t("classes.createSubmit")}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl text-foreground">{t("classes.listTitle")}</h2>
        {!listClasses.length ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/50 p-12 text-center">
            <p className="text-muted-foreground">{t("classes.empty")}</p>
            <Button className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
              {t("classes.newClass")}
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listClasses.map((c) => (
              <Link
                key={c.id}
                to={`${classBase}/$classId`}
                params={{ classId: c.id }}
                className="rounded-lg border border-border bg-surface p-5 shadow-soft transition-shadow hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-foreground">{c.name}</h3>
                    {c.grade_label && (
                      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {c.grade_label}
                      </span>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {c.student_count} {t("classes.students")}
                      {c.latest_round && <> · {c.latest_round.label}</>}
                    </p>
                  </div>
                  {c.student_count > 0 && (
                    <ClassCompletionRing
                      pct={c.completion_pct}
                      completed={Math.round((c.completion_pct / 100) * c.student_count)}
                      total={c.student_count}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {backTo && (
        <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("classes.backToDashboard")}
        </Link>
      )}
    </div>
  );
}
