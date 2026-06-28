/* eslint-disable @typescript-eslint/no-explicit-any */
import { HKDSE_PAPER_META, type HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { formatStars, percentageToStars } from "@/lib/hkdse-stars";

export type HkdseResultSummary = {
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

type SectionScores = Record<
  string,
  {
    title?: string;
    per_question?: Record<string, { score: number; max: number; feedback: string }>;
    diagnostics?: { summary?: string };
  }
>;

export function HkdseResultsPanel({
  summary,
  sectionScores = {},
  totalScore,
  totalMax,
  feedback,
  compact = false,
}: {
  summary: HkdseResultSummary;
  sectionScores?: SectionScores;
  totalScore?: number | null;
  totalMax?: number | null;
  feedback?: string;
  compact?: boolean;
}) {
  const paper4 = summary.paper4_report ?? null;
  const componentScores = summary.component_scores ?? {};
  const bands = summary.bands ?? {};
  const overallPct =
    totalScore != null && totalMax != null && totalMax > 0 ? (totalScore / totalMax) * 100 : null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Overall HKDSE English estimate
        </p>
        <p className="mt-2 font-display text-3xl text-foreground md:text-4xl">
          {summary.overall_level_estimate ?? "—"}
        </p>
        {overallPct != null && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            {formatStars(percentageToStars(overallPct))}
          </p>
        )}
        {feedback && <p className="mt-2 text-sm text-muted-foreground">{feedback}</p>}
        {totalScore != null && totalMax != null && (
          <p className="mt-2 text-sm text-muted-foreground">
            Total marks (attempted papers): {totalScore} / {totalMax}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
        <h2 className="font-display text-xl text-foreground md:text-2xl">Component scores</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(componentScores).map(([id, comp]) => {
            const pct =
              comp.score != null && comp.max != null && comp.max > 0
                ? (comp.score / comp.max) * 100
                : null;
            return (
              <div key={id} className="rounded-md border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {comp.title ?? id}
                </p>
                <p className="mt-2 font-display text-2xl text-foreground">
                  {comp.score != null ? `${comp.score} / ${comp.max}` : "Not attempted"}
                </p>
                {pct != null && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {formatStars(percentageToStars(pct))}
                  </p>
                )}
                {bands.reading && id === "R" && (
                  <p className="text-xs text-muted-foreground">Level: {bands.reading}</p>
                )}
                {bands.writing && id === "W" && (
                  <p className="text-xs text-muted-foreground">Level: {bands.writing}</p>
                )}
                {bands.listening_integrated_skills && id === "L" && (
                  <p className="text-xs text-muted-foreground">
                    Level: {bands.listening_integrated_skills}
                  </p>
                )}
                {bands.speaking && id === "S" && (
                  <p className="text-xs text-muted-foreground">Level: {bands.speaking}</p>
                )}
                {sectionScores[id]?.diagnostics?.summary && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {sectionScores[id].diagnostics?.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {Object.entries(sectionScores).some(
        ([, sec]) => sec?.per_question && Object.keys(sec.per_question).length > 0,
      ) && (
        <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
          <h2 className="font-display text-xl text-foreground md:text-2xl">
            Marking-scheme feedback
          </h2>
          <div className="mt-4 space-y-4">
            {Object.entries(sectionScores).map(([sid, sec]) => {
              if (!sec?.per_question) return null;
              const meta = HKDSE_PAPER_META[sid as HkdsePaperId];
              return (
                <div key={sid}>
                  <h3 className="font-medium text-foreground">
                    {meta?.title ?? sec.title ?? sid}
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {Object.entries(sec.per_question).map(([qid, q]) => (
                      <li key={qid} className="rounded-md border border-border bg-muted/10 p-3">
                        <span className="font-medium text-foreground">{qid}:</span> {q.score}/{q.max}{" "}
                        — {q.feedback}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {paper4 && !compact && (
        <>
          <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Paper 4 Speaking detail
                </p>
                <p className="mt-2 font-display text-3xl text-foreground md:text-4xl">
                  Band {paper4.overall_band ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Raw score</p>
                <p className="font-display text-2xl text-foreground">
                  {paper4.overall_score ?? "—"} / 10
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {(paper4.criteria ?? []).map((criterion) => (
              <article
                key={criterion.name}
                className="rounded-lg border border-border bg-surface p-4 md:p-5"
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

          {(paper4.group_transcript || paper4.individual_transcript) && (
            <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
              <h2 className="font-display text-xl text-foreground md:text-2xl">
                Captured transcript
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {paper4.group_transcript && (
                  <article className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Part A</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {paper4.group_transcript}
                    </p>
                  </article>
                )}
                {paper4.individual_transcript && (
                  <article className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Part B</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {paper4.individual_transcript}
                    </p>
                  </article>
                )}
              </div>
            </section>
          )}

          {(paper4.strengths?.length || paper4.focus_next?.length) && (
            <section className="grid gap-4 lg:grid-cols-2">
              {paper4.strengths?.length ? (
                <article className="rounded-lg border border-border bg-surface p-4 md:p-6">
                  <h2 className="font-display text-xl text-foreground">What went well</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {paper4.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
              {paper4.focus_next?.length ? (
                <article className="rounded-lg border border-border bg-surface p-4 md:p-6">
                  <h2 className="font-display text-xl text-foreground">Focus next</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {paper4.focus_next.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </section>
          )}

          {paper4.examiner_feedback && (
            <section className="rounded-lg border border-border bg-surface p-4 md:p-6">
              <h2 className="font-display text-xl text-foreground">Examiner feedback</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {paper4.examiner_feedback}
              </p>
            </section>
          )}
        </>
      )}

      {summary.disclaimer && (
        <p className="text-xs text-muted-foreground">{summary.disclaimer}</p>
      )}
    </div>
  );
}
