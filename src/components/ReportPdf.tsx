import type { TFunction } from "i18next";
import i18n from "@/lib/i18n";
import { Document, Font, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { ReportPayload } from "./ReportView";

export type ReportPdfLang = "en" | "zh-Hans";

let cjkFontsRegistered = false;
function ensureCjkFonts() {
  if (cjkFontsRegistered) return;
  try {
    Font.register({
      family: "NotoSansSC",
      fonts: [
        {
          src: "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
          fontWeight: 400,
        },
        {
          src: "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Bold.otf",
          fontWeight: 700,
        },
      ],
    });
    cjkFontsRegistered = true;
  } catch (e) {
    console.warn("[ReportPdf] NotoSansSC font registration failed", e);
  }
}

const C = {
  ink: "#0f172a",
  body: "#1f2937",
  muted: "#64748b",
  rule: "#e2e8f0",
  accent: "#1d4ed8",
  accentSoft: "#eff6ff",
  emerald: "#047857",
  emeraldSoft: "#ecfdf5",
  amber: "#b45309",
  amberSoft: "#fffbeb",
  rose: "#be123c",
  roseSoft: "#fff1f2",
  blueSoft: "#eff6ff",
  slateSoft: "#f1f5f9",
  cardBg: "#ffffff",
};

const FIT_STYLE: Record<string, { bg: string; fg: string }> = {
  best_fit: { bg: C.emeraldSoft, fg: C.emerald },
  recommended: { bg: C.blueSoft, fg: C.accent },
  possible: { bg: C.slateSoft, fg: C.body },
  aspirational: { bg: C.amberSoft, fg: C.amber },
  not_recommended: { bg: C.roseSoft, fg: C.rose },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontSize: 10.5,
    fontFamily: "Times-Roman",
    lineHeight: 1.55,
    color: C.body,
  },
  coverEyebrow: { fontSize: 8.5, letterSpacing: 2, color: C.muted, fontFamily: "Helvetica" },
  coverTitle: { fontSize: 32, fontFamily: "Times-Bold", color: C.ink, marginTop: 14 },
  coverSubtitle: { fontSize: 14, fontFamily: "Times-Italic", color: C.muted, marginTop: 4 },
  coverBackground: { fontSize: 11, fontFamily: "Times-Italic", color: C.body, marginTop: 14 },
  coverGrid: { flexDirection: "row", marginTop: 32, gap: 24 },
  coverGridCell: { flex: 1 },
  coverLabel: { fontSize: 7.5, letterSpacing: 1.5, color: C.muted, fontFamily: "Helvetica" },
  coverValue: { fontSize: 10.5, color: C.ink, marginTop: 4, fontFamily: "Helvetica" },
  partWrap: {
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: C.ink,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  partEyebrow: { fontSize: 8, letterSpacing: 2.5, color: C.muted, fontFamily: "Helvetica" },
  partTitle: { fontSize: 20, fontFamily: "Times-Bold", color: C.ink, marginTop: 6 },
  h2Wrap: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 18, marginBottom: 8 },
  h2Num: { fontSize: 9, letterSpacing: 1.5, color: C.muted, fontFamily: "Helvetica" },
  h2: { fontSize: 16, fontFamily: "Times-Bold", color: C.ink },
  h3Wrap: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12, marginBottom: 6 },
  h3Num: { fontSize: 8, letterSpacing: 1.5, color: C.muted, fontFamily: "Helvetica" },
  h3: { fontSize: 12, fontFamily: "Times-Bold", color: C.ink },
  p: { marginBottom: 8, color: C.body, fontSize: 10.5 },
  italic: { fontFamily: "Times-Italic", color: C.muted },
  strong: { fontFamily: "Times-Bold", color: C.ink },
  table: { borderWidth: 0.75, borderColor: C.rule, borderRadius: 4, marginVertical: 8 },
  trHeader: {
    flexDirection: "row",
    backgroundColor: C.slateSoft,
    borderBottomWidth: 0.75,
    borderBottomColor: C.rule,
  },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.rule },
  trLast: { flexDirection: "row" },
  trTotal: { flexDirection: "row", backgroundColor: C.slateSoft },
  th: {
    padding: 7,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: C.muted,
    letterSpacing: 0.6,
  },
  td: { padding: 7, fontSize: 10, color: C.body },
  tdNum: { padding: 7, fontSize: 10, color: C.body, textAlign: "right" },
  tdMono: { padding: 7, fontSize: 9, color: C.ink, fontFamily: "Helvetica-Bold" },
  tdTotal: { padding: 7, fontSize: 10.5, color: C.ink, fontFamily: "Times-Bold" },
  bulletRow: { flexDirection: "row", marginBottom: 4, paddingLeft: 4 },
  bulletDot: { width: 10, color: C.accent, fontSize: 12 },
  bulletText: { flex: 1, fontSize: 10.5, color: C.body, lineHeight: 1.5 },
  twoCol: { flexDirection: "row", gap: 18, marginTop: 6 },
  col: { flex: 1 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  pill: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  pillPrimary: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
    color: C.accent,
    fontFamily: "Helvetica-Bold",
  },
  pillWarn: { backgroundColor: C.amberSoft, borderColor: C.amber, color: C.amber },
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    backgroundColor: C.accentSoft,
    padding: 12,
    marginVertical: 10,
    borderRadius: 3,
  },
  calloutLabel: {
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: C.accent,
    fontFamily: "Helvetica-Bold",
  },
  calloutBody: {
    fontSize: 10.5,
    fontFamily: "Times-Italic",
    color: C.ink,
    marginTop: 5,
    lineHeight: 1.5,
  },
  schoolCard: {
    borderWidth: 0.75,
    borderColor: C.rule,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  schoolHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  schoolNum: { fontSize: 8, color: C.muted, fontFamily: "Helvetica" },
  schoolTitle: { fontSize: 13, fontFamily: "Times-Bold", color: C.ink, marginTop: 2 },
  fitBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  caveat: {
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    marginTop: 8,
    paddingTop: 6,
    fontSize: 9,
    color: C.muted,
    fontFamily: "Times-Italic",
  },
  disclaimer: {
    borderWidth: 0.75,
    borderColor: C.rule,
    borderStyle: "dashed",
    borderRadius: 4,
    padding: 12,
    fontSize: 8.5,
    color: C.muted,
    marginTop: 16,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: C.muted,
    fontFamily: "Helvetica",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: 8,
  },
});

function H2({ num, title }: { num: string; title: string }) {
  return (
    <View style={styles.h2Wrap}>
      <Text style={styles.h2Num}>{num}</Text>
      <Text style={styles.h2}>{title}</Text>
    </View>
  );
}

function H3({ num, title }: { num: string; title: string }) {
  return (
    <View style={styles.h3Wrap}>
      <Text style={styles.h3Num}>{num}</Text>
      <Text style={styles.h3}>{title}</Text>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function schoolDisplayName(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Footer({ orgName, label }: { orgName: string; label: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {label} · {orgName}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function ReportDocument({
  payload,
  orgName,
  lang,
  t,
}: {
  payload: ReportPayload;
  orgName: string;
  lang: ReportPdfLang;
  t: TFunction;
}) {
  const er = payload.examination_results;
  const we = payload.written_expression_evaluation;
  const ip = payload.interview_performance;
  const oas = payload.overall_assessment_summary;
  const rp = payload.recommended_pathway;
  const showTime = er.sections.some((s) => s.time);
  const zh = lang === "zh-Hans";
  const pageStyle = zh ? { ...styles.page, fontFamily: "NotoSansSC" } : styles.page;
  const boldTitle = zh
    ? { fontFamily: "NotoSansSC", fontWeight: 700 as const }
    : { fontFamily: "Times-Bold" };
  const readiness = t(`reportView.readiness.${oas.readiness_label}`, {
    defaultValue: oas.readiness_label,
  });
  const colWidths = showTime
    ? ["10%", "38%", "16%", "12%", "12%", "12%"]
    : ["12%", "44%", "16%", "14%", "14%"];

  const U = (s: string) => s.toUpperCase();

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <View>
          <Text style={styles.coverEyebrow}>{U(t("reportView.studentAssessmentReport"))}</Text>
          <Text style={[styles.coverTitle, boldTitle]}>{payload.cover.student_name}</Text>
          {payload.cover.english_name && (
            <Text style={styles.coverSubtitle}>{payload.cover.english_name}</Text>
          )}
          <Text style={styles.coverBackground}>{payload.cover.applicant_background}</Text>
          <View style={styles.coverGrid}>
            <View style={styles.coverGridCell}>
              <Text style={styles.coverLabel}>{U(t("reportView.targetEntry"))}</Text>
              <Text style={styles.coverValue}>{payload.cover.desired_entry}</Text>
            </View>
            <View style={styles.coverGridCell}>
              <Text style={styles.coverLabel}>{U(t("reportView.reportDate"))}</Text>
              <Text style={styles.coverValue}>{payload.cover.report_date}</Text>
            </View>
            <View style={styles.coverGridCell}>
              <Text style={styles.coverLabel}>{U(t("reportView.status"))}</Text>
              <Text style={styles.coverValue}>{readiness}</Text>
            </View>
          </View>
        </View>

        <View style={styles.partWrap}>
          <Text style={styles.partEyebrow}>{U(t("reportView.partOneEyebrow"))}</Text>
          <Text style={[styles.partTitle, boldTitle]}>{t("reportView.partOneTitle")}</Text>
        </View>

        <H2 num="1.1" title={t("reportView.hExam")} />

        <View style={styles.table}>
          <View style={styles.trHeader}>
            <View style={{ width: colWidths[0] }}>
              <Text style={styles.th}>{U(t("reportView.thSection"))}</Text>
            </View>
            <View style={{ width: colWidths[1] }}>
              <Text style={styles.th}>{U(t("reportView.thArea"))}</Text>
            </View>
            {showTime && (
              <View style={{ width: colWidths[2] }}>
                <Text style={styles.th}>{U(t("reportView.thTime"))}</Text>
              </View>
            )}
            <View style={{ width: colWidths[showTime ? 3 : 2] }}>
              <Text style={[styles.th, { textAlign: "right" }]}>{U(t("reportView.thScore"))}</Text>
            </View>
            <View style={{ width: colWidths[showTime ? 4 : 3] }}>
              <Text style={[styles.th, { textAlign: "right" }]}>{U(t("reportView.thMax"))}</Text>
            </View>
            <View style={{ width: colWidths[showTime ? 5 : 4] }}>
              <Text style={[styles.th, { textAlign: "right" }]}>{t("reportView.thPercent")}</Text>
            </View>
          </View>
          {er.sections.map((s, i) => (
            <View key={s.code} style={i === er.sections.length - 1 ? styles.trLast : styles.tr}>
              <View style={{ width: colWidths[0] }}>
                <Text style={styles.tdMono}>{s.code}</Text>
              </View>
              <View style={{ width: colWidths[1] }}>
                <Text style={styles.td}>{s.area}</Text>
              </View>
              {showTime && (
                <View style={{ width: colWidths[2] }}>
                  <Text style={styles.td}>{s.time ?? "—"}</Text>
                </View>
              )}
              <View style={{ width: colWidths[showTime ? 3 : 2] }}>
                <Text style={styles.tdNum}>{s.score}</Text>
              </View>
              <View style={{ width: colWidths[showTime ? 4 : 3] }}>
                <Text style={styles.tdNum}>{s.max}</Text>
              </View>
              <View style={{ width: colWidths[showTime ? 5 : 4] }}>
                <Text style={styles.tdNum}>{s.percentage}%</Text>
              </View>
            </View>
          ))}
          <View style={styles.trTotal}>
            <View style={{ width: colWidths[0] }}>
              <Text style={styles.tdTotal}>{t("reportView.total")}</Text>
            </View>
            <View style={{ width: colWidths[1] }}>
              <Text style={styles.tdTotal} />
            </View>
            {showTime && (
              <View style={{ width: colWidths[2] }}>
                <Text style={styles.tdTotal} />
              </View>
            )}
            <View style={{ width: colWidths[showTime ? 3 : 2] }}>
              <Text style={[styles.tdTotal, { textAlign: "right" }]}>{er.total_score}</Text>
            </View>
            <View style={{ width: colWidths[showTime ? 4 : 3] }}>
              <Text style={[styles.tdTotal, { textAlign: "right" }]}>{er.total_max}</Text>
            </View>
            <View style={{ width: colWidths[showTime ? 5 : 4] }}>
              <Text style={[styles.tdTotal, { textAlign: "right" }]}>{er.total_percentage}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.p}>{er.overall_performance}</Text>

        <Footer orgName={orgName} label={t("reportPdf.footerConfidential")} />
      </Page>

      <Page size="A4" style={pageStyle}>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <H3 num="1.1.1" title={t("reportView.strengths")} />
            {er.strengths.map((s, i) => (
              <Bullet key={i}>{s}</Bullet>
            ))}
          </View>
          <View style={styles.col}>
            <H3 num="1.1.2" title={t("reportView.areasNeeding")} />
            {er.areas_needing_improvement.map((s, i) => (
              <Bullet key={i}>{s}</Bullet>
            ))}
          </View>
        </View>

        <H3 num="1.1.3" title={t("reportView.scorePattern")} />
        <Text style={styles.p}>{er.score_pattern_analysis}</Text>

        <H3 num="1.1.4" title={t("reportView.writtenEval", { score: we.score, max: we.max })} />
        {we.prompt_selected && (
          <Text style={[styles.p, styles.italic]}>
            {t("reportView.prompt")} {we.prompt_selected}
          </Text>
        )}
        {(we.organization != null || we.content != null || we.language_use != null) && (
          <View style={styles.pillRow}>
            {we.organization != null && (
              <Text style={styles.pill}>
                {t("reportView.organization")} · {we.organization}
              </Text>
            )}
            {we.content != null && (
              <Text style={styles.pill}>
                {t("reportView.content")} · {we.content}
              </Text>
            )}
            {we.language_use != null && (
              <Text style={styles.pill}>
                {t("reportView.languageUse")} · {we.language_use}
              </Text>
            )}
          </View>
        )}
        <Text style={styles.p}>{we.main_issues}</Text>

        <H3 num="1.1.5" title={t("reportView.recLanguageDev")} />
        <Text style={styles.p}>{we.recommendations}</Text>

        <H3 num="1.1.6" title={t("reportView.academicReadiness")} />
        <Text style={styles.p}>{er.academic_readiness_judgement}</Text>

        <Footer orgName={orgName} label={t("reportPdf.footerConfidential")} />
      </Page>

      <Page size="A4" style={pageStyle}>
        <H2 num="1.2" title={t("reportView.hInterview")} />
        <Text style={styles.p}>{ip.general_impression}</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <H3 num="" title={t("reportView.spokenEnglish")} />
            <Text style={styles.p}>{ip.spoken_english}</Text>
            <H3 num="" title={t("reportView.academicInterests")} />
            <Text style={styles.p}>{ip.academic_interests}</Text>
            <H3 num="" title={t("reportView.careerAwareness")} />
            <Text style={styles.p}>{ip.career_awareness}</Text>
          </View>
          <View style={styles.col}>
            <H3 num="" title={t("reportView.confidence")} />
            <Text style={styles.p}>{ip.confidence}</Text>
            <H3 num="" title={t("reportView.curriculumAwareness")} />
            <Text style={styles.p}>{ip.curriculum_awareness}</Text>
            <H3 num="" title={t("reportView.extracurricularProfile")} />
            <Text style={styles.p}>{ip.extracurricular_profile}</Text>
          </View>
        </View>

        <H3 num="" title={t("reportView.concerns")} />
        <Text style={styles.p}>{ip.concerns}</Text>

        <View style={styles.callout}>
          <Text style={styles.calloutLabel}>{U(t("reportView.crossCheck"))}</Text>
          <Text style={styles.calloutBody}>{ip.cross_check_with_test}</Text>
        </View>

        <H2 num="1.3" title={t("reportView.hOverall")} />
        <View style={styles.pillRow}>
          <Text style={[styles.pill, styles.pillPrimary]}>{readiness}</Text>
          <Text style={styles.pill}>
            {t("reportView.risk")} · {oas.risk_level}
          </Text>
          {oas.needs_eal_support && (
            <Text style={[styles.pill, styles.pillWarn]}>{t("reportView.ealBadge")}</Text>
          )}
          {oas.needs_foundation_year && (
            <Text style={[styles.pill, styles.pillWarn]}>{t("reportView.foundationBadge")}</Text>
          )}
        </View>
        <Text style={styles.p}>{oas.narrative}</Text>
        {oas.suitable_pathways.length > 0 && (
          <Text style={[styles.p, { color: C.muted }]}>
            <Text style={styles.strong}>{t("reportView.suitablePathways")} </Text>
            {oas.suitable_pathways.join(" · ")}
          </Text>
        )}

        <Footer orgName={orgName} label={t("reportPdf.footerConfidential")} />
      </Page>

      <Page size="A4" style={pageStyle}>
        <View style={styles.partWrap}>
          <Text style={styles.partEyebrow}>{U(t("reportView.partTwoEyebrow"))}</Text>
          <Text style={[styles.partTitle, boldTitle]}>{t("reportView.partTwoTitle")}</Text>
        </View>

        <H2 num="2.1" title={t("reportView.hPathway")} />
        <Text
          style={[
            styles.p,
            { fontSize: 14, color: C.ink },
            boldTitle ?? { fontFamily: "Times-Bold" },
          ]}
        >
          {rp.primary}
        </Text>
        <Text style={styles.p}>{rp.rationale}</Text>
        {rp.alternatives && rp.alternatives.length > 0 && (
          <Text style={[styles.p, { color: C.muted }]}>
            <Text style={styles.strong}>{t("reportView.alternatives")} </Text>
            {rp.alternatives.join(" · ")}
          </Text>
        )}

        <H2 num="2.2" title={t("reportView.hSchools")} />
        {payload.school_recommendations.map((r, idx) => {
          const fit = FIT_STYLE[r.fit_label] ?? FIT_STYLE.possible;
          const fitLabel = t(`reportView.fit.${r.fit_label}`, { defaultValue: r.fit_label });
          return (
            <View key={r.school_slug} style={styles.schoolCard} wrap={false}>
              <View style={styles.schoolHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schoolNum}>2.2.{idx + 1}</Text>
                  <Text style={[styles.schoolTitle, boldTitle]}>
                    {schoolDisplayName(r.school_slug)}
                  </Text>
                </View>
                <Text style={[styles.fitBadge, { backgroundColor: fit.bg, color: fit.fg }]}>
                  {fitLabel}
                </Text>
              </View>
              <Text style={[styles.p, { marginBottom: 0 }]}>{r.rationale}</Text>
              {r.caveats && (
                <Text style={styles.caveat}>
                  <Text style={[styles.strong, boldTitle ?? { fontFamily: "Times-Bold" }]}>
                    {t("reportView.importantCaveat")}{" "}
                  </Text>
                  {r.caveats}
                </Text>
              )}
            </View>
          );
        })}

        <Footer orgName={orgName} label={t("reportPdf.footerConfidential")} />
      </Page>

      <Page size="A4" style={pageStyle}>
        <H2 num="2.3" title={t("reportView.hSummary")} />
        <View style={styles.table}>
          <View style={styles.trHeader}>
            <View style={{ width: "20%" }}>
              <Text style={styles.th}>{U(t("reportView.thSchool"))}</Text>
            </View>
            <View style={{ width: "20%" }}>
              <Text style={styles.th}>{U(t("reportView.thCurriculum"))}</Text>
            </View>
            <View style={{ width: "26%" }}>
              <Text style={styles.th}>{U(t("reportView.thKeyFit"))}</Text>
            </View>
            <View style={{ width: "14%" }}>
              <Text style={styles.th}>{U(t("reportView.thSelectivity"))}</Text>
            </View>
            <View style={{ width: "20%" }}>
              <Text style={styles.th}>{U(t("reportView.thRecommendation"))}</Text>
            </View>
          </View>
          {payload.summary_table.map((r, i) => (
            <View
              key={i}
              style={i === payload.summary_table.length - 1 ? styles.trLast : styles.tr}
            >
              <View style={{ width: "20%" }}>
                <Text style={[styles.td, styles.strong]}>{r.school_short_name}</Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.td}>{r.curriculum}</Text>
              </View>
              <View style={{ width: "26%" }}>
                <Text style={styles.td}>{r.key_fit}</Text>
              </View>
              <View style={{ width: "14%" }}>
                <Text style={styles.td}>{r.selectivity}</Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={styles.td}>{r.recommendation}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>{payload.disclaimer}</Text>

        <Footer orgName={orgName} label={t("reportPdf.footerConfidential")} />
      </Page>
    </Document>
  );
}

export async function downloadReportPdf(
  payload: ReportPayload,
  filename = "advisory-report.pdf",
  orgName = "Pathway Advisory",
  lang: ReportPdfLang = "en",
) {
  if (lang === "zh-Hans") ensureCjkFonts();
  const t = i18n.getFixedT(lang);
  const blob = await pdf(
    <ReportDocument payload={payload} orgName={orgName} lang={lang} t={t} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
