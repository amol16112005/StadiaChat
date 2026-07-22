"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStickyChatScroll } from "@/lib/useStickyChatScroll";
import { statusLabel, t } from "@/lib/i18n";
import { GenAiStatusBadge } from "@/components/GenAiStatusBadge";

type Msg = {
  id: string;
  sender_name: string;
  sender_role: string;
  text: string;
  category?: string;
  ui_component?: string;
  audio_alert?: boolean;
  attachments?: { id: string; url: string; name: string }[];
  remediation_options?: string[];
  incident_id?: string;
  created_at: string;
};

type Incident = {
  id: string;
  reporter_name: string;
  text: string;
  severity: string;
  status: string;
  category: string;
  remediation_options: string[];
  timer_deadline?: string;
  created_at: string;
};

export default function OpsTimelinePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [session, setSession] = useState<{
    name: string;
    stadium_id: string;
    preferred_language?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [customByIncident, setCustomByIncident] = useState<
    Record<string, string>
  >({});
  const [filter, setFilter] = useState<"all" | "C" | "D" | "other">("all");

  const filteredMessages = useMemo(() => {
    if (filter === "all") return messages;
    if (filter === "C") return messages.filter((m) => m.category === "C");
    if (filter === "D")
      return messages.filter(
        (m) =>
          m.category === "D" ||
          m.ui_component === "serious_alert" ||
          m.audio_alert
      );
    return messages.filter(
      (m) => m.category !== "C" && m.category !== "D" && !m.audio_alert
    );
  }, [messages, filter]);

  const { containerRef, bottomRef, onScroll } = useStickyChatScroll(
    filteredMessages.length
  );

  const openIncidents = useMemo(
    () =>
      incidents.filter((i) => {
        if (i.status !== "open") return false;
        if (filter === "C") return i.category === "C";
        if (filter === "D")
          return i.category === "D" || i.severity === "serious";
        if (filter === "other") return false;
        return true;
      }),
    [incidents, filter]
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (res.status === 401) {
      router.replace("/");
      return;
    }
    const data = await res.json();
    if (data.session?.user_role !== "Operations_Lead") {
      router.replace("/volunteer");
      return;
    }
    setSession(data.session);
    if (data.session?.preferred_language) {
      try {
        localStorage.setItem("stadia_lang", data.session.preferred_language);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = data.session.preferred_language;
    }
    setMessages(data.messages || []);
    setIncidents(data.incidents || []);
  }, [router]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 2000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function resolve(
    incidentId: string,
    option?: string,
    custom?: string
  ) {
    setError("");
    const res = await fetch("/api/incidents/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incident_id: incidentId,
        option,
        custom_instruction: custom,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Resolve failed");
      return;
    }
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  const lang = session?.preferred_language || "en";

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center text-[var(--muted)]">
        {t("en", "ops.init")}
      </div>
    );
  }

  return (
    <div className="min-h-screen" lang={lang}>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#0b1220f2] backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold tracking-wide">
            {t(lang, "ops.timeline")}
          </div>
          <div className="text-xs text-[var(--muted)]">
            {session.name} · {t(lang, "ops.tenancy")} {session.stadium_id}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GenAiStatusBadge lang={lang} />
          <nav className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5 bg-[var(--panel)]">
            <Link href="/ops" className="btn text-xs py-1.5 px-2.5">
              {t(lang, "ops.navCritical")}
            </Link>
            <span className="btn btn-primary text-xs py-1.5 px-2.5 cursor-default">
              {t(lang, "ops.navTimeline")}
            </span>
          </nav>
          <Link href="/profile" className="btn text-sm py-1.5">
            {t(lang, "common.profile")}
          </Link>
          <button className="btn text-sm py-1.5" onClick={logout}>
            {t(lang, "common.logout")}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-4">
        <section className="lg:col-span-8 card p-4 flex flex-col min-h-[75vh]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold">{t(lang, "ops.timeline")}</h2>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", t(lang, "ops.filterAll")],
                  ["D", "Cat D"],
                  ["C", "Cat C"],
                  ["other", t(lang, "ops.filterOther")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn text-xs py-1 px-2 ${filter === key ? "btn-primary" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mb-2 text-sm text-red-300">{error}</div>
          )}
          <div
            ref={containerRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto chat-scroll space-y-3 pr-1"
          >
            {filteredMessages.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center mt-10">
                {t(lang, "ops.timelineEmpty")}
              </p>
            )}
            {filteredMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  m.ui_component === "serious_alert" || m.audio_alert
                    ? "border-red-600 bg-red-950/30 pulse-critical"
                    : m.ui_component === "alert_card"
                      ? "border-amber-700 bg-amber-950/20"
                      : "border-[var(--border)] bg-[#0d1526]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-[var(--muted)]">
                    {m.sender_name} · {m.sender_role}
                  </span>
                  {m.category && (
                    <span className={`badge badge-${m.category.toLowerCase()}`}>
                      Cat {m.category}
                    </span>
                  )}
                  {m.audio_alert && (
                    <span className="badge badge-d">
                      {t(lang, "ops.audioAlert")}
                    </span>
                  )}
                </div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 mt-1">
                    {m.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.url}
                          alt={a.name}
                          className="max-h-40 max-w-[220px] rounded-lg border border-[var(--border)] object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] text-[var(--muted)] mt-1">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold px-1">
            {t(lang, "ops.incidentConsole")}
          </h2>
          <p className="text-[11px] text-[var(--muted)] px-1">
            {t(lang, "ops.timelineIncidentHint")}
          </p>
          {openIncidents.length === 0 && (
            <div className="card p-4 text-sm text-[var(--muted)]">
              {t(lang, "ops.noOpen")}
            </div>
          )}
          {openIncidents.map((inc) => {
            const remaining = inc.timer_deadline
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(inc.timer_deadline).getTime() - now) / 1000
                  )
                )
              : null;
            return (
              <div
                key={inc.id}
                className={`card p-4 ${
                  inc.severity === "serious" || inc.category === "D"
                    ? "border-red-700 pulse-critical"
                    : "border-amber-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`badge ${
                      inc.category === "D" || inc.severity === "serious"
                        ? "badge-d"
                        : "badge-c"
                    }`}
                  >
                    {inc.severity === "serious"
                      ? t(lang, "ops.serious")
                      : t(lang, "ops.normal")}{" "}
                    · Cat {inc.category}
                  </span>
                  {remaining !== null && (
                    <span className="text-xs font-mono text-red-300">
                      T-{remaining}s
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium mb-1">
                  {inc.reporter_name}
                </div>
                <div className="text-sm text-[var(--muted)] mb-3 whitespace-pre-wrap">
                  {inc.text}
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wide">
                    {t(lang, "ops.remediation")}
                  </div>
                  {inc.remediation_options.map((opt, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2 cursor-pointer hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        onChange={(e) => {
                          if (e.target.checked) resolve(inc.id, opt);
                        }}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                  <textarea
                    className="input min-h-[60px] text-sm"
                    placeholder={t(lang, "ops.manualPlaceholder")}
                    value={customByIncident[inc.id] || ""}
                    onChange={(e) =>
                      setCustomByIncident((s) => ({
                        ...s,
                        [inc.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn btn-primary w-full text-sm"
                    onClick={() =>
                      resolve(inc.id, undefined, customByIncident[inc.id])
                    }
                  >
                    {t(lang, "ops.blast")}
                  </button>
                </div>
              </div>
            );
          })}

          {incidents.filter((i) => i.status !== "open").length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-[var(--muted)] mb-2">
                {t(lang, "ops.closed")}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {incidents
                  .filter((i) => i.status !== "open")
                  .slice(0, 12)
                  .map((i) => (
                    <div
                      key={i.id}
                      className="text-xs border-b border-[var(--border)] pb-2"
                    >
                      <span className="badge badge-ok mr-1">
                        {statusLabel(lang, i.status)}
                      </span>
                      <span className="badge badge-b mr-1">
                        Cat {i.category}
                      </span>
                      {i.reporter_name}: {i.text.slice(0, 80)}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
