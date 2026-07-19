export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English (en)" },
  { code: "es", label: "Español (es)" },
  { code: "fr", label: "Français (fr)" },
  { code: "pt", label: "Português (pt)" },
  { code: "de", label: "Deutsch (de)" },
  { code: "ar", label: "العربية (ar)" },
  { code: "ja", label: "日本語 (ja)" },
  { code: "ko", label: "한국어 (ko)" },
  { code: "zh", label: "中文 (zh)" },
  { code: "it", label: "Italiano (it)" },
  { code: "hi", label: "हिन्दी (hi)" },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];
