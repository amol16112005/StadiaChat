"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import Link from "next/link";
import { statusLabel, t } from "@/lib/i18n";

type Profile = {
  id: string;
  name: string;
  preferred_language: string;
  stadium_id: string;
  role: string;
  status: string;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stadium, setStadium] = useState<{
    id: string;
    name: string;
    city: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.status === 401) {
      router.replace("/");
      return;
    }
    const data = await res.json();
    setProfile(data.user);
    setStadium(data.stadium);
    setName(data.user.name);
    setLanguage(data.user.preferred_language || "en");
    if (data.user.preferred_language) {
      try {
        localStorage.setItem("stadia_lang", data.user.preferred_language);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = data.user.preferred_language;
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, preferred_language: language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t(language, "profile.saveFailed"));
      setProfile(data.user);
      setStadium(data.stadium);
      setLanguage(data.user.preferred_language);
      try {
        localStorage.setItem("stadia_lang", data.user.preferred_language);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = data.user.preferred_language;
      setMessage(t(data.user.preferred_language, "common.saved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(language, "profile.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-[var(--muted)]">
        {t("en", "common.loadingProfile")}
      </div>
    );
  }

  const lang = language || profile.preferred_language || "en";
  const homeHref =
    profile.role === "Operations_Lead" ? "/ops" : "/volunteer";

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-8" lang={lang}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t(lang, "profile.title")}</h1>
          <p className="text-sm text-[var(--muted)]">
            {t(lang, "profile.subtitle")}
          </p>
        </div>
        <Link href={homeHref} className="btn text-sm py-1.5">
          {t(lang, "common.back")}
        </Link>
      </div>

      <div className="card p-5 mb-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">{t(lang, "common.role")}</span>
          <span className="font-medium">{profile.role}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">{t(lang, "common.status")}</span>
          <span
            className={`badge ${profile.status === "approved" ? "badge-ok" : "badge-pending"}`}
          >
            {statusLabel(lang, profile.status)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">{t(lang, "common.stadium")}</span>
          <span className="font-medium text-right">
            {stadium?.name || profile.stadium_id}
            {stadium?.city ? ` · ${stadium.city}` : ""}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">
            {t(lang, "common.stadiumId")}
          </span>
          <code className="text-blue-200 text-xs">{profile.stadium_id}</code>
        </div>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        {error && (
          <div
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <div>
          <label className="label" htmlFor="profile-name">
            {t(lang, "common.displayName")}
          </label>
          <input
            id="profile-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="profile-lang">
            {t(lang, "common.preferredLanguage")}
          </label>
          <select
            id="profile-lang"
            className="input"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              // Live preview of UI language while editing
              document.documentElement.lang = e.target.value;
            }}
          >
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--muted)] mt-1.5">
            {t(lang, "common.languageHint")}
          </p>
        </div>

        <button className="btn btn-primary w-full" disabled={saving}>
          {saving ? t(lang, "common.saving") : t(lang, "common.save")}
        </button>
      </form>

      <button
        type="button"
        className="btn w-full mt-4 text-sm"
        onClick={logout}
      >
        {t(lang, "common.logout")}
      </button>
    </div>
  );
}
