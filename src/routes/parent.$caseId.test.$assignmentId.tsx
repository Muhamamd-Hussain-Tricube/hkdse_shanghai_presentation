/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation, useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  UserRound,
  Users,
  Volume2,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocaleDisclaimerBanner } from "@/components/LocaleDisclaimerBanner";
import { gatesInterview, type TestType } from "@/lib/test-types";
import { HKDSE_PAPER_META, resolveAssignedPapers, type HkdsePaperId } from "@/lib/hkdse-paper-meta";
import type {
  TestAssignment as AssignmentRow,
  TestSession as TestSessionRow,
} from "@/lib/backend-types";

type Question = {
  id: string;
  prompt: string;
  marks: number;
  type: "mcq" | "short_text" | "number" | "essay" | "likert";
  options?: string[];
  essay_prompts?: string[];
  answer?: string;
  rubric?: string;
};

type Section = {
  id: string;
  title: string;
  minutes: number;
  marks: number;
  passage?: string;
  listening_script?: string;
  audio_url?: string;
  questions: Question[];
};

type TestPayload = { title: string; sections: Section[] };

type AnswerValue = string;

const EXPECTED_SECTION_IDS: Record<TestType, string[]> = {
  hk_aptitude: ["A", "B", "C", "D", "E"],
  ielts_practice: ["R", "W", "L", "S"],
  curriculum_fit: ["S1", "S2", "S3"],
};

const PAPER4_AI_TURNS = [
  {
    name: "Alicia",
    role: "AI speaker 1",
    color: "bg-sky-500",
    pitch: 1.08,
    rate: 0.95,
    text: "To start, I think people dislike photo-taking when it disturbs their daily life. The Vermont example is not only about cameras, but also parking near private homes and arguing with residents. In Hong Kong, I can imagine similar problems in crowded neighbourhoods.",
  },
  {
    name: "Marcus",
    role: "AI speaker 2",
    color: "bg-emerald-500",
    pitch: 0.82,
    rate: 0.9,
    text: "I agree. Some places become popular because of social media, and then residents have to deal with noise, rubbish and blocked pavements. I think areas like the harbourfront, Central streets with old buildings, and famous housing estates can attract too many visitors at the same time.",
  },
  {
    name: "Sophia",
    role: "AI speaker 3",
    color: "bg-violet-500",
    pitch: 1.18,
    rate: 0.92,
    text: "Maybe the key question is whether rules should be strict. The Berlin restaurant example is interesting because the owner is protecting the experience, not just privacy. I think Hong Kong may need different rules for different places instead of one rule everywhere.",
  },
];

const PAPER4_GROUP_RESPONSES = [
  "I think the problem is not simply taking photos, but how people behave when they take them. In Hong Kong, places like the Monster Building, the Tsim Sha Tsui harbourfront, and some old cafes can become crowded because visitors want the same picture. Residents may feel their privacy is being ignored, and shop owners may lose control of the atmosphere.",
  "I agree that rules are needed, but I would avoid a complete ban in most public places. A better balance would be clear signs, no-photo zones near private homes, and reminders not to block entrances or roads. For restaurants, I think owners should be allowed to set their own rules, like the Berlin example, because the dining experience is part of their business.",
  "To conclude, Hong Kong should still welcome visitors who want to take photos, because photos can promote the city. But we need respectful behaviour. If tourists keep moving, ask before photographing people, and follow local signs, photo-taking can be enjoyable without disturbing residents.",
];

const PAPER4_INDIVIDUAL_QA = [
  {
    q: "Do you like taking photos?",
    a: "Yes, I like taking photos, especially when I travel or spend time with friends. Photos help me remember small details that I might forget later.",
  },
  {
    q: "Do you like to share photos with friends?",
    a: "I do share photos with friends, but usually only in private chats. I do not post everything online because some moments feel more personal.",
  },
  {
    q: "Is taking photos a popular hobby among teenagers?",
    a: "Yes, I think it is very popular among teenagers because phones make it easy. Many people take photos of food, outfits, concerts, and nice views.",
  },
  {
    q: "Have you ever gone to a place just to take photos?",
    a: "Yes, I have gone to the harbourfront and some cafes mainly to take photos. But I try not to block other people or stay too long.",
  },
  {
    q: "Is taking photos an important part of travelling?",
    a: "Yes, photos are an important part of travelling because they help us remember the trip. However, if we only focus on photos, we may not enjoy the place properly.",
  },
  {
    q: "Who likes taking photos more: younger people or older people?",
    a: "I think younger people probably take more photos because they use social media more often. Older people may take fewer photos, but their photos may be more meaningful.",
  },
  {
    q: "Can taking photos spoil an experience?",
    a: "Yes, it can spoil an experience if people only care about getting the perfect picture. It can also annoy others if they block paths or make too much noise.",
  },
  {
    q: "Do you think tourism causes disruption to local people?",
    a: "Yes, tourism can cause disruption when there are too many visitors in residential areas. But with good rules and respectful behaviour, tourism can still benefit local businesses.",
  },
];

function parseTestPayload(row: TestSessionRow | null): TestPayload | null {
  const raw = row?.test_payload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.sections)) return null;
  return raw as TestPayload;
}

function payloadMismatchReason(payload: TestPayload | null, expectedType: TestType): string | null {
  if (!payload) return null;
  const expected = EXPECTED_SECTION_IDS[expectedType];
  const actual = payload.sections.map((s) => s.id);
  const missing = expected.filter((id) => !actual.includes(id));
  const unexpected = actual.filter((id) => !expected.includes(id));
  if (missing.length === 0 && unexpected.length === 0 && actual.length === expected.length)
    return null;
  return `Expected sections ${expected.join(", ")} but found ${actual.join(", ")}.`;
}

export const Route = createFileRoute("/parent/$caseId/test/$assignmentId")({
  component: StudentAssignmentTestPage,
});

function StudentAssignmentTestPage() {
  const { t, i18n } = useTranslation();
  const { caseId, assignmentId } = Route.useParams();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const resolveSession = useMutation(api.backend.resolveTestSession);
  const startTestMutation = useMutation(api.backend.startTest);
  const upsertResponse = useMutation(api.backend.upsertTestResponse);
  const generateTestAction = useAction(api.ai.generateTest);
  const gradeTestAction = useAction(api.ai.gradeTest);
  const studentTests = useQuery(
    api.backend.studentTests,
    user ? { caseId: caseId as any } : "skip",
  );

  const [session, setSession] = useState<TestSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  // Linear progression: index into payload.sections
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionStartedAt, setSectionStartedAt] = useState<Record<string, number>>({});
  // Optimistic submitted state: flips immediately when student presses Submit
  const [optimisticSubmitted, setOptimisticSubmitted] = useState(false);
  const [, setTick] = useState(0); // forces re-render every second for timers
  const hasPublishedReport = !!studentTests?.hasPublishedReport;
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [testType, setTestType] = useState<TestType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeHkdsePaper, setActiveHkdsePaper] = useState<HkdsePaperId | null>(null);

  const saveTimers = useRef<Record<string, number>>({});
  const currentSectionIdRef = useRef<string>("A");
  const loadStartedRef = useRef(false);

  useEffect(() => {
    loadStartedRef.current = false;
  }, [caseId, assignmentId]);

  // Load assignment + session + responses
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    (async () => {
      setLoadError(null);
      try {
        const resolved = await resolveSession({
          caseId: caseId as any,
          assignmentId: assignmentId as any,
        });
        const { session: row, assignment: asn, responses } = resolved;
        setAssignment(asn as AssignmentRow);
        setTestType(asn.test_type as TestType);
        setSession(row as TestSessionRow);
        if (row.test_type !== asn.test_type) {
          toast.error("Session type mismatch detected. We will regenerate a matching test.");
        }
        const map: Record<string, AnswerValue> = {};
        for (const r of responses as Array<{ question_id: string; answer: { value: string } }>) {
          map[r.question_id] = r.answer?.value ?? "";
        }
        setAnswers(map);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load test");
        setLoading(false);
        loadStartedRef.current = false;
        return;
      }
      setLoading(false);
    })();
  }, [caseId, assignmentId, user, authLoading, resolveSession]);

  // Tick for timers
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  // Poll for grading completion when in submitted state
  useEffect(() => {
    if (!session) return;
    const isSubmitted = optimisticSubmitted || session.status === "submitted";
    if (!isSubmitted || session.status === "graded" || session.status === "failed") return;
    const i = window.setInterval(async () => {
      try {
        const data = await resolveSession({
          caseId: caseId as any,
          assignmentId: assignmentId as any,
        });
        if (
          data.session &&
          (data.session.status === "graded" || data.session.status === "failed")
        ) {
          setSession(data.session as TestSessionRow);
          setOptimisticSubmitted(false);
          window.clearInterval(i);
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => window.clearInterval(i);
  }, [session, optimisticSubmitted, resolveSession, caseId, assignmentId]);

  const generateTest = async () => {
    if (!session) {
      toast.error("Test session not ready yet — please refresh the page.");
      return;
    }
    setGenerating(true);
    try {
      const resolved = await resolveSession({
        caseId: caseId as any,
        assignmentId: assignmentId as any,
      });

      const activeSession = resolved.session;
      const activeAssignment = resolved.assignment;
      if (activeSession.test_type !== activeAssignment.test_type) {
        throw new Error("Test session does not match this assignment.");
      }

      setSession(activeSession);
      setAssignment(activeAssignment);
      setTestType(activeAssignment.test_type as TestType);

      const content_locale = i18n.language === "zh-Hans" ? "zh-Hans" : "en";
      await generateTestAction({
        sessionId: activeSession.id as any,
        assignmentId: assignmentId as any,
        contentLocale: content_locale,
      });
      const refreshedData = await resolveSession({
        caseId: caseId as any,
        assignmentId: assignmentId as any,
      });
      const refreshed = refreshedData.session;
      if (refreshed.test_type !== activeAssignment.test_type) {
        throw new Error("Generated test type does not match this assignment.");
      }
      setSession(refreshed);
      setAnswers({});
      setCurrentSectionIndex(0);
      setSectionStartedAt({});
      toast.success("Your test is ready.");
    } catch (e: unknown) {
      console.error("[generate-test] failed", e);
      toast.error(e instanceof Error ? e.message : "Could not generate test");
    } finally {
      setGenerating(false);
    }
  };

  const startTest = async (sectionId?: string) => {
    if (!session) return;
    await startTestMutation({ sessionId: session.id as any, assignmentId: assignmentId as any });
    const now = Date.now();
    setSession({ ...session, status: "in_progress", started_at: now });
    const payload = parseTestPayload(session);
    const targetIndex =
      sectionId && payload
        ? Math.max(
            0,
            payload.sections.findIndex((s) => s.id === sectionId),
          )
        : 0;
    const firstId = payload?.sections[targetIndex]?.id ?? "A";
    setCurrentSectionIndex(targetIndex);
    setSectionStartedAt({ [firstId]: Date.now() });
  };

  const handleAnswerChange = (q: Question, value: string, sectionId: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    if (!session) return;
    const key = q.id;
    if (saveTimers.current[key]) window.clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = window.setTimeout(async () => {
      await upsertResponse({
        sessionId: session.id as any,
        sectionId,
        questionId: q.id,
        answer: { type: q.type, value },
      });
    }, 600);
  };

  const flushPendingSaves = async () => {
    // Wait long enough for the 600ms debounce to fire
    await new Promise((r) => setTimeout(r, 700));
  };

  const advanceToNextSection = () => {
    const tp = parseTestPayload(session);
    if (!tp) return;
    const next = currentSectionIndex + 1;
    if (next >= tp.sections.length) return;
    const nextId = tp.sections[next].id;
    setCurrentSectionIndex(next);
    setSectionStartedAt((s) => ({ ...s, [nextId]: Date.now() }));
  };

  const submitTest = async () => {
    if (!session) return;
    // Switch to grading screen IMMEDIATELY so the student sees feedback
    setOptimisticSubmitted(true);
    try {
      await flushPendingSaves();
      setSession((s) => (s ? { ...s, status: "submitted" } : s));
      void gradeTestAction({ sessionId: session.id as any }).catch((error) => {
        console.error("[grade-test] failed", error);
        toast.error("Grading failed — please contact your advisor.");
      });
      const isHk = gatesInterview(resolvedTestType);
      navigate({
        to:
          resolvedTestType === "ielts_practice"
            ? "/parent/$caseId/results/hkdse"
            : isHk
              ? "/parent/$caseId/hk"
              : "/parent/$caseId/tests",
        params: { caseId },
      });
      toast.success(t("parent.test.submitToast"));
    } catch (e: unknown) {
      console.error("[submit-test] failed", e);
      toast.error(e instanceof Error ? e.message : "Submission failed");
      setOptimisticSubmitted(false);
    }
  };

  const testPayload = useMemo(() => parseTestPayload(session), [session]);
  const assignedHkdsePapers = useMemo(
    () =>
      resolveAssignedPapers((assignment?.hkdse_papers as HkdsePaperId[] | undefined) ?? undefined),
    [assignment],
  );
  const activePaperPayload = useMemo(() => {
    if (!testPayload || !activeHkdsePaper || activeHkdsePaper === "S") return testPayload;
    return {
      ...testPayload,
      sections: testPayload.sections.filter((s) => s.id === activeHkdsePaper),
    };
  }, [testPayload, activeHkdsePaper]);

  const isPaperStarted = (paperId: HkdsePaperId) => {
    if (!testPayload) return false;
    const section = testPayload.sections.find((s) => s.id === paperId);
    if (!section) return false;
    return section.questions.some((q) => (answers[q.id] ?? "").toString().trim().length > 0);
  };

  const startHkdsePaper = async (paperId: HkdsePaperId) => {
    await startTest(paperId);
    setActiveHkdsePaper(paperId);
  };

  const completeHkdsePaper = () => {
    setActiveHkdsePaper(null);
    toast.success("Paper saved. Continue with other papers or submit for HKDSE marking.");
  };

  const resolvedTestType: TestType = testType ?? "hk_aptitude";
  const sessionTypeMismatch = session && assignment && session.test_type !== assignment.test_type;
  const sectionMismatch = useMemo(
    () => payloadMismatchReason(testPayload, resolvedTestType),
    [testPayload, resolvedTestType],
  );
  const contentMismatchReason = sessionTypeMismatch
    ? `Assignment type ${assignment?.test_type} does not match session type ${session?.test_type}.`
    : sectionMismatch;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Link
          to="/parent/$caseId/tests"
          params={{ caseId }}
          className="text-sm text-primary underline"
        >
          {t("student.tests.backToList")}
        </Link>
      </div>
    );
  }

  const isFailed = session?.status === "failed";
  const hideScoresPendingReport =
    resolvedTestType === "hk_aptitude" &&
    session &&
    !hasPublishedReport &&
    (optimisticSubmitted || session.status === "submitted" || session.status === "graded");
  const showPostReportComplete =
    resolvedTestType === "hk_aptitude" &&
    session &&
    session.status === "graded" &&
    hasPublishedReport;
  const showSubmittedGeneric =
    resolvedTestType !== "hk_aptitude" &&
    session &&
    (optimisticSubmitted || session.status === "submitted" || session.status === "graded");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-3">
          <div className="flex items-center gap-4">
            <Logo />
            <Link
              to={gatesInterview(resolvedTestType) ? "/parent/$caseId/hk" : "/parent/$caseId/tests"}
              params={{ caseId }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {gatesInterview(resolvedTestType)
                ? t("student.hk.backToJourney")
                : t("student.tests.backToList")}
            </Link>
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

      <main className="mx-auto max-w-5xl space-y-3 px-6 py-10">
        {!testPayload ? (
          <Intro testType={resolvedTestType} onGenerate={generateTest} generating={generating} />
        ) : contentMismatchReason ? (
          <PayloadMismatchView
            reason={contentMismatchReason}
            onRegenerate={generateTest}
            generating={generating}
          />
        ) : isFailed ? (
          <FailedView message={session?.grading_error ?? undefined} />
        ) : showPostReportComplete ? (
          <PostReportTestComplete caseId={caseId} />
        ) : hideScoresPendingReport ? (
          <TestSubmittedNextSteps caseId={caseId} hkJourney />
        ) : showSubmittedGeneric ? (
          <TestSubmittedNextSteps caseId={caseId} toResults />
        ) : resolvedTestType === "ielts_practice" &&
          testPayload &&
          (session?.status === "not_started" || session?.status === "in_progress") &&
          activeHkdsePaper === null ? (
          <HkdsePaperPicker
            payload={testPayload}
            assignedPapers={assignedHkdsePapers}
            paperStarted={isPaperStarted}
            onStartPaper={startHkdsePaper}
            onSubmitAll={submitTest}
            sessionStatus={session?.status ?? "not_started"}
          />
        ) : session?.status === "not_started" ? (
          <ReadyToStart
            testType={resolvedTestType}
            payload={testPayload}
            onStart={() => startTest()}
          />
        ) : resolvedTestType === "ielts_practice" && activeHkdsePaper === "S" ? (
          <HkdsePaper4Runner
            section={testPayload!.sections.find((s) => s.id === "S") ?? testPayload!.sections[0]}
            answers={answers}
            onAnswer={(q, v) => handleAnswerChange(q, v, "S")}
            onSubmit={completeHkdsePaper}
            submitLabel="Save Paper 4 & return to papers"
          />
        ) : resolvedTestType === "ielts_practice" && activePaperPayload ? (
          <TestRunner
            payload={activePaperPayload}
            answers={answers}
            onAnswer={(q, v) => {
              const sec = activePaperPayload.sections[0];
              const sid = sec?.id ?? activeHkdsePaper ?? "R";
              handleAnswerChange(q, v, sid);
            }}
            currentSectionIndex={0}
            sectionStartedAt={sectionStartedAt}
            onAdvance={() => undefined}
            onSubmit={completeHkdsePaper}
            testType={resolvedTestType}
            singlePaperMode
          />
        ) : (
          <TestRunner
            payload={testPayload}
            answers={answers}
            onAnswer={(q, v) => {
              const sec = testPayload.sections[currentSectionIndex];
              const sid = sec?.id ?? "A";
              currentSectionIdRef.current = sid;
              handleAnswerChange(q, v, sid);
            }}
            currentSectionIndex={currentSectionIndex}
            sectionStartedAt={sectionStartedAt}
            onAdvance={advanceToNextSection}
            onSubmit={submitTest}
            testType={resolvedTestType}
          />
        )}
      </main>
    </div>
  );
}

function introKey(testType: TestType, key: string) {
  return `student.testIntro.${testType}.${key}` as const;
}

function Intro({
  testType,
  onGenerate,
  generating,
}: {
  testType: TestType;
  onGenerate: () => void;
  generating: boolean;
}) {
  const { t } = useTranslation();
  const isHk = testType === "hk_aptitude";
  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      {isHk && (
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t(introKey(testType, "step"))}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl text-foreground">
        {t(introKey(testType, "title"))}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {t(introKey(testType, "body"))}
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{t(introKey(testType, "bullet1"))}</li>
        <li>{t(introKey(testType, "bullet2"))}</li>
        <li>{t(introKey(testType, "bullet3"))}</li>
        <li>{t(introKey(testType, "bullet4"))}</li>
      </ul>
      <Button className="mt-6" onClick={onGenerate} disabled={generating}>
        {generating ? t("parent.test.preparing") : t("parent.test.prepare")}
      </Button>
      {generating && (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-primary" />
          <span>{t("parent.test.prepareWait")}</span>
        </div>
      )}
    </div>
  );
}

function HkdsePaperPicker({
  payload,
  assignedPapers,
  paperStarted,
  onStartPaper,
  onSubmitAll,
  sessionStatus,
}: {
  payload: TestPayload;
  assignedPapers: HkdsePaperId[];
  paperStarted: (paperId: HkdsePaperId) => boolean;
  onStartPaper: (paperId: HkdsePaperId) => void;
  onSubmitAll: () => void;
  sessionStatus: string;
}) {
  const papers = HKDSE_PAPER_META.filter((p) => assignedPapers.includes(p.id));
  const anyStarted = papers.some((p) => paperStarted(p.id));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          HKDSE English Language
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">{payload.title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Your teacher assigned{" "}
          {papers.length === 4 ? "the full HKDSE English set" : `${papers.length} paper(s)`}.
          Complete each paper, then submit for marking using HKEAA-style descriptors.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {papers.map((paper) => {
          const section = payload.sections.find((s) => s.id === paper.id);
          const done = paperStarted(paper.id);
          return (
            <article
              key={paper.id}
              className={`rounded-lg border bg-surface p-5 ${
                done ? "border-success/40" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {paper.label}
                  </p>
                  <h2 className="mt-1 font-display text-xl text-foreground">{paper.title}</h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {section?.minutes ?? paper.minutes} min
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {paper.id === "S"
                  ? "Group discussion with AI classmates and individual examiner Q&A."
                  : paper.id === "L"
                    ? "Listening audio plus Data File integrated tasks."
                    : paper.id === "W"
                      ? "Guided Part A and extended Part B writing."
                      : "Reading comprehension across Parts A and B."}
              </p>
              {done && <p className="mt-2 text-xs font-medium text-success">Responses saved</p>}
              <Button className="mt-5" onClick={() => onStartPaper(paper.id)}>
                {paper.id === "S" ? (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    {done ? "Continue Paper 4" : "Start Paper 4"}
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {done ? `Continue ${paper.title}` : `Start ${paper.title}`}
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      {sessionStatus === "in_progress" && anyStarted && (
        <section className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h3 className="font-display text-xl text-foreground">Submit for HKDSE marking</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When you have finished your assigned papers, submit to receive marks and feedback
            aligned to HKEAA assessment criteria.
          </p>
          <Button className="mt-4" onClick={onSubmitAll}>
            Submit test for marking
          </Button>
        </section>
      )}
    </div>
  );
}

function speakDemoText(text: string, pitch: number, rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
  if (englishVoice) utterance.voice = englishVoice;
  utterance.pitch = pitch;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

function HkdsePaper4Runner({
  section,
  answers,
  onAnswer,
  onSubmit,
  submitLabel = "Submit Paper 4 Speaking",
}: {
  section: Section;
  answers: Record<string, AnswerValue>;
  onAnswer: (q: Question, v: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const groupQuestion = section.questions[0];
  const individualQuestion = section.questions[1];
  const [groupResponses, setGroupResponses] = useState<string[]>(
    groupQuestion && answers[groupQuestion.id]
      ? String(answers[groupQuestion.id]).split("\n\n")
      : [],
  );
  const [individualResponses, setIndividualResponses] = useState<string[]>(
    individualQuestion && answers[individualQuestion.id]
      ? String(answers[individualQuestion.id]).split("\n\n").filter(Boolean)
      : [],
  );
  const [groupTurn, setGroupTurn] = useState(0);
  const [individualTurn, setIndividualTurn] = useState(0);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [analysingKey, setAnalysingKey] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recordingKey) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recordingKey]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const groupComplete = groupResponses.length >= PAPER4_GROUP_RESPONSES.length;
  const individualComplete = individualResponses.length >= PAPER4_INDIVIDUAL_QA.length;

  const startRecording = (key: string) => {
    setSeconds(0);
    setRecordingKey(key);
    setAnalysingKey(null);
  };

  const stopGroupRecording = (index: number) => {
    const key = `group-${index}`;
    setRecordingKey(null);
    setAnalysingKey(key);
    window.setTimeout(() => {
      const next = [...groupResponses];
      next[index] = PAPER4_GROUP_RESPONSES[index];
      const compact = next.filter(Boolean);
      setGroupResponses(compact);
      if (groupQuestion) onAnswer(groupQuestion, compact.join("\n\n"));
      setAnalysingKey(null);
      setGroupTurn(Math.min(index + 1, PAPER4_GROUP_RESPONSES.length - 1));
    }, 900);
  };

  const stopIndividualRecording = (index: number) => {
    const key = `individual-${index}`;
    setRecordingKey(null);
    setAnalysingKey(key);
    window.setTimeout(() => {
      const next = [...individualResponses];
      next[index] = PAPER4_INDIVIDUAL_QA[index].a;
      const compact = next.filter(Boolean);
      setIndividualResponses(compact);
      if (individualQuestion) onAnswer(individualQuestion, compact.join("\n\n"));
      setAnalysingKey(null);
      setIndividualTurn(Math.min(index + 1, PAPER4_INDIVIDUAL_QA.length - 1));
    }, 700);
  };

  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const currentIndividual = PAPER4_INDIVIDUAL_QA[individualTurn];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              HKDSE English Language Paper 4
            </p>
            <h1 className="mt-1 font-display text-3xl text-foreground">Speaking practice room</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Part A is a group interaction with three AI classmates. Part B is an individual
              examiner response.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Paper timer</p>
            <p className="font-display text-2xl text-foreground">20:00</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/20 p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Candidate prompt</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-md border border-border bg-background p-5 text-sm leading-relaxed">
            <h2 className="font-display text-xl text-foreground">
              Photo-taking visitors not welcomed by everyone
            </h2>
            <p className="mt-3 text-muted-foreground">
              We often take photos of scenery and food, and see others posting these pictures on
              social media. In some places, however, people are pushing back against this trend.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {["Vermont, USA", "Mount Fuji, Japan", "Berlin, Germany"].map((place, i) => (
                <div key={place} className="rounded-md border border-border bg-surface p-3">
                  <h3 className="font-medium text-foreground">{place}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {i === 0
                      ? "Roads were closed after crowds parked near homes, damaged property and argued with residents."
                      : i === 1
                        ? "A town blocked a famous view because tourists ignored rubbish and traffic rules."
                        : "A top restaurant banned photos and videos to protect privacy and appreciation of the food."}
                  </p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-md border border-border bg-background p-5 text-sm">
            <h3 className="font-medium text-foreground">You may want to talk about</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>why people might not like others taking photos in public places</li>
              <li>places in Hong Kong that are popular for taking photos</li>
              <li>whether Hong Kong needs rules for photo taking in public places</li>
              <li>anything else you think is important</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Part A - Group Interaction
            </p>
            <h2 className="mt-1 font-display text-2xl text-foreground">AI classmates discussion</h2>
          </div>
          {groupComplete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Group response captured
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {PAPER4_AI_TURNS.map((turn, index) => {
            const studentResponse = groupResponses[index];
            const isActive = index <= groupTurn || !!studentResponse;
            if (!isActive) return null;
            const recording = recordingKey === `group-${index}`;
            const analysing = analysingKey === `group-${index}`;
            return (
              <div key={turn.name} className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${turn.color} text-sm font-semibold text-white`}
                      >
                        {turn.name[0]}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{turn.name}</p>
                        <p className="text-xs text-muted-foreground">{turn.role}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => speakDemoText(turn.text, turn.pitch, turn.rate)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Play voice
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{turn.text}</p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Student response</p>
                        <p className="text-xs text-muted-foreground">
                          {recording
                            ? `Recording ${timer}`
                            : analysing
                              ? "Analysing response"
                              : "Your turn"}
                        </p>
                      </div>
                    </div>
                    {studentResponse ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                        Saved
                      </span>
                    ) : recording ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => stopGroupRecording(index)}
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => startRecording(`group-${index}`)}
                        disabled={!!analysingKey}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Record
                      </Button>
                    )}
                  </div>
                  {recording && <Waveform />}
                  {studentResponse && (
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {studentResponse}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {groupComplete && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Part B - Individual Response
              </p>
              <h2 className="mt-1 font-display text-2xl text-foreground">Examiner questions</h2>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Question {Math.min(individualResponses.length + 1, PAPER4_INDIVIDUAL_QA.length)} of{" "}
              {PAPER4_INDIVIDUAL_QA.length}
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Examiner</p>
            <p className="mt-2 font-medium text-foreground">{currentIndividual.q}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {individualResponses[individualTurn] ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setIndividualTurn(Math.min(individualTurn + 1, PAPER4_INDIVIDUAL_QA.length - 1))
                  }
                  disabled={individualTurn >= PAPER4_INDIVIDUAL_QA.length - 1}
                >
                  Next question
                </Button>
              ) : recordingKey === `individual-${individualTurn}` ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => stopIndividualRecording(individualTurn)}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => startRecording(`individual-${individualTurn}`)}
                  disabled={!!analysingKey}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Record answer
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {recordingKey === `individual-${individualTurn}`
                  ? `Recording ${timer}`
                  : analysingKey === `individual-${individualTurn}`
                    ? "Analysing response"
                    : "Answers save automatically"}
              </span>
            </div>
            {recordingKey === `individual-${individualTurn}` && <Waveform />}
            {individualResponses[individualTurn] && (
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                {individualResponses[individualTurn]}
              </p>
            )}
          </div>

          {individualResponses.length > 0 && (
            <div className="mt-5 grid gap-2 md:grid-cols-4">
              {PAPER4_INDIVIDUAL_QA.map((item, index) => (
                <div
                  key={item.q}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    individualResponses[index]
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground"
                  }`}
                >
                  Q{index + 1} {individualResponses[index] ? "saved" : "pending"}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {groupComplete && individualComplete && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5">
          <div>
            <p className="font-medium text-foreground">Paper 4 complete</p>
            <p className="text-sm text-muted-foreground">
              Submit now to generate the speaking band report and examiner feedback.
            </p>
          </div>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </section>
      )}
    </div>
  );
}

function Waveform() {
  return (
    <div className="mt-4 flex h-10 items-end gap-1">
      {Array.from({ length: 32 }).map((_, i) => (
        <span
          key={i}
          className="w-full animate-pulse rounded-t bg-primary/70"
          style={{ height: `${14 + ((i * 13) % 24)}px` }}
        />
      ))}
    </div>
  );
}

function ReadyToStart({
  testType,
  payload,
  onStart,
}: {
  testType: TestType;
  payload: TestPayload;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      <h1 className="font-display text-3xl text-foreground">
        {payload.title || t(introKey(testType, "title"))}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {t(introKey(testType, "readyBody"))}
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2">{t("parent.test.tableSection")}</th>
              <th className="px-4 py-2">{t("parent.test.tableArea")}</th>
              <th className="px-4 py-2">{t("parent.test.tableTime")}</th>
              <th className="px-4 py-2">{t("parent.test.tableMarks")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payload.sections.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium">{s.id}</td>
                <td className="px-4 py-2">{s.title}</td>
                <td className="px-4 py-2">{s.minutes} min</td>
                <td className="px-4 py-2">{s.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-6" onClick={onStart}>
        {t("parent.test.startTest")}
      </Button>
    </div>
  );
}

function TestSubmittedNextSteps({
  caseId,
  toResults,
  hkJourney,
}: {
  caseId: string;
  toResults?: boolean;
  hkJourney?: boolean;
}) {
  const { t } = useTranslation();
  const backTo = toResults
    ? "/parent/$caseId/tests"
    : hkJourney
      ? "/parent/$caseId/hk"
      : "/parent/$caseId/tests";
  const backLabel = toResults
    ? t("student.tests.backToList")
    : hkJourney
      ? t("student.hk.backToJourney")
      : t("student.tests.backToList");
  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {t("parent.test.introTitle")}
      </p>
      <h2 className="mt-2 font-display text-3xl text-foreground">
        {t("parent.test.submittedTitle")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {toResults ? t("student.tests.submittedBodyResults") : t("parent.test.submittedBody")}
      </p>
      <Button asChild className="mt-6">
        <Link to={backTo} params={{ caseId }}>
          {backLabel}
        </Link>
      </Button>
    </div>
  );
}

function PostReportTestComplete({ caseId }: { caseId: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {t("parent.test.introTitle")}
      </p>
      <h2 className="mt-2 font-display text-3xl text-foreground">
        {t("parent.test.postReportTitle")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {t("parent.test.postReportBody")}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/parent/$caseId/report" params={{ caseId }}>
            {t("parent.test.viewAdvisoryReport")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/parent/$caseId/hk" params={{ caseId }}>
            {t("student.hk.backToJourney")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FailedView({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
      <h2 className="font-display text-2xl text-foreground">{t("parent.test.failedTitle")}</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("parent.test.failedBodyPrefix")}
        {message ? `: ${message}` : ""}. {t("parent.test.failedBodySuffix")}
      </p>
    </div>
  );
}

function PayloadMismatchView({
  reason,
  onRegenerate,
  generating,
}: {
  reason: string;
  onRegenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-8">
      <h2 className="font-display text-2xl text-foreground">Test content is out of sync</h2>
      <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Regenerate this test to load the correct sections for the assigned test type.
      </p>
      <Button className="mt-6" onClick={onRegenerate} disabled={generating}>
        {generating ? "Preparing test..." : "Regenerate test"}
      </Button>
    </div>
  );
}

function TestRunner({
  payload,
  answers,
  onAnswer,
  currentSectionIndex,
  sectionStartedAt,
  onAdvance,
  onSubmit,
  testType,
  singlePaperMode,
}: {
  payload: TestPayload;
  answers: Record<string, AnswerValue>;
  onAnswer: (q: Question, v: string) => void;
  currentSectionIndex: number;
  sectionStartedAt: Record<string, number>;
  onAdvance: () => void;
  onSubmit: () => void;
  testType?: string;
  singlePaperMode?: boolean;
}) {
  const { t } = useTranslation();
  const totalSections = payload.sections.length;
  const section = payload.sections[currentSectionIndex] ?? payload.sections[0];
  const isLast = currentSectionIndex >= totalSections - 1;

  const startedAt = sectionStartedAt[section.id] ?? Date.now();
  const totalMs = (section.minutes ?? 10) * 60 * 1000;
  const remaining = Math.max(0, totalMs - (Date.now() - startedAt));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const overtime = remaining === 0;

  // Auto-advance when timer hits zero (fires once per section)
  const timerFiredRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!overtime) return;
    if (timerFiredRef.current[section.id]) return;
    timerFiredRef.current[section.id] = true;
    if (isLast) {
      toast.message(t("parent.test.toastTimeSubmit"));
      onSubmit();
    } else {
      toast.message(t("parent.test.toastTimeNext"));
      onAdvance();
    }
  }, [overtime, section.id, isLast, onAdvance, onSubmit, t]);

  const answeredCount = useMemo(
    () => section.questions.filter((q) => (answers[q.id] ?? "").toString().length > 0).length,
    [section, answers],
  );
  const isHkdseEnglishPractice = testType === "ielts_practice";

  const handleContinue = () => {
    const msg = singlePaperMode
      ? "Save this paper and return to the paper list?"
      : isLast
        ? t("parent.test.confirmSubmit")
        : t("parent.test.confirmNext");
    if (!confirm(msg)) return;
    if (isLast || singlePaperMode) {
      onSubmit();
    } else {
      onAdvance();
    }
  };

  return (
    <div className="space-y-6">
      {/* Linear progress indicator */}
      <div className="rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("parent.test.sectionProgress", {
                current: currentSectionIndex + 1,
                total: totalSections,
              })}
            </p>
            <h2 className="mt-1 font-display text-xl text-foreground">{section.title}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("parent.test.timeRemaining")}
            </p>
            <p
              className={`font-display text-2xl ${overtime ? "text-destructive" : "text-foreground"}`}
            >
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("parent.test.answered", { n: answeredCount, total: section.questions.length })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {payload.sections.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < currentSectionIndex
                  ? "bg-primary"
                  : i === currentSectionIndex
                    ? "bg-primary/50"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {isHkdseEnglishPractice && section.id === "L" && section.listening_script && (
        <ListeningAudioConsole script={section.listening_script} audioUrl={section.audio_url} />
      )}

      {/* Reading / listening passage */}
      {section.passage && (
        <article className="rounded-lg border border-border bg-muted/30 p-6 text-sm leading-relaxed text-foreground">
          {isHkdseEnglishPractice && section.id === "L" && (
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Data File</p>
          )}
          <p className="whitespace-pre-line">{section.passage}</p>
        </article>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {section.questions.map((q, idx) => {
          const markWord =
            q.marks === 1 ? t("parent.test.markSingular") : t("parent.test.markPlural");
          return (
            <div key={q.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">{idx + 1}. </span>
                  {q.prompt}
                </p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {q.marks} {markWord}
                </span>
              </div>
              {isHkdseEnglishPractice && section.id === "S" ? (
                <SpeakingQuestionInput
                  q={q}
                  value={answers[q.id] ?? ""}
                  onChange={(v) => onAnswer(q, v)}
                />
              ) : (
                <QuestionInput q={q} value={answers[q.id] ?? ""} onChange={(v) => onAnswer(q, v)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-muted-foreground">{t("parent.test.autosaveHint")}</p>
        <Button onClick={handleContinue}>
          {singlePaperMode
            ? "Save paper & return"
            : isLast
              ? t("parent.test.submitTest")
              : t("parent.test.continueNext")}
        </Button>
      </div>
    </div>
  );
}

function ListeningAudioConsole({ script, audioUrl }: { script: string; audioUrl?: string }) {
  const [useTts, setUseTts] = useState(!audioUrl);

  if (useTts) {
    return <ListeningTtsConsole script={script} />;
  }

  return <ListeningHtmlAudioConsole audioUrl={audioUrl!} onFallback={() => setUseTts(true)} />;
}

function ListeningHtmlAudioConsole({
  audioUrl,
  onFallback,
}: {
  audioUrl: string;
  onFallback: () => void;
}) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "finished">("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => {
      setProgress(100);
      setStatus("finished");
    };
    const onPlay = () => setStatus("playing");
    const onPause = () => {
      if (audio.currentTime < audio.duration) setStatus("paused");
    };

    const onError = () => onFallback();

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [audioUrl, onFallback]);

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "paused") {
      audio.play();
    } else {
      audio.currentTime = 0;
      audio.play();
    }
    setStatus("playing");
  };

  const pause = () => {
    audioRef.current?.pause();
    setStatus("paused");
  };

  const replay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setProgress(0);
    setStatus("idle");
  };

  const remaining = Math.max(0, duration - (progress / 100) * duration);
  const remainingLabel = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              HKDSE Paper 3 Audio
            </p>
            <p className="font-medium text-foreground">
              {status === "playing"
                ? "Audio playing"
                : status === "paused"
                  ? "Audio paused"
                  : status === "finished"
                    ? "Audio completed"
                    : "Ready to play"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "playing" ? (
            <Button type="button" variant="outline" size="sm" onClick={pause}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={play}>
              <Play className="mr-2 h-4 w-4" />
              Play
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={replay}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Replay
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("student.tests.listeningPracticeNote")}</span>
          <span>{remainingLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function ListeningTtsConsole({ script }: { script: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "finished">("idle");
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const estimatedDuration = Math.max(75, Math.min(210, Math.ceil(script.length / 18)));

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgress = () => {
    clearProgressTimer();
    const started = Date.now() - (progress / 100) * estimatedDuration * 1000;
    progressTimerRef.current = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / (estimatedDuration * 1000)) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearProgressTimer();
        setStatus("finished");
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      clearProgressTimer();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const play = () => {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      if (status === "paused") {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.onend = () => {
          setProgress(100);
          setStatus("finished");
          clearProgressTimer();
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }
    setStatus("playing");
    startProgress();
  };

  const pause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    clearProgressTimer();
    setStatus("paused");
  };

  const replay = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearProgressTimer();
    setProgress(0);
    setStatus("idle");
  };

  const remaining = Math.max(
    0,
    estimatedDuration - Math.round((progress / 100) * estimatedDuration),
  );
  const remainingLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              HKDSE Paper 3 Audio
            </p>
            <p className="font-medium text-foreground">
              {status === "playing"
                ? "Audio playing"
                : status === "paused"
                  ? "Audio paused"
                  : status === "finished"
                    ? "Audio completed"
                    : "Ready to play"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "playing" ? (
            <Button type="button" variant="outline" size="sm" onClick={pause}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={play}>
              <Play className="mr-2 h-4 w-4" />
              Play
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={replay}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Replay
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("student.tests.listeningPracticeNote")}</span>
          <span>{remainingLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function SpeakingQuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<"ready" | "recording" | "analysing" | "saved">(
    value ? "saved" : "ready",
  );
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (value && state === "ready") setState("saved");
  }, [state, value]);

  const start = () => {
    setSeconds(0);
    setState("recording");
  };

  const stop = () => {
    setState("analysing");
    window.setTimeout(() => {
      onChange(
        q.answer ??
          "I would choose the peer tutoring centre because it gives students practical help and creates a stronger school community.",
      );
      setState("saved");
    }, 1200);
  };

  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                state === "recording"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {state === "recording"
                  ? t("student.tests.speakingRecording")
                  : state === "analysing"
                    ? t("student.tests.speakingAnalyze")
                    : state === "saved"
                      ? t("student.tests.speakingSaved")
                      : t("student.tests.speakingReady")}
              </p>
              <p className="font-display text-xl text-foreground">
                {mins}:{secs}
              </p>
            </div>
          </div>
          {state === "recording" ? (
            <Button type="button" variant="destructive" onClick={stop}>
              <Square className="mr-2 h-4 w-4" />
              {t("student.tests.speakingStop")}
            </Button>
          ) : (
            <Button type="button" onClick={start} disabled={state === "analysing"}>
              <Mic className="mr-2 h-4 w-4" />
              {t("student.tests.speakingRecord")}
            </Button>
          )}
        </div>
        <div className="mt-4 flex h-10 items-end gap-1">
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className={`w-full rounded-t bg-primary/70 transition-all ${
                state === "recording" ? "animate-pulse" : "bg-muted-foreground/30"
              }`}
              style={{
                height:
                  state === "recording"
                    ? `${22 + ((i * 17 + seconds * 9) % 18)}px`
                    : `${8 + ((i * 11) % 18)}px`,
              }}
            />
          ))}
        </div>
      </div>
      {value && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {t("student.tests.speakingPlayback")}
          </p>
          <p>{value}</p>
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const markWord = q.marks === 1 ? t("parent.test.markSingular") : t("parent.test.markPlural");
  if (q.type === "mcq" && q.options) {
    return (
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              value === String(i)
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === String(i)}
              onChange={() => onChange(String(i))}
              className="mt-0.5"
            />
            <span>
              <span className="mr-2 font-medium text-muted-foreground">
                {String.fromCharCode(65 + i)})
              </span>
              {opt}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "likert") {
    const labels = [
      t("student.tests.likert1"),
      t("student.tests.likert2"),
      t("student.tests.likert3"),
      t("student.tests.likert4"),
      t("student.tests.likert5"),
    ];
    return (
      <div className="space-y-2">
        {labels.map((label, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
              value === String(i + 1)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === String(i + 1)}
              onChange={() => onChange(String(i + 1))}
            />
            <span>
              {i + 1}. {label}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === "number") {
    return (
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("parent.test.placeholderAnswer")}
        className="max-w-sm"
      />
    );
  }

  if (q.type === "essay") {
    return (
      <div className="space-y-3">
        {q.essay_prompts && q.essay_prompts.length > 0 && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {q.essay_prompts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        )}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("parent.test.placeholderEssay")}
          rows={12}
        />
      </div>
    );
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("parent.test.placeholderAnswer")}
      rows={3}
    />
  );
}
