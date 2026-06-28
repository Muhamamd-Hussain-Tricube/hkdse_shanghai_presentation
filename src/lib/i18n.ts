import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "@/locales/en";
import { zhHans } from "@/locales/zh-Hans";

export const LOCALE_STORAGE_KEY = "edadvisor_locale";

function readStoredLocale(): "en" | "zh-Hans" {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return v === "zh-Hans" ? "zh-Hans" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-Hans": { translation: zhHans },
  },
  lng: readStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng === "zh-Hans" ? "zh-Hans" : "en";
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language === "zh-Hans" ? "zh-Hans" : "en";
}

export default i18n;
