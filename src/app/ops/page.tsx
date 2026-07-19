"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStickyChatScroll } from "@/lib/useStickyChatScroll";
import { statusLabel, t } from "@/lib/i18n";
import {
  ASSISTANCE_LOCATIONS,
  PLAN_PRIORITIES,
  PLAN_STATUSES,
} from "@/lib/locations";

type User = {
  id: string;
  name: string;
  preferred_language: string;
  status: string;
  role: string;
};

type Msg = {
  id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string;
  text: string;
  category?: string;
  ui_component?: string;
  remediation_options?: string[];
  incident_id?: string;
  audio_alert?: boolean;
  location_tag?: string;
  priority?: string;
  attachments?: { id: string; url: string; name: string }[];
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

type OpsPlan = {
  id: string;
  title: string;
  description: string;
  location_tag: string;
  location_detail?: string;
  priority: string;
  status: string;
  assigned_volunteer_ids: string[];
  time_window?: string;
  created_by_name: string;
  updated_at: string;
};

export default function OpsPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [plans, setPlans] = useState<OpsPlan[]>([]);
  const [session, setSession] = useState<{
    name: string;
    stadium_id: string;
    preferred_language?: string;
  } | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState("");
  const [command, setCommand] = useState("");
  const [taskLocation, setTaskLocation] = useState("Gate 1");
  const [taskLocationCustom, setTaskLocationCustom] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planLocation, setPlanLocation] = useState("Guest Services");
  const [planLocationCustom, setPlanLocationCustom] = useState("");
  const [planPriority, setPlanPriority] = useState("high");
  const [planWindow, setPlanWindow] = useState("T-60 to kickoff");
  const [planVolunteers, setPlanVolunteers] = useState<string[]>([]);
  const [customByIncident, setCustomByIncident] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const audioPlayed = useRef<Set<string>>(new Set());

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
            m.text === next[i]?.text &&
            m.ui_component === next[i]?.ui_component
        )
      ) {
        return prev;
      }
      return next;
    });
    setUsers(data.users || []);
    setIncidents(data.incidents || []);
    setPlans(data.plans || []);

    // Critical audio alert payload
    for (const m of data.messages || []) {
      if (
        m.audio_alert &&
        m.ui_component === "serious_alert" &&
        !audioPlayed.current.has(m.id)
      ) {
        audioPlayed.current.add(m.id);
        playCriticalBeep();
      }
    }
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

  const pending = useMemo(
    () => users.filter((u) => u.status === "pending"),
    [users]
  );
  const approved = useMemo(
    () => users.filter((u) => u.status === "approved"),
    [users]
  );
  /** First page: Category D / serious only */
  const criticalMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.category === "D" ||
          m.ui_component === "serious_alert" ||
          m.audio_alert === true
      ),
    [messages]
  );
  const openCriticalIncidents = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status === "open" &&
          (i.category === "D" || i.severity === "serious")
      ),
    [incidents]
  );
  const closedCritical = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status !== "open" &&
          (i.category === "D" || i.severity === "serious")
      ),
    [incidents]
  );

  const { containerRef, bottomRef, onScroll, pinToBottom } =
    useStickyChatScroll(criticalMessages.length);

  async function approve(userId: string, action: "approve" | "reject") {
    await fetch("/api/ops/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    await load();
  }

  async function assignTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedVolunteer || !command.trim()) return;
    const location_tag =
      taskLocation === "Custom" ? "Custom" : taskLocation;
    const location_detail =
      taskLocation === "Custom" ? taskLocationCustom.trim() : undefined;
    if (taskLocation === "Custom" && !location_detail) {
      setError("Enter a custom place of assistance.");
      return;
    }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteer_id: selectedVolunteer,
        command,
        location_tag,
        location_detail,
        priority: taskPriority,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Task failed");
      return;
    }
    setCommand("");
    pinToBottom();
    await load();
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!planTitle.trim()) {
      setError("Plan title required.");
      return;
    }
    const res = await fetch("/api/ops/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: planTitle.trim(),
        description: planDesc.trim(),
        location_tag: planLocation,
        location_detail:
          planLocation === "Custom" ? planLocationCustom.trim() : undefined,
        priority: planPriority,
        time_window: planWindow.trim() || undefined,
        volunteer_ids: planVolunteers,
        push_tasks: planVolunteers.length > 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Plan create failed");
      return;
    }
    setPlanTitle("");
    setPlanDesc("");
    setPlanVolunteers([]);
    pinToBottom();
    await load();
  }

  async function setPlanStatus(planId: string, status: string) {
    setError("");
    const res = await fetch("/api/ops/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    await load();
  }

  function togglePlanVolunteer(id: string) {
    setPlanVolunteers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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
      <div
        className="min-h-screen grid place-items-center text-[var(--muted)]"
        role="status"
        aria-live="polite"
      >
        {t("en", "ops.init")}
      </div>
    );
  }

  return (
    <div className="min-h-screen" lang={lang}>
      <a href="#ops-main" className="skip-link">
        {t(lang, "ops.skipToMain")}
      </a>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#0b1220f2] backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold tracking-wide text-base">
            {t(lang, "ops.title")}
          </h1>
          <div className="text-xs text-[var(--muted)]">
            {session.name} · {t(lang, "ops.tenancy")} {session.stadium_id} ·{" "}
            {t(lang, "ops.langLabel")} {lang}
          </div>
        </div>
        <nav
          className="flex items-center gap-2 flex-wrap"
          aria-label={t(lang, "ops.navLabel")}
        >
          <span className="badge badge-d">
            {t(lang, "ops.catD")}: {openCriticalIncidents.length}
          </span>
          <span className="badge badge-pending">
            {t(lang, "ops.pending")}: {pending.length}
          </span>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5 bg-[var(--panel)]">
            <span className="btn btn-primary text-xs py-1.5 px-2.5 cursor-default" aria-current="page">
              {t(lang, "ops.navCritical")}
            </span>
            <Link href="/ops/timeline" className="btn text-xs py-1.5 px-2.5">
              {t(lang, "ops.navTimeline")}
            </Link>
          </div>
          <Link href="/profile" className="btn text-sm py-1.5">
            {t(lang, "common.profile")}
          </Link>
          <button type="button" className="btn text-sm py-1.5" onClick={logout}>
            {t(lang, "common.logout")}
          </button>
        </nav>
      </header>

      <main id="ops-main" className="max-w-7xl mx-auto px-4 pt-4 scroll-mt-20">
        {/* Operations Planning */}
        <section className="card p-4 mb-4 border-blue-900/50" aria-labelledby="ops-plan-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 id="ops-plan-heading" className="text-sm font-semibold tracking-wide">
                {t(lang, "ops.planningBoard")}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {t(lang, "ops.planningHint")}
              </p>
            </div>
            <span className="badge badge-a">
              {plans.filter((p) => p.status !== "completed" && p.status !== "cancelled").length}{" "}
              {t(lang, "ops.activePlans")}
            </span>
          </div>

          <form
            onSubmit={createPlan}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
          >
            <div className="lg:col-span-1">
              <label className="label" htmlFor="ops-plan-title">
                {t(lang, "ops.planTitle")}
              </label>
              <input
                id="ops-plan-title"
                className="input"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder={t(lang, "ops.planTitlePh")}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="ops-plan-loc">
                {t(lang, "ops.placeOfAssist")}
              </label>
              <select
                id="ops-plan-loc"
                className="input"
                value={planLocation}
                onChange={(e) => setPlanLocation(e.target.value)}
              >
                {ASSISTANCE_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    [{loc.group}] {loc.label}
                  </option>
                ))}
              </select>
              {planLocation === "Custom" && (
                <input
                  className="input mt-2"
                  value={planLocationCustom}
                  onChange={(e) => setPlanLocationCustom(e.target.value)}
                  placeholder={t(lang, "ops.customPlace")}
                />
              )}
            </div>
            <div>
              <label className="label" htmlFor="ops-plan-pri">
                {t(lang, "ops.priority")}
              </label>
              <select
                id="ops-plan-pri"
                className="input"
                value={planPriority}
                onChange={(e) => setPlanPriority(e.target.value)}
              >
                {PLAN_PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ops-plan-window">
                {t(lang, "ops.timeWindow")}
              </label>
              <input
                id="ops-plan-window"
                className="input"
                value={planWindow}
                onChange={(e) => setPlanWindow(e.target.value)}
                placeholder="T-60 to kickoff"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <label className="label" htmlFor="ops-plan-desc">
                {t(lang, "ops.planDesc")}
              </label>
              <input
                id="ops-plan-desc"
                className="input"
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder={t(lang, "ops.planDescPh")}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <label className="label" id="ops-assign-label">
                {t(lang, "ops.assignVolunteers")}
              </label>
              <div
                className="flex flex-wrap gap-2 max-h-24 overflow-y-auto rounded-lg border border-[var(--border)] p-2 bg-[#0d1526]"
                role="group"
                aria-labelledby="ops-assign-label"
              >
                {approved.length === 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    {t(lang, "ops.noApprovedVols")}
                  </span>
                )}
                {approved.map((u) => (
                  <label
                    key={u.id}
                    className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${
                      planVolunteers.includes(u.id)
                        ? "border-blue-500 bg-blue-950/50"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={planVolunteers.includes(u.id)}
                      onChange={() => togglePlanVolunteer(u.id)}
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <button type="submit" className="btn btn-primary text-sm">
                {t(lang, "ops.createPlan")}
              </button>
            </div>
          </form>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.length === 0 && (
              <p className="text-sm text-[var(--muted)] col-span-full">
                {t(lang, "ops.noPlans")}
              </p>
            )}
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-3 ${
                  p.priority === "critical"
                    ? "border-red-700 bg-red-950/20"
                    : p.priority === "high"
                      ? "border-amber-700 bg-amber-950/15"
                      : "border-[var(--border)] bg-[#0d1526]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`badge ${
                      p.priority === "critical"
                        ? "badge-d"
                        : p.priority === "high"
                          ? "badge-c"
                          : "badge-a"
                    }`}
                  >
                    {p.priority}
                  </span>
                  <span className="badge badge-ok text-[10px]">{p.status}</span>
                </div>
                <div className="font-semibold text-sm">{p.title}</div>
                <div className="text-xs text-emerald-300 mt-1">
                  📍 {p.location_tag}
                  {p.location_detail ? ` — ${p.location_detail}` : ""}
                </div>
                {p.time_window && (
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    ⏱ {p.time_window}
                  </div>
                )}
                {p.description && (
                  <p className="text-xs text-[var(--muted)] mt-2 line-clamp-3">
                    {p.description}
                  </p>
                )}
                <div className="text-[11px] text-[var(--muted)] mt-2">
                  {t(lang, "ops.staffed")}:{" "}
                  {p.assigned_volunteer_ids.length
                    ? p.assigned_volunteer_ids
                        .map(
                          (id) =>
                            users.find((u) => u.id === id)?.name || id.slice(0, 8)
                        )
                        .join(", ")
                    : t(lang, "ops.unassigned")}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {PLAN_STATUSES.filter((s) => s.id !== p.status).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="btn text-[10px] py-1 px-2"
                      onClick={() => setPlanStatus(p.id, s.id)}
                    >
                      → {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-4 pb-4">
        <aside className="lg:col-span-3 space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-semibold mb-3">
              {t(lang, "ops.pendingApprovals")}
            </h2>
            {pending.length === 0 && (
              <p className="text-xs text-[var(--muted)]">
                {t(lang, "ops.noPending")}
              </p>
            )}
            <div className="space-y-2">
              {pending.map((u) => (
                <div
                  key={u.id}
                  className="rounded-lg border border-[var(--border)] p-2"
                >
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--muted)] mb-2">
                    {t(lang, "ops.langLabel")}: {u.preferred_language}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-success text-xs py-1 px-2"
                      onClick={() => approve(u.id, "approve")}
                    >
                      {t(lang, "ops.approve")}
                    </button>
                    <button
                      className="btn btn-danger text-xs py-1 px-2"
                      onClick={() => approve(u.id, "reject")}
                    >
                      {t(lang, "ops.reject")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-semibold mb-3">
              {t(lang, "ops.assignTask")}
            </h2>
            <form onSubmit={assignTask} className="space-y-2">
              <select
                className="input"
                value={selectedVolunteer}
                onChange={(e) => setSelectedVolunteer(e.target.value)}
              >
                <option value="">{t(lang, "ops.selectVolunteer")}</option>
                {approved.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.preferred_language})
                  </option>
                ))}
              </select>
              <label className="label">{t(lang, "ops.placeOfAssist")}</label>
              <select
                className="input"
                value={taskLocation}
                onChange={(e) => setTaskLocation(e.target.value)}
                required
              >
                {ASSISTANCE_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    [{loc.group}] {loc.label}
                  </option>
                ))}
              </select>
              {taskLocation === "Custom" && (
                <input
                  className="input"
                  value={taskLocationCustom}
                  onChange={(e) => setTaskLocationCustom(e.target.value)}
                  placeholder={t(lang, "ops.customPlace")}
                  required
                />
              )}
              <label className="label">{t(lang, "ops.priority")}</label>
              <select
                className="input"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                {PLAN_PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <textarea
                className="input min-h-[80px]"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={t(lang, "ops.commandPlaceholder")}
              />
              <button className="btn btn-primary w-full text-sm">
                {t(lang, "ops.pushTask")}
              </button>
            </form>
          </section>
        </aside>

        {/* Category D only — full feed is on /ops/timeline */}
        <section className="lg:col-span-5 card p-4 flex flex-col min-h-[70vh] border-red-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold">
                {t(lang, "ops.criticalFeed")}
              </h2>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                {t(lang, "ops.criticalFeedHint")}
              </p>
            </div>
            <Link href="/ops/timeline" className="btn text-xs py-1.5">
              {t(lang, "ops.openFullTimeline")} →
            </Link>
          </div>
          {error && (
            <div
              className="mb-2 text-sm text-red-300"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <div
            ref={containerRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-label={t(lang, "ops.feedLabel")}
            className="flex-1 overflow-y-auto chat-scroll space-y-3 pr-1"
          >
            {criticalMessages.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center mt-8">
                {t(lang, "ops.noCritical")}
              </p>
            )}
            {criticalMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  m.ui_component === "serious_alert" || m.audio_alert
                    ? "border-red-600 bg-red-950/30 pulse-critical"
                    : "border-red-800/50 bg-[#0d1526]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-[var(--muted)]">
                    {m.sender_name} · {m.sender_role}
                  </span>
                  <span className="badge badge-d">Cat D</span>
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
            {t(lang, "ops.criticalConsole")}
          </h2>
          {openCriticalIncidents.length === 0 && (
            <div className="card p-4 text-sm text-[var(--muted)]">
              {t(lang, "ops.noCriticalIncidents")}
            </div>
          )}
          {openCriticalIncidents.map((inc) => {
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
                className="card p-4 border-red-700 pulse-critical"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="badge badge-d">
                    {t(lang, "ops.serious")} · Cat D
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
                      resolve(
                        inc.id,
                        undefined,
                        customByIncident[inc.id]
                      )
                    }
                  >
                    {t(lang, "ops.blast")}
                  </button>
                </div>
              </div>
            );
          })}

          {closedCritical.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-[var(--muted)] mb-2">
                {t(lang, "ops.closed")} (Cat D)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {closedCritical.slice(0, 8).map((i) => (
                  <div
                    key={i.id}
                    className="text-xs border-b border-[var(--border)] pb-2"
                  >
                    <span className="badge badge-ok mr-1">
                      {statusLabel(lang, i.status)}
                    </span>
                    {i.reporter_name}: {i.text.slice(0, 80)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
        </div>
      </main>
    </div>
  );
}

function playCriticalBeep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.frequency.value = 660;
    }, 150);
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 400);
  } catch {
    /* audio blocked until user gesture */
  }
}
