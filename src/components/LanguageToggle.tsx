import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh-Hans";

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
      <Button
        type="button"
        size="sm"
        variant={!isZh ? "secondary" : "ghost"}
        className="h-7 px-2"
        onClick={() => void i18n.changeLanguage("en")}
      >
        {t("common.langEnglish")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={isZh ? "secondary" : "ghost"}
        className="h-7 px-2"
        onClick={() => void i18n.changeLanguage("zh-Hans")}
      >
        {t("common.langChinese")}
      </Button>
    </div>
  );
}
