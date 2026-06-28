import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type ReportPayload = {
  cover: {
    student_name: string;
    english_name?: string;
    applicant_background: string;
    desired_entry: string;
    report_date: string;
  };
  examination_results: {
    sections: Array<{
      code: string;
      area: string;
      time?: string;
      score: number;
      max: number;
      percentage: number;
    }>;
    total_score: number;
    total_max: number;
    total_percentage: number;
    overall_performance: string;
    strengths: string[];
    areas_needing_improvement: string[];
    score_pattern_analysis: string;
    academic_readiness_judgement: string;
  };
  written_expression_evaluation: {
    prompt_selected?: string;
    score: number;
    max: number;
    organization?: number;
    content?: number;
    language_use?: number;
    main_issues: string;
    recommendations: string;
  };
  interview_performance: {
    general_impression: string;
    spoken_english: string;
    confidence: string;
    academic_interests: string;
    curriculum_awareness: string;
    career_awareness: string;
    extracurricular_profile: string;
    concerns: string;
    cross_check_with_test: string;
  };
  overall_assessment_summary: {
    readiness_label: string;
    needs_eal_support: boolean;
    needs_foundation_year: boolean;
    suitable_pathways: string[];
    risk_level: string;
    narrative: string;
  };
  recommended_pathway: {
    primary: string;
    rationale: string;
    alternatives?: string[];
  };
  school_recommendations: Array<{
    school_slug: string;
    fit_label: string;
    rationale: string;
    caveats?: string;
  }>;
  summary_table: Array<{
    school_short_name: string;
    curriculum: string;
    key_fit: string;
    selectivity: string;
    recommendation: string;
  }>;
  disclaimer: string;
};

const FIT_BADGE: Record<string, string> = {
  best_fit: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recommended: "bg-blue-50 text-blue-700 border-blue-200",
  possible: "bg-slate-50 text-slate-700 border-slate-200",
  aspirational: "bg-amber-50 text-amber-700 border-amber-200",
  not_recommended: "bg-rose-50 text-rose-700 border-rose-200",
};

function NumberedHeading({
  number,
  title,
  level = 2,
}: {
  number: string;
  title: string;
  level?: 2 | 3 | 4;
}) {
  const sizes = {
    2: "text-2xl",
    3: "text-xl",
    4: "text-lg",
  };
  return (
    <h2 className={`font-display ${sizes[level]} text-foreground flex items-baseline gap-3`}>
      <span className="font-mono text-sm font-normal text-muted-foreground tracking-wider">
        {number}
      </span>
      <span>{title}</span>
    </h2>
  );
}

function Paragraph({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-[1.75] text-foreground/90 ${className}`}>{children}</p>;
}

function PartTitle({ part, title }: { part: string; title: string }) {
  return (
    <div className="border-y border-foreground/15 py-6 my-2">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{part}</p>
      <h2 className="mt-2 font-display text-3xl text-foreground">{title}</h2>
    </div>
  );
}

export function ReportView({ payload }: { payload: ReportPayload }) {
  const { t } = useTranslation();
  const {
    cover,
    examination_results: er,
    written_expression_evaluation: we,
    interview_performance: ip,
    overall_assessment_summary: oas,
    recommended_pathway: rp,
    school_recommendations: srs,
    summary_table: st,
    disclaimer,
  } = payload;

  return (
    <article className="mx-auto max-w-3xl bg-background px-2 py-4">
      {/* Cover */}
      <header className="mb-12 border-b border-foreground/15 pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("reportView.studentAssessmentReport")}
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-foreground">
          {cover.student_name}
        </h1>
        {cover.english_name && (
          <p className="mt-1 font-display text-xl italic text-muted-foreground">
            {cover.english_name}
          </p>
        )}
        <p className="mt-4 font-display text-base italic text-foreground/70">
          {cover.applicant_background}
        </p>
        <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("reportView.targetEntry")}
            </dt>
            <dd className="mt-1 text-foreground">{cover.desired_entry}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("reportView.reportDate")}
            </dt>
            <dd className="mt-1 text-foreground">{cover.report_date}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("reportView.status")}
            </dt>
            <dd className="mt-1 text-foreground">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t(`reportView.readiness.${oas.readiness_label}`, {
                  defaultValue: oas.readiness_label,
                })}
              </span>
            </dd>
          </div>
        </dl>
      </header>

      {/* Part One */}
      <PartTitle part={t("reportView.partOneEyebrow")} title={t("reportView.partOneTitle")} />

      <section className="mt-10 space-y-5">
        <NumberedHeading number="1.1" title={t("reportView.hExam")} />

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reportView.thSection")}</th>
                <th className="px-4 py-3 font-medium">{t("reportView.thArea")}</th>
                {er.sections.some((s) => s.time) && (
                  <th className="px-4 py-3 font-medium">{t("reportView.thTime")}</th>
                )}
                <th className="px-4 py-3 text-right font-medium">{t("reportView.thScore")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("reportView.thMax")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("reportView.thPercent")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {er.sections.map((s) => (
                <tr key={s.code}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                    {s.code}
                  </td>
                  <td className="px-4 py-3 text-foreground">{s.area}</td>
                  {er.sections.some((x) => x.time) && (
                    <td className="px-4 py-3 text-muted-foreground">{s.time ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{s.score}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {s.max}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {s.percentage}%
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-display">
                <td className="px-4 py-3 text-foreground">{t("reportView.total")}</td>
                <td className="px-4 py-3" />
                {er.sections.some((x) => x.time) && <td className="px-4 py-3" />}
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {er.total_score}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {er.total_max}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {er.total_percentage}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Paragraph className="whitespace-pre-line">{er.overall_performance}</Paragraph>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <NumberedHeading number="1.1.1" title={t("reportView.strengths")} level={4} />
            <ul className="mt-3 space-y-2">
              {er.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <NumberedHeading number="1.1.2" title={t("reportView.areasNeeding")} level={4} />
            <ul className="mt-3 space-y-2">
              {er.areas_needing_improvement.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <NumberedHeading number="1.1.3" title={t("reportView.scorePattern")} level={4} />
        <Paragraph className="whitespace-pre-line">{er.score_pattern_analysis}</Paragraph>

        <NumberedHeading
          number="1.1.4"
          title={t("reportView.writtenEval", { score: we.score, max: we.max })}
          level={4}
        />
        {we.prompt_selected && (
          <p className="text-sm italic text-muted-foreground">
            {t("reportView.prompt")} {we.prompt_selected}
          </p>
        )}
        {(we.organization != null || we.content != null || we.language_use != null) && (
          <div className="flex flex-wrap gap-2">
            {we.organization != null && (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
                {t("reportView.organization")} · {we.organization}
              </span>
            )}
            {we.content != null && (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
                {t("reportView.content")} · {we.content}
              </span>
            )}
            {we.language_use != null && (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
                {t("reportView.languageUse")} · {we.language_use}
              </span>
            )}
          </div>
        )}
        <Paragraph className="whitespace-pre-line">{we.main_issues}</Paragraph>

        <NumberedHeading number="1.1.5" title={t("reportView.recLanguageDev")} level={4} />
        <Paragraph className="whitespace-pre-line">{we.recommendations}</Paragraph>

        <NumberedHeading number="1.1.6" title={t("reportView.academicReadiness")} level={4} />
        <Paragraph className="whitespace-pre-line">{er.academic_readiness_judgement}</Paragraph>
      </section>

      <section className="mt-12 space-y-5">
        <NumberedHeading number="1.2" title={t("reportView.hInterview")} />
        <Paragraph className="whitespace-pre-line">{ip.general_impression}</Paragraph>

        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <InterviewBlock label={t("reportView.spokenEnglish")} body={ip.spoken_english} />
          <InterviewBlock label={t("reportView.confidence")} body={ip.confidence} />
          <InterviewBlock label={t("reportView.academicInterests")} body={ip.academic_interests} />
          <InterviewBlock
            label={t("reportView.curriculumAwareness")}
            body={ip.curriculum_awareness}
          />
          <InterviewBlock label={t("reportView.careerAwareness")} body={ip.career_awareness} />
          <InterviewBlock
            label={t("reportView.extracurricularProfile")}
            body={ip.extracurricular_profile}
          />
        </div>

        <div>
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            {t("reportView.concerns")}
          </p>
          <Paragraph className="mt-1 whitespace-pre-line">{ip.concerns}</Paragraph>
        </div>

        <div className="rounded-lg border-l-4 border-primary/60 bg-primary/5 p-5">
          <p className="text-xs uppercase tracking-wider text-primary">
            {t("reportView.crossCheck")}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed italic text-foreground">
            {ip.cross_check_with_test}
          </p>
        </div>
      </section>

      <section className="mt-12 space-y-5">
        <NumberedHeading number="1.3" title={t("reportView.hOverall")} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {t(`reportView.readiness.${oas.readiness_label}`, {
              defaultValue: oas.readiness_label,
            })}
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium capitalize text-foreground">
            {t("reportView.risk")} · {oas.risk_level}
          </span>
          {oas.needs_eal_support && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {t("reportView.ealBadge")}
            </span>
          )}
          {oas.needs_foundation_year && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {t("reportView.foundationBadge")}
            </span>
          )}
        </div>
        <Paragraph className="whitespace-pre-line">{oas.narrative}</Paragraph>
        {oas.suitable_pathways.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("reportView.suitablePathways")} </span>
            {oas.suitable_pathways.join(" · ")}
          </p>
        )}
      </section>

      {/* Part Two */}
      <div className="mt-16">
        <PartTitle part={t("reportView.partTwoEyebrow")} title={t("reportView.partTwoTitle")} />
      </div>

      <section className="mt-10 space-y-4">
        <NumberedHeading number="2.1" title={t("reportView.hPathway")} />
        <p className="font-display text-2xl text-foreground">{rp.primary}</p>
        <Paragraph className="whitespace-pre-line">{rp.rationale}</Paragraph>
        {rp.alternatives && rp.alternatives.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("reportView.alternatives")} </span>
            {rp.alternatives.join(" · ")}
          </p>
        )}
      </section>

      <section className="mt-12 space-y-4">
        <NumberedHeading number="2.2" title={t("reportView.hSchools")} />
        <div className="space-y-4">
          {srs.map((r, idx) => (
            <div
              key={r.school_slug}
              className="rounded-xl border border-border bg-surface p-6 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted-foreground">2.2.{idx + 1}</span>
                  <h3 className="font-display text-xl text-foreground">
                    {schoolDisplayName(r.school_slug)}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${FIT_BADGE[r.fit_label] ?? FIT_BADGE.possible}`}
                >
                  {t(`reportView.fit.${r.fit_label}`, { defaultValue: r.fit_label })}
                </span>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
                {r.rationale}
              </p>
              {r.caveats && (
                <p className="mt-3 border-t border-border pt-3 text-sm italic text-muted-foreground">
                  <span className="font-medium not-italic text-foreground">
                    {t("reportView.importantCaveat")}{" "}
                  </span>
                  {r.caveats}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <NumberedHeading number="2.3" title={t("reportView.hSummary")} />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reportView.thSchool")}</th>
                <th className="px-4 py-3 font-medium">{t("reportView.thCurriculum")}</th>
                <th className="px-4 py-3 font-medium">{t("reportView.thKeyFit")}</th>
                <th className="px-4 py-3 font-medium">{t("reportView.thSelectivity")}</th>
                <th className="px-4 py-3 font-medium">{t("reportView.thRecommendation")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {st.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="px-4 py-3 font-medium text-foreground">{r.school_short_name}</td>
                  <td className="px-4 py-3 text-foreground/90">{r.curriculum}</td>
                  <td className="px-4 py-3 text-foreground/90">{r.key_fit}</td>
                  <td className="px-4 py-3 text-foreground/90">{r.selectivity}</td>
                  <td className="px-4 py-3 text-foreground/90">{r.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-12 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-xs leading-relaxed text-muted-foreground">
        {disclaimer}
      </p>
    </article>
  );
}

function InterviewBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
        {body}
      </p>
    </div>
  );
}

function schoolDisplayName(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
