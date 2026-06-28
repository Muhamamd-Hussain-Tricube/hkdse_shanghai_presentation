/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { CalendarCheck, Clock, Video, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/parent/$caseId/interview")({
  component: ParentInterviewBookingPage,
});

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement | null }) => void;
    };
  }
}

type CaseInfo = {
  id: string;
  status: string;
  student_name: string | null;
  organization: { id: string; name: string; calendly_url: string | null } | null;
};

function ParentInterviewBookingPage() {
  const { caseId } = Route.useParams();
  const caseDetail = useQuery(api.backend.caseDetail, { caseId: caseId as any });
  const updateCaseProfile = useMutation(api.backend.updateCaseProfile);
  const [info, setInfo] = useState<CaseInfo | null>(null);
  const [marking, setMarking] = useState(false);
  const calendlyRootRef = useRef<HTMLDivElement | null>(null);
  const [calendlyBlocked, setCalendlyBlocked] = useState(false);

  const loading = caseDetail === undefined;

  useEffect(() => {
    if (!caseDetail?.case) return;
    setInfo({
      id: caseDetail.case.id,
      status: caseDetail.case.status,
      student_name: caseDetail.case.student_name ?? null,
      organization: caseDetail.organization
        ? {
            id: caseDetail.organization.id,
            name: caseDetail.organization.name,
            calendly_url: caseDetail.organization.calendly_url ?? null,
          }
        : null,
    });
  }, [caseDetail]);

  const calendlyUrl = useMemo(
    () => info?.organization?.calendly_url ?? null,
    [info?.organization?.calendly_url],
  );

  // Robust Calendly inline widget initialization.
  // The "blank box" happens when the script/CSS is blocked or when the widget doesn't auto-init.
  useEffect(() => {
    if (!calendlyUrl) return;
    if (!calendlyRootRef.current) return;

    setCalendlyBlocked(false);

    const ensureCss = () => {
      if (document.getElementById("calendly-widget-css")) return;
      const link = document.createElement("link");
      link.id = "calendly-widget-css";
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(link);
    };

    const ensureScript = async () => {
      const existing = document.getElementById(
        "calendly-widget-script",
      ) as HTMLScriptElement | null;
      if (existing) {
        if (window.Calendly) return;
        await new Promise<void>((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Calendly script failed to load")),
            { once: true },
          );
        });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.id = "calendly-widget-script";
        s.src = "https://assets.calendly.com/assets/external/widget.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Calendly script failed to load"));
        document.body.appendChild(s);
      });
    };

    const init = async () => {
      try {
        ensureCss();
        await ensureScript();
        const calendly = window.Calendly;
        if (!calendly?.initInlineWidget) {
          throw new Error("Calendly initInlineWidget not available");
        }

        // Clear previous widget (e.g., if URL changes)
        if (calendlyRootRef.current) {
          calendlyRootRef.current.innerHTML = "";
        }

        calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: calendlyRootRef.current,
        });

        // If the widget is blocked (adblock/CSP/ITP), Calendly typically fails to inject its iframe.
        // Detect by checking for an iframe after a short delay (Calendly can be a bit slow).
        window.setTimeout(() => {
          const el = calendlyRootRef.current;
          const iframe = el?.querySelector("iframe");
          if (!iframe) setCalendlyBlocked(true);
        }, 3500);
      } catch (e) {
        setCalendlyBlocked(true);
      }
    };

    void init();
  }, [calendlyUrl]);

  const markScheduled = async () => {
    setMarking(true);
    try {
      await updateCaseProfile({ caseId: caseId as any, patch: { status: "interview_scheduled" } });

      toast.success("Thanks — we've noted your interview is scheduled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const orgName = info?.organization?.name ?? "your advisor";
  const alreadyScheduled = info?.status && info.status !== "test_completed";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Logo />
          <Link
            to="/parent/$caseId/hk"
            params={{ caseId }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to HK advisory
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-wider text-primary">HK advisory · Interview</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Book your advisory interview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Pick a time that works for {info?.student_name ?? "your child"} below. {orgName} will meet
          with you over a short video call to discuss the test results, hear your goals, and prepare
          a personalised school recommendation.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft">
            <Clock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">15–30 minutes</p>
              <p className="text-xs text-muted-foreground">Short and focused</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft">
            <Video className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Video call</p>
              <p className="text-xs text-muted-foreground">Link emailed after booking</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft">
            <CalendarCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Reschedule anytime</p>
              <p className="text-xs text-muted-foreground">Up to 24 hours before</p>
            </div>
          </div>
        </div>

        {alreadyScheduled && (
          <div className="mt-8 rounded-lg border border-success/40 bg-success/10 p-5">
            <p className="font-display text-lg text-foreground">Interview booked ✓</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You're all set. We'll see you on the call. If you need to reschedule, use the link in
              your Calendly confirmation email.
            </p>
          </div>
        )}

        {calendlyUrl ? (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href={calendlyUrl} target="_blank" rel="noreferrer">
                  Open Calendly to book
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={markScheduled}
                disabled={marking || alreadyScheduled === true}
              >
                {marking ? "Saving…" : "I've booked my interview"}
              </Button>
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              {calendlyBlocked ? (
                <div className="p-6 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Inline booking couldn’t load here.</p>
                  <p className="mt-1">
                    This is usually caused by an ad blocker, strict privacy settings, or a content
                    security policy. Please use the “Open Calendly to book” button above.
                  </p>
                </div>
              ) : (
                <div
                  ref={calendlyRootRef}
                  className="w-full"
                  style={{ minWidth: 320, height: "min(900px, 75vh)" }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-lg border border-border bg-surface p-8 shadow-soft">
            <p className="font-display text-lg text-foreground">
              {orgName} will reach out to schedule
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Online booking isn't set up yet for this organization. Your advisor will contact you
              directly to arrange a time.
            </p>
            <Button
              className="mt-5"
              onClick={markScheduled}
              disabled={marking || alreadyScheduled === true}
            >
              {marking ? "Saving…" : "Mark as scheduled"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
