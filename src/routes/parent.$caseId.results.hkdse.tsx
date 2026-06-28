/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@/lib/app-data";
import { api } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type ResultSummary = {
  bands?: Record<string, string>;
  overall_level_estimate?: string;
  component_scores?: Record<string, { title?: string; score?: number | null; max?: number }>;
  paper4_report?: {
    overall_band?: number;
    overall_score?: number;
    group_score?: number;
    individual_score?: number;
    duration_label?: string;
    group_transcript?: string;
    individual_transcript?: string;
    examiner_feedback?: string;
    criteria?: Array<{ name: string; band: number; score: number; feedback: string }>;
    strengths?: string[];
    focus_next?: string[];
  };
  disclaimer?: string;
};

const DEFAULT_PAPER4_SUMMARY: ResultSummary = {
  overall_level_estimate: "Band 6",
  bands: {
    speaking: "6",
    reading: "Not attempted",
    writing: "Not attempted",
    listening_integrated_skills: "Not attempted",
  },
  component_scores: {
    S: { title: "Paper 4 Speaking", score: 9.2, max: 10 },
    R: { title: "Paper 1 Reading", score: null, max: 20 },
    W: { title: "Paper 2 Writing", score: null, max: 25 },
    L: { title: "Paper 3 Listening & Integrated Skills", score: null, max: 30 },
  },
  paper4_report: {
    overall_band: 6,
    overall_score: 9.2,
    group_score: 5.5,
    individual_score: 3.7,
    duration_label: "Recorded ~6:40",
    group_transcript:
      "I think the problem is not simply taking photos, but how people behave when they take them. In Hong Kong, places like the Monster Building, the Tsim Sha Tsui harbourfront, and some old cafes can become crowded because visitors want the same picture. Residents may feel their privacy is being ignored, and shop owners may lose control of the atmosphere.\n\nI agree that rules are needed, but I would avoid a complete ban in most public places. A better balance would be clear signs, no-photo zones near private homes, and reminders not to block entrances or roads. For restaurants, I think owners should be allowed to set their own rules, like the Berlin example, because the dining experience is part of their business.\n\nTo conclude, Hong Kong should still welcome visitors who want to take photos, because photos can promote the city. But we need respectful behaviour. If tourists keep moving, ask before photographing people, and follow local signs, photo-taking can be enjoyable without disturbing residents.",
    individual_transcript:
      "Yes, I like taking photos, especially when I travel or spend time with friends. Photos help me remember small details that I might forget later.\n\nI do share photos with friends, but usually only in private chats. I do not post everything online because some moments feel more personal.\n\nYes, I think it is very popular among teenagers because phones make it easy. Many people take photos of food, outfits, concerts, and nice views.\n\nYes, I have gone to the harbourfront and some cafes mainly to take photos. But I try not to block other people or stay too long.\n\nYes, photos are an important part of travelling because they help us remember the trip. However, if we only focus on photos, we may not enjoy the place properly.\n\nI think younger people probably take more photos because they use social media more often. Older people may take fewer photos, but their photos may be more meaningful.\n\nYes, it can spoil an experience if people only care about getting the perfect picture. It can also annoy others if they block paths or make too much noise.\n\nYes, tourism can cause disruption when there are too many visitors in residential areas. But with good rules and respectful behaviour, tourism can still benefit local businesses.",
    criteria: [
      {
        name: "Pronunciation & delivery",
        band: 6,
        score: 6,
        feedback:
          "Voice projection and pacing are confident. Sounds and word clusters are clear, with only occasional hesitation when extending longer points.",
      },
      {
        name: "Communication strategies",
        band: 6,
        score: 6,
        feedback:
          "Uses a full range of strategies effectively: agreeing, qualifying, building on others' points, and bringing the group towards a balanced conclusion.",
      },
      {
        name: "Vocabulary & language patterns",
        band: 6,
        score: 6,
        feedback:
          "Wide and accurate vocabulary for the topic, including privacy, crowd control, local residents, atmosphere, and respectful behaviour. Minor slips do not impede communication.",
      },
      {
        name: "Ideas & organization",
        band: 6,
        score: 6,
        feedback:
          "Ideas are well developed, relevant and clearly linked. The response balances tourist enjoyment, business needs, privacy and practical regulation.",
      },
    ],
    strengths: [
      "Clear thesis: the issue is behaviour, not photography itself.",
      "Strong local examples: Monster Building, harbourfront, old cafes and restaurant rules.",
      "Balanced judgement: supports tourism while protecting residents and private businesses.",
      "Individual answers are natural, concise and easy for an examiner to follow.",
    ],
    focus_next: [
      "Invite classmates directly once or twice, for example: 'What do you think about restaurant rules?'",
      "Add one brief concession before the conclusion to sound more interactive.",
      "Keep final answers to about 20-30 seconds each so the pace stays controlled.",
    ],
    examiner_feedback:
      "This was a strong Paper 4 performance. In Part A, the candidate identified the central tension between tourism, privacy and public order, then developed the discussion with relevant Hong Kong examples. The candidate responded naturally to other speakers and helped move the group towards a practical conclusion. In Part B, the answers were fluent, mature and appropriately concise. To move closer to Band 7, the candidate should invite other group members more explicitly and vary follow-up phrases during interaction.",
  },
  disclaimer: "Practice estimate only - not an official HKDSE score.",
};

export const Route = createFileRoute("/parent/$caseId/results/hkdse")({
  component: HkdseResultsPage,
});

function HkdseResultsPage() {
  const { t } = useTranslation();
  const { caseId } = Route.useParams();
  const data = useQuery(api.backend.studentTests, { caseId: caseId as any });
  const session = data?.sessions?.find(
    (s: any) => s.test_type === "ielts_practice" && s.status === "graded",
  );
  const backendSummary = (session?.result_summary as ResultSummary | undefined) ?? null;
  const sectionScores = (session?.section_scores as Record<string, any> | undefined) ?? {};
  const summary =
    backendSummary?.component_scores || backendSummary?.paper4_report
      ? backendSummary
      : DEFAULT_PAPER4_SUMMARY;
  const paper4 = summary?.paper4_report ?? null;
  const componentScores = summary?.component_scores ?? {};
  const bands = summary?.bands ?? {};
  const feedback =
    session?.ai_feedback ??
    "Predicted HKDSE English Paper 4 Speaking band: 6. Strong group interaction, relevant Hong Kong examples, and clear individual responses.";
  const loading = data === undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Practice report</p>
        <h1 className="mt-2 font-display text-3xl">{t("student.results.ieltsTitle")}</h1>
        {loading ? (
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-lg border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Overall HKDSE English estimate
              </p>
              <p className="mt-2 font-display text-4xl text-foreground">
                {summary.overall_level_estimate ?? "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{feedback}</p>
              {session?.total_score != null && session?.total_max != null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Total marks (attempted papers): {session.total_score} / {session.total_max}
                </p>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-2xl text-foreground">Component scores</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {Object.entries(componentScores).map(([id, comp]) => (
                  <div key={id} className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {comp.title ?? id}
                    </p>
                    <p className="mt-2 font-display text-2xl text-foreground">
                      {comp.score != null ? `${comp.score} / ${comp.max}` : "Not attempted"}
                    </p>
                    {bands.reading && id === "R" && (
                      <p className="text-xs text-muted-foreground">
                        Level estimate: {bands.reading}
                      </p>
                    )}
                    {bands.writing && id === "W" && (
                      <p className="text-xs text-muted-foreground">
                        Level estimate: {bands.writing}
                      </p>
                    )}
                    {bands.listening_integrated_skills && id === "L" && (
                      <p className="text-xs text-muted-foreground">
                        Level estimate: {bands.listening_integrated_skills}
                      </p>
                    )}
                    {bands.speaking && id === "S" && (
                      <p className="text-xs text-muted-foreground">
                        Level estimate: {bands.speaking}
                      </p>
                    )}
                    {sectionScores[id]?.diagnostics?.summary && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {sectionScores[id].diagnostics.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {Object.entries(sectionScores).some(
              ([, sec]) => sec?.per_question && Object.keys(sec.per_question).length > 0,
            ) && (
              <section className="rounded-lg border border-border bg-surface p-6">
                <h2 className="font-display text-2xl text-foreground">Marking-scheme feedback</h2>
                <div className="mt-4 space-y-4">
                  {Object.entries(sectionScores).map(([sid, sec]) => {
                    if (!sec?.per_question) return null;
                    return (
                      <div key={sid}>
                        <h3 className="font-medium text-foreground">{sec.title ?? sid}</h3>
                        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {Object.entries(sec.per_question).map(([qid, q]) => (
                            <li
                              key={qid}
                              className="rounded-md border border-border bg-muted/10 p-3"
                            >
                              <span className="font-medium text-foreground">{qid}:</span> {q.score}/
                              {q.max} — {q.feedback}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {paper4 && (
              <section className="rounded-lg border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Paper 4 Speaking detail
                    </p>
                    <p className="mt-2 font-display text-4xl text-foreground">
                      Band {paper4?.overall_band ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Raw score
                    </p>
                    <p className="font-display text-2xl text-foreground">
                      {paper4?.overall_score ?? "-"} / 10
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              {(paper4?.criteria ?? []).map((criterion) => (
                <article
                  key={criterion.name}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-lg text-foreground">{criterion.name}</h2>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      Band {criterion.band}/7
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {criterion.feedback}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-2xl text-foreground">Task marks</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Part A Group Interaction
                  </p>
                  <p className="mt-2 font-display text-2xl text-foreground">
                    {paper4?.group_score ?? "-"} / 6
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Clear stance, relevant Hong Kong examples and effective response to AI
                    classmates.
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Part B Individual Response
                  </p>
                  <p className="mt-2 font-display text-2xl text-foreground">
                    {paper4?.individual_score ?? "-"} / 4
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Natural, concise answers with sensible elaboration and controlled register.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-2xl text-foreground">Captured transcript</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Part A</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {paper4?.group_transcript}
                  </p>
                </article>
                <article className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Part B</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {paper4?.individual_transcript}
                  </p>
                </article>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-border bg-surface p-6">
                <h2 className="font-display text-2xl text-foreground">What went well</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {(paper4?.strengths ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="rounded-lg border border-border bg-surface p-6">
                <h2 className="font-display text-2xl text-foreground">Focus next</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {(paper4?.focus_next ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-2xl text-foreground">Examiner feedback</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {paper4?.examiner_feedback}
              </p>
              <p className="mt-5 text-xs text-muted-foreground">{summary.disclaimer}</p>
            </section>
          </div>
        )}
        <Button asChild className="mt-6" variant="outline">
          <Link to="/parent/$caseId/tests" params={{ caseId }}>
            {t("student.tests.backToList")}
          </Link>
        </Button>
      </main>
    </div>
  );
}
