"use client";

import { t } from "@/lib/i18n";

export type VolunteerMsg = {
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
  attachments?: {
    id: string;
    url: string;
    name: string;
    mime?: string;
    size?: number;
  }[];
  incident_id?: string;
  created_at: string;
};

export function VolunteerMessageBubble({
  m,
  self,
  lang,
  onAccept,
}: {
  m: VolunteerMsg;
  self: boolean;
  lang: string;
  onAccept: (id: string) => void;
}) {
  if (m.ui_component === "actionable_task_card") {
    return (
      <article
        className="card p-4 border-l-4 border-l-blue-500"
        aria-label={t(lang, "vol.task")}
      >
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
        {m.text && m.task_title && m.text.trim() !== m.task_title.trim() ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed mt-2 text-[var(--fg)]">
            {m.text}
          </div>
        ) : null}
        <div className="text-sm text-emerald-300 mt-1 font-medium">
          <span className="sr-only">{t(lang, "vol.location")}: </span>
          {m.location_tag || t(lang, "vol.general")}
        </div>
        {m.accept_action && !m.accepted && (
          <button
            type="button"
            className="btn btn-success mt-3 text-sm"
            onClick={() => onAccept(m.id)}
          >
            {t(lang, "vol.acceptTask")}
          </button>
        )}
        {m.accepted && (
          <span className="badge badge-ok mt-3">{t(lang, "vol.accepted")}</span>
        )}
      </article>
    );
  }

  if (m.ui_component === "volunteer_coaching") {
    return (
      <article
        className="card p-4 border-l-4 border-l-amber-500 bg-amber-950/20"
        aria-label={t(lang, "vol.coachingTitle")}
      >
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
          <time dateTime={m.created_at}>
            {new Date(m.created_at).toLocaleTimeString()}
          </time>
        </div>
      </article>
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
            <span className="badge badge-c" aria-label={t(lang, "vol.addPhoto")}>
              {t(lang, "vol.addPhoto")}
            </span>
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
                  alt={a.name || t(lang, "vol.addPhoto")}
                  className="h-28 w-28 object-cover rounded-lg border border-[var(--border)]"
                />
              </a>
            ))}
          </div>
        )}
        {m.text ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {m.text}
          </div>
        ) : null}
        <div className="text-[10px] text-[var(--muted)] mt-1">
          <time dateTime={m.created_at}>
            {new Date(m.created_at).toLocaleTimeString()}
          </time>
        </div>
      </div>
    </div>
  );
}
