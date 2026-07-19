"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStickyChatScroll } from "@/lib/useStickyChatScroll";
import { FanVoiceAssist } from "@/components/FanVoiceAssist";
import { statusLabel, t } from "@/lib/i18n";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/upload-limits";

type Attachment = {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
};

type Msg = {
  id: string;
  sender_name: string;
  sender_role: string;
  text: string;
  category?: string;
  ui_component?: string;
  task_title?: string;
  location_tag?: string;
  location_detail?: string;
  priority?: string;
  accept_action?: boolean;
  accepted?: boolean;
  coaching_steps?: string[];
  attachments?: Attachment[];
  incident_id?: string;
  created_at: string;
};

type Incident = {
  id: string;
  status: string;
  severity: string;
  timer_deadline?: string;
};

type OpsPlan = {
  id: string;
  title: string;
  description: string;
  location_tag: string;
  priority: string;
  status: string;
  time_window?: string;
};

export default function VolunteerPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [plans, setPlans] = useState<OpsPlan[]>([]);
  const [session, setSession] = useState<{
    name: string;
    stadium_id: string;
    status: string;
    preferred_language: string;
  } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<Attachment | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const { containerRef, bottomRef, onScroll, pinToBottom } =
    useStickyChatScroll(messages.length);

  const lang = session?.preferred_language || "en";

  const load = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (res.status === 401) {
      router.replace("/");
      return;
    }
    const data = await res.json();
    if (data.session?.user_role === "Operations_Lead") {
      router.replace("/ops");
      return;
    }
    setSession(data.session);
    if (data.session?.preferred_language) {
      try {
        localStorage.setItem("stadia_lang", data.session.preferred_language);
      } catch {
        /* ignore */
      }
      if (typeof document !== "undefined") {
        document.documentElement.lang = data.session.preferred_language;
      }
    }
    setMessages((prev) => {
      const next = data.messages || [];
      if (
        prev.length === next.length &&
        prev.every(
          (m, i) =>
            m.id === next[i]?.id &&
            m.accepted === next[i]?.accepted &&
            m.text === next[i]?.text &&
            (m.attachments?.length || 0) === (next[i]?.attachments?.length || 0)
        )
      ) {
        return prev;
      }
      return next;
    });
    setIncidents(data.incidents || []);
    setPlans(data.plans || []);
  }, [router]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 2500);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t(lang, "vol.photoFailed"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t(lang, "vol.photoFailed") + ` (max ${MAX_PHOTO_MB} MB)`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t(lang, "vol.photoFailed"));
      setPendingPhoto(data.attachment);
      setPhotoPreview(data.attachment.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "vol.photoFailed"));
      setPendingPhoto(null);
      setPhotoPreview(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearPhoto() {
    setPendingPhoto(null);
    setPhotoPreview(null);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending || uploading) return;
    if (!text.trim() && !pendingPhoto) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          attachments: pendingPhoto ? [pendingPhoto] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t(lang, "vol.sendFailed"));
      setText("");
      clearPhoto();
      pinToBottom();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "vol.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function acceptTask(messageId: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId }),
    });
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  const openSerious = incidents.find(
    (i) => i.severity === "serious" && i.status === "open" && i.timer_deadline
  );
  const remaining = openSerious?.timer_deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(openSerious.timer_deadline).getTime() - now) / 1000
        )
      )
    : null;

  if (!session) {
    return (
      <div
        className="min-h-screen grid place-items-center text-[var(--muted)]"
        role="status"
        aria-live="polite"
      >
        {t("en", "common.loadingSession")}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto" lang={lang}>
      <a href="#composer" className="skip-link">
        {t(lang, "vol.skipToComposer")}
      </a>
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[#0b1220ee] backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-base">{t(lang, "vol.title")}</h1>
          <div className="text-xs text-[var(--muted)]">
            {session.name} · {session.stadium_id} · {t(lang, "common.lang")}{" "}
            {session.preferred_language}
          </div>
        </div>
        <nav
          className="flex items-center gap-2 flex-wrap justify-end"
          aria-label={t(lang, "vol.navLabel")}
        >
          <FanVoiceAssist
            lang={lang}
            disabled={session.status !== "approved"}
            onComplete={() => {
              pinToBottom();
              void load();
            }}
          />
          <Link href="/profile" className="btn text-sm py-1.5">
            {t(lang, "common.profile")}
          </Link>
          <span
            className={`badge ${session.status === "approved" ? "badge-ok" : "badge-pending"}`}
          >
            {statusLabel(lang, session.status)}
          </span>
          <button type="button" className="btn text-sm py-1.5" onClick={logout}>
            {t(lang, "common.logout")}
          </button>
        </nav>
      </header>

      {session.status !== "approved" && (
        <div
          className="mx-4 mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
          role="status"
          aria-live="polite"
        >
          {t(lang, "vol.pendingBanner")}
        </div>
      )}

      {remaining !== null && (
        <div
          className="mx-4 mt-4 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-100 pulse-critical"
          role="alert"
          aria-live="assertive"
        >
          {t(lang, "vol.seriousTimer", { s: remaining })}
        </div>
      )}

      {plans.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            {t(lang, "ops.myPosts")}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {plans.map((p) => (
              <div
                key={p.id}
                className="card shrink-0 min-w-[200px] max-w-[260px] p-3 border-blue-800/50"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="badge badge-c text-[10px]">{p.priority}</span>
                  <span className="badge badge-ok text-[10px]">{p.status}</span>
                </div>
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-emerald-300 mt-1">
                  <span className="sr-only">{t(lang, "vol.location")}: </span>
                  {p.location_tag}
                </div>
                {p.time_window && (
                  <div className="text-[11px] text-[var(--muted)]">
                    <span className="sr-only">{t(lang, "ops.timeWindow")}: </span>
                    {p.time_window}
                  </div>
                )}
                {p.description && (
                  <p className="text-[11px] text-[var(--muted)] mt-1 line-clamp-2">
                    {p.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <main
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3"
        aria-label={t(lang, "vol.chatLabel")}
        role="log"
        aria-relevant="additions"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)] text-center mt-10">
            {t(lang, "vol.empty")}
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            m={m}
            lang={lang}
            self={m.sender_role === "Volunteer"}
            onAccept={acceptTask}
          />
        ))}
        <div ref={bottomRef} />
      </main>

      {error && (
        <div
          className="px-4 text-sm text-red-300 mb-2"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {photoPreview && (
        <div className="px-3 pt-2 border-t border-[var(--border)] bg-[#0b1220] flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt="preview"
            className="h-16 w-16 object-cover rounded-lg border border-[var(--border)]"
          />
          <div className="text-xs text-[var(--muted)] flex-1">
            {pendingPhoto?.name || "photo"} ·{" "}
            {pendingPhoto
              ? `${Math.round(pendingPhoto.size / 1024)} KB`
              : ""}
          </div>
          <button
            type="button"
            className="btn text-xs py-1"
            onClick={clearPhoto}
          >
            {t(lang, "vol.removePhoto")}
          </button>
        </div>
      )}

      <form
        id="composer"
        onSubmit={send}
        className="border-t border-[var(--border)] p-3 flex flex-col gap-2 bg-[#0b1220] scroll-mt-20"
        aria-label={t(lang, "vol.composerLabel")}
      >
        <div className="flex gap-2 items-end">
          <input
            ref={fileRef}
            id="vol-photo-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
            aria-label={t(lang, "vol.addPhoto")}
          />
          <button
            type="button"
            className="btn text-sm py-2 shrink-0"
            disabled={
              session.status !== "approved" || sending || uploading
            }
            onClick={() => fileRef.current?.click()}
            title={t(lang, "vol.photoHint")}
            aria-label={t(lang, "vol.addPhoto")}
          >
            {uploading ? "…" : t(lang, "vol.addPhoto")}
          </button>
          <label className="sr-only" htmlFor="vol-message-input">
            {t(lang, "vol.placeholder")}
          </label>
          <input
            id="vol-message-input"
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              session.status === "approved"
                ? t(lang, "vol.placeholder")
                : t(lang, "vol.awaiting")
            }
            disabled={session.status !== "approved" || sending}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary shrink-0"
            disabled={
              session.status !== "approved" ||
              sending ||
              uploading ||
              (!text.trim() && !pendingPhoto)
            }
          >
            {sending
              ? "…"
              : uploading
                ? t(lang, "vol.photoUploading")
                : t(lang, "common.send")}
          </button>
        </div>
        <p
          id="vol-photo-hint"
          className="text-sm sm:text-base font-medium leading-snug px-1 py-1.5 rounded-lg bg-sky-950/50 border border-sky-500/40 text-sky-100"
        >
          {t(lang, "vol.photoHint")}
        </p>
      </form>
    </div>
  );
}

function MessageBubble({
  m,
  self,
  lang,
  onAccept,
}: {
  m: Msg;
  self: boolean;
  lang: string;
  onAccept: (id: string) => void;
}) {
  if (m.ui_component === "actionable_task_card") {
    return (
      <div className="card p-4 border-l-4 border-l-blue-500">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs text-[var(--muted)]">
            {t(lang, "vol.task")} · {m.sender_name}
          </span>
          {m.priority && (
            <span
              className={`badge text-[10px] ${
                m.priority === "critical"
                  ? "badge-d"
                  : m.priority === "high"
                    ? "badge-c"
                    : "badge-a"
              }`}
            >
              {t(lang, "ops.priorityLabel")}: {m.priority}
            </span>
          )}
        </div>
        <div className="font-semibold">{m.task_title || m.text}</div>
        <div className="text-sm text-emerald-300 mt-1 font-medium">
          📍 {t(lang, "vol.location")}:{" "}
          {m.location_tag || t(lang, "vol.general")}
        </div>
        {m.accept_action && !m.accepted && (
          <button
            className="btn btn-success mt-3 text-sm"
            onClick={() => onAccept(m.id)}
          >
            {t(lang, "vol.acceptTask")}
          </button>
        )}
        {m.accepted && (
          <span className="badge badge-ok mt-3">{t(lang, "vol.accepted")}</span>
        )}
      </div>
    );
  }

  if (m.ui_component === "volunteer_coaching") {
    return (
      <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-950/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge badge-c">{t(lang, "vol.coachingBadge")}</span>
          <span className="text-xs text-[var(--muted)]">{m.sender_name}</span>
        </div>
        <div className="font-semibold text-sm mb-2">
          {m.task_title || t(lang, "vol.coachingTitle")}
        </div>
        {m.coaching_steps && m.coaching_steps.length > 0 ? (
          <ol className="list-decimal pl-4 space-y-1.5 text-sm leading-relaxed">
            {m.coaching_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {m.text}
          </div>
        )}
        <div className="text-[10px] text-[var(--muted)] mt-2">
          {t(lang, "vol.coachingFooter")} ·{" "}
          {new Date(m.created_at).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${self ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 border ${
          self
            ? "bg-blue-950/50 border-blue-800/50"
            : "bg-[var(--panel)] border-[var(--border)]"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--muted)]">
            {m.sender_name}
          </span>
          {m.category && (
            <span className={`badge badge-${m.category.toLowerCase()}`}>
              Cat {m.category}
            </span>
          )}
          {m.ui_component === "fan_voice_reply" && (
            <span className="badge badge-ok">{t(lang, "vol.fanVoiceBadge")}</span>
          )}
          {m.attachments && m.attachments.length > 0 && (
            <span className="badge badge-c">📷</span>
          )}
        </div>
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
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
                  className="max-h-48 max-w-full rounded-lg border border-[var(--border)] object-cover"
                />
              </a>
            ))}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {m.text}
        </div>
        <div className="text-[10px] text-[var(--muted)] mt-1">
          {new Date(m.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
