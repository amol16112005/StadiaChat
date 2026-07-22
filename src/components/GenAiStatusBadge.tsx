"use client";

import { useCallback, useEffect, useState } from "react";
import { t } from "@/lib/i18n";

type GenAiHealth = {
  online: boolean;
  active: "google" | "xai" | "heuristics";
  label: string;
  providers?: { google: boolean; xai: boolean };
};

type Props = {
  lang?: string;
  /** Poll interval ms (default 30s) */
  pollMs?: number;
  className?: string;
};

/**
 * Live badge: GenAI is the StadiaChat hero engine.
 * Green when Google or xAI key is configured; amber when offline heuristics only.
 */
export function GenAiStatusBadge({
  lang = "en",
  pollMs = 30_000,
  className = "",
}: Props) {
  const [health, setHealth] = useState<GenAiHealth | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health/genai", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as GenAiHealth;
      setHealth(data);
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const online = health?.online === true;
  const provider =
    health?.active === "google"
      ? t(lang, "genai.providerGoogle")
      : health?.active === "xai"
        ? t(lang, "genai.providerXai")
        : t(lang, "genai.providerHeuristics");

  const title = online
    ? t(lang, "genai.onlineTitle", { provider })
    : t(lang, "genai.offlineTitle");

  const label = !health
    ? t(lang, "genai.checking")
    : online
      ? t(lang, "genai.online", { provider })
      : t(lang, "genai.offline");

  return (
    <span
      className={`genai-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        !health
          ? "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]"
          : online
            ? "border-emerald-700/60 bg-emerald-950/50 text-emerald-300"
            : "border-amber-700/60 bg-amber-950/40 text-amber-200"
      } ${className}`}
      title={title}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <span
        className={`genai-dot h-1.5 w-1.5 rounded-full shrink-0 ${
          !health
            ? "bg-[var(--muted)]"
            : online
              ? "bg-emerald-400 genai-dot-pulse"
              : "bg-amber-400"
        }`}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
