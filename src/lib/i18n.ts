import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";
import it from "./locales/it.json";
import hi from "./locales/hi.json";

export type UiLang =
  | "en"
  | "es"
  | "fr"
  | "pt"
  | "de"
  | "ar"
  | "ja"
  | "ko"
  | "zh"
  | "it"
  | "hi";

type Dict = Record<string, string>;

const TABLES: Record<string, Dict> = {
  en: en as Dict,
  es: es as Dict,
  fr: fr as Dict,
  pt: pt as Dict,
  de: de as Dict,
  ar: ar as Dict,
  ja: ja as Dict,
  ko: ko as Dict,
  zh: zh as Dict,
  it: it as Dict,
  hi: hi as Dict,
};

export function normalizeLang(code?: string | null): string {
  if (!code) return "en";
  const c = code.toLowerCase().slice(0, 2);
  return TABLES[c] ? c : "en";
}

export function t(
  lang: string | undefined | null,
  key: string,
  vars?: Record<string, string | number>
): string {
  const l = normalizeLang(lang);
  const table = TABLES[l] || (en as Dict);
  let s = table[key] ?? (en as Dict)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function statusLabel(
  lang: string | undefined | null,
  status: string
): string {
  const key = `common.${status}` as const;
  const translated = t(lang, key);
  return translated === key ? status : translated;
}
