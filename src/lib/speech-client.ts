/** Browser SpeechRecognition + SpeechSynthesis helpers (Fan Assist voice mode). */

export type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string; confidence: number };
  readonly length: number;
};

export type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike> & {
    length: number;
  };
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event & { error?: string }) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Map short language codes → BCP-47 for STT/TTS engines */
export const LANG_LOCALE: Record<string, string> = {
  auto: "",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-BR",
  de: "de-DE",
  ar: "ar-SA",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
  it: "it-IT",
  hi: "hi-IN",
};

export const FAN_LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "it", label: "Italiano" },
  { code: "hi", label: "हिन्दी" },
];

export function localeForLang(lang: string): string {
  if (!lang || lang === "auto") return navigator.language || "en-US";
  return LANG_LOCALE[lang] || lang;
}

export function createRecognizer(options: {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
}): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = options.lang === "auto" ? "en-US" : localeForLang(options.lang);
  rec.continuous = options.continuous ?? false;
  rec.interimResults = options.interimResults ?? true;
  rec.maxAlternatives = 1;
  return rec;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const locale = localeForLang(lang).toLowerCase();
  const short = (lang === "auto" ? "en" : lang).toLowerCase().slice(0, 2);

  return (
    voices.find((v) => v.lang.toLowerCase() === locale) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(short)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(short.split("-")[0])) ||
    null
  );
}

/** Speak text in the fan's language. Cancels any in-flight utterance. */
export function speakText(
  text: string,
  lang: string,
  options?: { rate?: number; onend?: () => void; onerror?: () => void }
): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options?.onend?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = localeForLang(lang);
  utter.rate = options?.rate ?? 1;
  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;

  utter.onend = () => options?.onend?.();
  utter.onerror = () => options?.onerror?.();

  // Chrome sometimes needs voices loaded first
  const start = () => window.speechSynthesis.speak(utter);
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickVoice(lang);
      if (v) utter.voice = v;
      start();
    };
    // fallback if event never fires
    setTimeout(start, 250);
  } else {
    start();
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
