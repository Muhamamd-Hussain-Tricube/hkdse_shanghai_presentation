import { useTranslation } from "react-i18next";

/** Shown when UI is in Simplified Chinese: English report is authoritative. */
export function LocaleDisclaimerBanner() {
  const { i18n, t } = useTranslation();
  if (i18n.language !== "zh-Hans") return null;
  return (
    <div
      role="note"
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground"
    >
      {t("disclaimer.zhAuthoritative")}
    </div>
  );
}
