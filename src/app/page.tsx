"use client";

import {
  useEffect,
  useId,
  useState,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { t } from "@/lib/i18n";

type Stadium = { id: string; name: string; city: string };
type Tab = "volunteer" | "register" | "ops";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("volunteer");
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [faqAudience, setFaqAudience] = useState<"judges" | "devs">("judges");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [stadiumId, setStadiumId] = useState("metlife_2026");
  const [pin, setPin] = useState("");
  const [credential, setCredential] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stadia_lang");
      if (saved) setLanguage(saved);
    } catch {
      /* ignore */
    }

    fetch("/api/stadiums")
      .then((r) => r.json())
      .then((d) => setStadiums(d.stadiums || []))
      .catch(() => setStadiums([]));

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) return;
        if (d.user.user_role === "Operations_Lead") router.replace("/ops");
        else router.replace("/volunteer");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  function setLang(v: string) {
    setLanguage(v);
    try {
      localStorage.setItem("stadia_lang", v);
    } catch {
      /* ignore */
    }
  }

  async function onVolunteerLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "volunteer",
          name,
          stadium_id: stadiumId,
          stadium_pin: pin,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/volunteer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          language,
          stadium_id: stadiumId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setInfo(data.message);
      setTimeout(() => router.push("/volunteer"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function onOpsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ops",
          stadium_id: stadiumId,
          credential,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");
      router.push("/ops");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoVolunteer() {
    setTab("volunteer");
    setName("Alex Rivera");
    setStadiumId("metlife_2026");
    setPin("WC26-MET");
    setError("");
    setInfo("");
  }

  function fillDemoOps() {
    setTab("ops");
    setStadiumId("metlife_2026");
    setCredential("ops_metlife_2026");
    setError("");
    setInfo("");
  }

  const judgeFaqs = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(language, `home.jq${n}`),
    a: t(language, `home.ja${n}`),
  }));
  const devFaqs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    q: t(language, `home.dq${n}`),
    a: t(language, `home.da${n}`),
  }));
  const faqs = faqAudience === "judges" ? judgeFaqs : devFaqs;

  const features = [1, 2, 3, 4].map((n) => ({
    title: t(language, `home.feat${n}Title`),
    body: t(language, `home.feat${n}Body`),
  }));

  const cats = [
    { cat: "A", title: t(language, "home.catATitle"), desc: t(language, "home.catADesc"), cls: "badge-a" },
    { cat: "B", title: t(language, "home.catBTitle"), desc: t(language, "home.catBDesc"), cls: "badge-b" },
    { cat: "C", title: t(language, "home.catCTitle"), desc: t(language, "home.catCDesc"), cls: "badge-c" },
    { cat: "D", title: t(language, "home.catDTitle"), desc: t(language, "home.catDDesc"), cls: "badge-d" },
  ];

  return (
    <main className="min-h-screen" lang={language} id="main">
      <a href="#access" className="skip-link">
        {t(language, "home.skipToAccess")}
      </a>
      <header className="border-b border-[var(--border)] bg-[#0b1220cc] backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 grid place-items-center font-bold text-sm shadow-lg shadow-blue-900/40"
              aria-hidden
            >
              SC
            </div>
            <div>
              <div className="font-semibold tracking-tight">StadiaChat</div>
              <div className="text-[11px] text-[var(--muted)]">
                {t(language, "home.tagline")}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              className="input py-1.5 text-xs w-auto min-w-[9rem]"
              value={language}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t(language, "home.preferredLanguage")}
            >
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
            <a href="#about" className="btn py-1.5 px-3 text-xs">
              {t(language, "home.navAbout")}
            </a>
            <a href="#features" className="btn py-1.5 px-3 text-xs">
              {t(language, "home.navFeatures")}
            </a>
            <a href="#faqs" className="btn py-1.5 px-3 text-xs">
              {t(language, "home.navFaqs")}
            </a>
            <a href="#access" className="btn btn-primary py-1.5 px-3 text-xs">
              {t(language, "home.navEnter")}
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(800px 400px at 80% 0%, rgba(61,139,253,0.35), transparent 60%), radial-gradient(600px 300px at 10% 80%, rgba(34,197,94,0.18), transparent 55%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t(language, "home.badge")}
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
                {t(language, "home.hero1")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  {t(language, "home.heroHighlight")}
                </span>{" "}
                {t(language, "home.hero2")}
              </h1>
              <p className="mt-5 text-[var(--muted)] text-base md:text-lg max-w-xl leading-relaxed">
                {t(language, "home.heroBody")}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#access" className="btn btn-primary">
                  {t(language, "home.openAccess")}
                </a>
                <button type="button" className="btn" onClick={fillDemoVolunteer}>
                  {t(language, "home.fillVol")}
                </button>
                <button type="button" className="btn" onClick={fillDemoOps}>
                  {t(language, "home.fillOps")}
                </button>
              </div>

              <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["A–D", t(language, "home.statRoute")],
                  ["300s", t(language, "home.statSafety")],
                  ["1 Lead", t(language, "home.statLead")],
                  ["Voice", t(language, "home.statVoice")],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="card px-3 py-3 border-blue-900/40 text-center"
                  >
                    <dt className="text-lg font-semibold text-blue-300">{k}</dt>
                    <dd className="text-[11px] text-[var(--muted)] mt-0.5">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div id="access" className="lg:col-span-5 scroll-mt-24">
              <div className="card p-1 shadow-2xl shadow-black/40 border-blue-900/40">
                <div className="px-4 pt-4 pb-2">
                  <h2 className="font-semibold">
                    {t(language, "home.secureAccess")}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {t(language, "home.sessionBound")}
                  </p>
                </div>
                <div
                  className="grid grid-cols-3 gap-1 px-2 mb-2"
                  role="tablist"
                  aria-label={t(language, "home.secureAccess")}
                >
                  {(
                    [
                      ["volunteer", "home.volunteer"],
                      ["register", "home.register"],
                      ["ops", "home.opsLead"],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`access-tab-${key}`}
                      aria-selected={tab === key}
                      aria-controls={`access-panel-${key}`}
                      className={`btn text-xs py-2 ${tab === key ? "btn-primary" : ""}`}
                      onClick={() => {
                        setTab(key);
                        setError("");
                        setInfo("");
                      }}
                    >
                      {t(language, labelKey)}
                    </button>
                  ))}
                </div>

                <div className="p-4 pt-2">
                  {error && (
                    <div
                      className="mb-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
                      role="alert"
                      aria-live="assertive"
                    >
                      {error}
                    </div>
                  )}
                  {info && (
                    <div
                      className="mb-3 rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
                      role="status"
                      aria-live="polite"
                    >
                      {info}
                    </div>
                  )}

                  {tab === "volunteer" && (
                    <form
                      onSubmit={onVolunteerLogin}
                      className="space-y-3"
                      role="tabpanel"
                      id="access-panel-volunteer"
                      aria-labelledby="access-tab-volunteer"
                    >
                      <Field label={t(language, "home.preferredLanguage")}>
                        <LanguageSelect value={language} onChange={setLang} />
                      </Field>
                      <Field label={t(language, "common.name")}>
                        <input
                          className="input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Rivera"
                          autoComplete="name"
                          required
                        />
                      </Field>
                      <StadiumSelect
                        stadiums={stadiums}
                        value={stadiumId}
                        onChange={setStadiumId}
                        lang={language}
                      />
                      <Field label={t(language, "home.stadiumPin")}>
                        <input
                          className="input"
                          type="password"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="WC26-MET"
                          autoComplete="current-password"
                          required
                        />
                      </Field>
                      <button
                        className="btn btn-primary w-full"
                        disabled={loading}
                      >
                        {loading
                          ? t(language, "home.authenticating")
                          : t(language, "home.enterVolunteer")}
                      </button>
                      <DemoHint lang={language}>
                        {t(language, "home.demoVolHint")}
                      </DemoHint>
                    </form>
                  )}

                  {tab === "register" && (
                    <form
                      onSubmit={onRegister}
                      className="space-y-3"
                      role="tabpanel"
                      id="access-panel-register"
                      aria-labelledby="access-tab-register"
                    >
                      <Field label={t(language, "home.preferredLanguage")}>
                        <LanguageSelect value={language} onChange={setLang} />
                      </Field>
                      <Field label={t(language, "common.name")}>
                        <input
                          className="input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </Field>
                      <StadiumSelect
                        stadiums={stadiums}
                        value={stadiumId}
                        onChange={setStadiumId}
                        lang={language}
                      />
                      <p className="text-[11px] text-emerald-300/90 leading-relaxed rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2">
                        {t(language, "home.regNoPin")}
                      </p>
                      <button
                        className="btn btn-primary w-full"
                        disabled={loading}
                      >
                        {loading
                          ? t(language, "home.submitting")
                          : t(language, "home.submitReg")}
                      </button>
                      <DemoHint lang={language}>
                        {t(language, "home.demoRegHint")}
                      </DemoHint>
                    </form>
                  )}

                  {tab === "ops" && (
                    <form
                      onSubmit={onOpsLogin}
                      className="space-y-3"
                      role="tabpanel"
                      id="access-panel-ops"
                      aria-labelledby="access-tab-ops"
                    >
                      <Field label={t(language, "home.preferredLanguage")}>
                        <LanguageSelect value={language} onChange={setLang} />
                      </Field>
                      <StadiumSelect
                        stadiums={stadiums}
                        value={stadiumId}
                        onChange={setStadiumId}
                        lang={language}
                      />
                      <Field label={t(language, "home.masterCred")}>
                        <input
                          className="input"
                          type="password"
                          value={credential}
                          onChange={(e) => setCredential(e.target.value)}
                          placeholder="ops_metlife_2026"
                          autoComplete="current-password"
                          required
                        />
                      </Field>
                      <button
                        className="btn btn-primary w-full"
                        disabled={loading}
                      >
                        {loading
                          ? t(language, "home.opening")
                          : t(language, "home.openTerminal")}
                      </button>
                      <DemoHint lang={language}>
                        {t(language, "home.demoOpsHint")}
                      </DemoHint>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <SectionLabel>{t(language, "home.aboutLabel")}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2 max-w-2xl">
            {t(language, "home.aboutTitle")}
          </h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-semibold text-emerald-300 mb-2">
                {t(language, "home.purpose")}
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {t(language, "home.purposeBody")}
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-amber-200 mb-2">
                {t(language, "home.problemTitle")}
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {t(language, "home.problemBody")}
              </p>
            </div>
            <div className="card p-6 md:col-span-2 border-emerald-900/40">
              <h3 className="font-semibold text-emerald-200 mb-2">
                {t(language, "home.whyBestTitle")}
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {t(language, "home.whyBestBody")}
              </p>
            </div>
            <div className="card p-6 md:col-span-2">
              <h3 className="font-semibold text-sky-200 mb-3">
                {t(language, "home.criteriaTitle")}
              </h3>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-[var(--muted)]">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <li
                    key={n}
                    className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2.5 leading-relaxed"
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide text-blue-300/90 mb-1">
                      {t(language, `home.criteria${n}Label`)}
                    </span>
                    {t(language, `home.criteria${n}Body`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-blue-300 mb-2">
                {t(language, "home.notTitle")}
              </h3>
              <ul className="text-sm text-[var(--muted)] space-y-2 leading-relaxed list-disc pl-4">
                <li>{t(language, "home.not1")}</li>
                <li>{t(language, "home.not2")}</li>
                <li>{t(language, "home.not3")}</li>
                <li>{t(language, "home.not4")}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 card p-6">
            <h3 className="font-semibold mb-3">{t(language, "home.howLabel")}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cats.map((c) => (
                <div
                  key={c.cat}
                  className="rounded-xl border border-[var(--border)] bg-[#0d1526] p-4"
                >
                  <span className={`badge ${c.cls}`}>Cat {c.cat}</span>
                  <div className="font-medium mt-2 text-sm">{c.title}</div>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-20 border-t border-[var(--border)] bg-[#0a101c]"
      >
        <div className="max-w-6xl mx-auto px-4 py-14">
          <SectionLabel>{t(language, "home.featuresLabel")}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
            {t(language, "home.featuresTitle")}
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="scroll-mt-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <SectionLabel>{t(language, "home.faqLabel")}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
            {t(language, "home.faqTitle")}
          </h2>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">
            {t(language, "home.faqIntro")}
          </p>

          <div className="mt-6 inline-flex rounded-xl border border-[var(--border)] p-1 bg-[var(--panel)]">
            <button
              type="button"
              className={`btn text-sm py-2 px-4 ${faqAudience === "judges" ? "btn-primary" : ""}`}
              onClick={() => {
                setFaqAudience("judges");
                setOpenFaq(0);
              }}
            >
              {t(language, "home.forJudges")}
            </button>
            <button
              type="button"
              className={`btn text-sm py-2 px-4 ${faqAudience === "devs" ? "btn-primary" : ""}`}
              onClick={() => {
                setFaqAudience("devs");
                setOpenFaq(0);
              }}
            >
              {t(language, "home.forDevs")}
            </button>
          </div>

          <div className="mt-6 space-y-2 max-w-3xl">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              const panelId = `faq-panel-${faqAudience}-${i}`;
              const btnId = `faq-btn-${faqAudience}-${i}`;
              return (
                <div key={`${faqAudience}-${i}`} className="card overflow-hidden">
                  <button
                    type="button"
                    id={btnId}
                    className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-white/[0.02]"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={panelId}
                  >
                    <span className="font-medium text-sm md:text-base">
                      {item.q}
                    </span>
                    <span
                      className="text-[var(--muted)] shrink-0 text-lg leading-none mt-0.5"
                      aria-hidden
                    >
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      className="px-4 pb-4 text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3"
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-emerald-900/40">
            <div>
              <div className="font-semibold">{t(language, "home.readyTitle")}</div>
              <p className="text-sm text-[var(--muted)] mt-1">
                {t(language, "home.readyBody")}
              </p>
            </div>
            <a href="#access" className="btn btn-primary shrink-0">
              {t(language, "home.goAccess")}
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--muted)]">
        {t(language, "home.footer")}
      </footer>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300/90">
      {children}
    </div>
  );
}

function DemoHint({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: string;
}) {
  return (
    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
      {t(lang, "home.demo")}:{" "}
      <code className="text-blue-200/90">{children}</code>
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const autoId = useId();
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: (children as ReactElement<{ id?: string }>).props.id || autoId,
      })
    : children;
  const controlId =
    (isValidElement(children) &&
      (children as ReactElement<{ id?: string }>).props.id) ||
    autoId;

  return (
    <div>
      <label className="label" htmlFor={controlId}>
        {label}
      </label>
      {child}
    </div>
  );
}

function LanguageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function StadiumSelect({
  stadiums,
  value,
  onChange,
  lang = "en",
}: {
  stadiums: Stadium[];
  value: string;
  onChange: (v: string) => void;
  lang?: string;
}) {
  return (
    <div>
      <Field label={t(lang, "home.stadiumLive")}>
        <select
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {(stadiums.length
            ? stadiums
            : [
                {
                  id: "metlife_2026",
                  name: "MetLife Stadium",
                  city: "East Rutherford",
                },
              ]
          ).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.city} ({s.id})
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[10px] text-[var(--muted)] mt-1">
        {t(lang, "home.pinsDoc")}
      </p>
    </div>
  );
}
