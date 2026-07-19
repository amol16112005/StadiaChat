"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FAN_LANGUAGE_OPTIONS,
  createRecognizer,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from "@/lib/speech-client";
import { t } from "@/lib/i18n";

type Phase =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

type Props = {
  disabled?: boolean;
  onComplete?: () => void;
  lang?: string;
};

function isSecureForMic(): boolean {
  if (typeof window === "undefined") return true;
  // localhost / https only — LAN IPs (192.168.x.x) are "Not secure" and block mic
  return window.isSecureContext === true;
}

export function FanVoiceAssist({ disabled, onComplete, lang = "en" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fanLang, setFanLang] = useState("auto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [typed, setTyped] = useState("");
  const [coaching, setCoaching] = useState<{
    required: boolean;
    instructions?: string;
    steps?: string[];
  } | null>(null);
  const [error, setError] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalBuffer = useRef("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const sttSupported =
    typeof window !== "undefined" && isSpeechRecognitionSupported();
  const secure = typeof window !== "undefined" ? isSecureForMic() : true;
  const micOk = sttSupported && secure;
  const ttsOk =
    typeof window !== "undefined" && isSpeechSynthesisSupported();

  useEffect(() => {
    setMounted(true);
  }, []);

  const hardClose = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    stopSpeaking();
    setPhase("idle");
    setInterim("");
    setError("");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hardClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // Prevent body scroll under modal
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, hardClose]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      stopSpeaking();
    };
  }, []);

  // Scroll results into view when answer arrives (text path + voice path)
  useEffect(() => {
    if (!answer && !coaching?.required) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [answer, coaching]);

  const stopListen = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  const runAssist = useCallback(
    async (spoken: string) => {
      const text = spoken.trim();
      if (!text) {
        setError(t(lang, "fan.noSpeech"));
        setPhase("error");
        return;
      }

      setPhase("processing");
      setError("");
      setTranscript(text);
      setAnswer("");
      setCoaching(null);
      stopSpeaking();

      try {
        const res = await fetch("/api/fan-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            preferred_language: fanLang,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t(lang, "fan.assistFailed"));

        // Update UI first so text is always visible (even if TTS fails)
        setAnswer(data.answer || "");
        setDetectedLang(data.detected_language || data.answer_language || "");
        if (data.volunteer_assist_required) {
          setCoaching({
            required: true,
            instructions: data.volunteer_instructions,
            steps: data.coaching_steps,
          });
        } else {
          setCoaching({ required: false });
        }
        setTyped("");
        // Parent refresh (timeline) — do not close panel
        try {
          onComplete?.();
        } catch {
          /* ignore parent errors */
        }

        if (autoSpeak && data.answer) {
          setPhase("speaking");
          // Defer speak so React can paint the answer card first
          requestAnimationFrame(() => {
            speakText(data.answer, data.answer_language || fanLang, {
              onend: () => setPhase("idle"),
              onerror: () => setPhase("idle"),
            });
          });
        } else {
          setPhase("idle");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t(lang, "fan.assistFailed"));
        setPhase("error");
      }
    },
    [autoSpeak, fanLang, lang, onComplete]
  );

  const startListen = useCallback(() => {
    if (disabled || !micOk) {
      setError(
        !secure
          ? t(lang, "fan.notSecure")
          : !sttSupported
            ? t(lang, "fan.unsupported")
            : t(lang, "fan.micFail")
      );
      setPhase("error");
      return;
    }
    stopSpeaking();
    setError("");
    setInterim("");
    setTranscript("");
    setAnswer("");
    setCoaching(null);
    finalBuffer.current = "";

    const rec = createRecognizer({
      lang: fanLang === "auto" ? "en" : fanLang,
      continuous: true,
      interimResults: true,
    });
    if (!rec) {
      setError(t(lang, "fan.unsupported"));
      setPhase("error");
      return;
    }

    if (fanLang === "auto") {
      rec.lang = navigator.language || "en-US";
    }

    rec.onstart = () => setPhase("listening");
    rec.onerror = (ev) => {
      const code = (ev as { error?: string }).error;
      if (code === "aborted" || code === "no-speech") {
        setPhase("idle");
        return;
      }
      setError(
        code === "not-allowed"
          ? t(lang, "fan.micDenied")
          : code === "service-not-allowed" || code === "network"
            ? t(lang, "fan.notSecure")
            : `Speech error: ${code || "unknown"}`
      );
      setPhase("error");
    };
    rec.onresult = (ev) => {
      let interimText = "";
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const piece = r[0]?.transcript || "";
        if (r.isFinal) finalChunk += piece;
        else interimText += piece;
      }
      if (finalChunk) {
        finalBuffer.current = `${finalBuffer.current} ${finalChunk}`.trim();
        setTranscript(finalBuffer.current);
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      /* stop handled explicitly */
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError(t(lang, "fan.micFail"));
      setPhase("error");
    }
  }, [disabled, fanLang, lang, micOk, secure, sttSupported]);

  const handleMicToggle = () => {
    if (phase === "listening") {
      stopListen();
      const spoken = (
        finalBuffer.current ||
        transcript ||
        interim
      ).trim();
      void runAssist(spoken);
      return;
    }
    if (phase === "speaking") {
      stopSpeaking();
      setPhase("idle");
      return;
    }
    if (phase === "processing") return;
    startListen();
  };

  const replay = () => {
    if (!answer) return;
    setPhase("speaking");
    speakText(answer, detectedLang || fanLang, {
      onend: () => setPhase("idle"),
      onerror: () => setPhase("idle"),
    });
  };

  const onTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = typed.trim();
    if (!text || phase === "processing") return;
    stopListen();
    void runAssist(text);
  };

  const panel =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {/* Backdrop — always closes */}
            <button
              type="button"
              className="absolute inset-0 bg-black/70 border-0 cursor-pointer"
              aria-label={t(lang, "fan.close")}
              onClick={hardClose}
            />

            <div
              className="relative z-[101] w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col card border-emerald-700/60 shadow-2xl shadow-black/60 rounded-t-2xl sm:rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header with close */}
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--border)] bg-[#121a2b] shrink-0">
                <div className="min-w-0">
                  <div id={titleId} className="font-semibold text-sm">
                    {t(lang, "fan.title")}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5 leading-snug">
                    {t(lang, "fan.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-danger text-sm py-2 px-3 shrink-0 font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hardClose();
                  }}
                >
                  ✕ {t(lang, "fan.close")}
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto chat-scroll px-4 py-3 space-y-3 min-h-0">
                {!secure && (
                  <div className="rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                    <strong className="block mb-1">{t(lang, "fan.notSecureTitle")}</strong>
                    {t(lang, "fan.notSecure")}
                  </div>
                )}
                {secure && !sttSupported && (
                  <div className="rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                    {t(lang, "fan.unsupported")}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t(lang, "fan.fanLanguage")}</label>
                    <select
                      className="input"
                      value={fanLang}
                      onChange={(e) => setFanLang(e.target.value)}
                      disabled={phase === "listening" || phase === "processing"}
                    >
                      {FAN_LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)] pb-2">
                      <input
                        type="checkbox"
                        checked={autoSpeak}
                        onChange={(e) => setAutoSpeak(e.target.checked)}
                      />
                      {t(lang, "fan.autoSpeak")} (
                      {ttsOk ? t(lang, "fan.speakerOn") : t(lang, "fan.ttsOff")})
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`btn text-sm ${
                      phase === "listening"
                        ? "btn-danger pulse-critical"
                        : phase === "speaking"
                          ? "btn-primary"
                          : "btn-success"
                    }`}
                    disabled={disabled || phase === "processing" || !micOk}
                    onClick={handleMicToggle}
                    title={
                      !micOk ? t(lang, "fan.notSecure") : undefined
                    }
                  >
                    {phase === "listening"
                      ? `⏹ ${t(lang, "fan.stopAnswer")}`
                      : phase === "processing"
                        ? t(lang, "fan.processing")
                        : phase === "speaking"
                          ? `⏹ ${t(lang, "fan.stopSpeaker")}`
                          : `🎤 ${t(lang, "fan.listen")}`}
                  </button>
                  {answer && (
                    <button
                      type="button"
                      className="btn text-sm"
                      onClick={replay}
                    >
                      🔊 {t(lang, "fan.replay")}
                    </button>
                  )}
                  <span className="badge badge-ok text-[10px]">
                    {phase === "idle" && t(lang, "fan.ready")}
                    {phase === "listening" && t(lang, "fan.listening")}
                    {phase === "processing" && t(lang, "fan.aiRouting")}
                    {phase === "speaking" && t(lang, "fan.speaking")}
                    {phase === "error" && t(lang, "fan.error")}
                  </span>
                </div>

                {/* Results — always painted when present */}
                <div ref={resultsRef} className="space-y-2">
                  {(interim || transcript) && (
                    <div className="rounded-lg border border-[var(--border)] bg-[#0d1526] p-3">
                      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">
                        {t(lang, "fan.said")}
                        {detectedLang
                          ? ` · ${t(lang, "fan.detected")}: ${detectedLang}`
                          : ""}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {transcript}
                        {interim && (
                          <span className="text-[var(--muted)]"> {interim}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {answer ? (
                    <div className="rounded-lg border border-emerald-600/70 bg-emerald-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-emerald-300 mb-1">
                        {t(lang, "fan.answerSpoken")}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {answer}
                      </div>
                    </div>
                  ) : null}

                  {coaching?.required ? (
                    <div className="rounded-lg border border-amber-600/70 bg-amber-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-amber-200 mb-1">
                        {t(lang, "fan.coachingTitle")}
                      </div>
                      {coaching.steps && coaching.steps.length > 0 ? (
                        <ol className="list-decimal pl-4 space-y-1 text-sm">
                          {coaching.steps.map((step, i) => (
                            <li key={i} className="break-words">
                              {step}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {coaching.instructions}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {error && (
                  <p className="text-sm text-red-300 whitespace-pre-wrap">
                    {error}
                  </p>
                )}
              </div>

              {/* Sticky text form — primary path when mic blocked */}
              <form
                className="shrink-0 border-t border-[var(--border)] bg-[#0d1526] p-3 flex gap-2"
                onSubmit={onTypedSubmit}
              >
                <input
                  className="input text-sm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={t(lang, "fan.typeFallback")}
                  disabled={disabled || phase === "processing"}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="btn btn-primary text-sm shrink-0"
                  disabled={
                    disabled || phase === "processing" || !typed.trim()
                  }
                >
                  {phase === "processing"
                    ? t(lang, "fan.processing")
                    : t(lang, "fan.ask")}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={`btn text-sm py-1.5 border-emerald-700/50 ${
          open ? "bg-emerald-700/50" : "bg-emerald-950/40"
        }`}
        disabled={disabled}
        onClick={() => {
          if (open) hardClose();
          else {
            setOpen(true);
            setError("");
          }
        }}
        title={t(lang, "fan.title")}
      >
        🎤 {t(lang, "vol.fanVoice")}
      </button>
      {panel}
    </>
  );
}
