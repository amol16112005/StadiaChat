"use client";

import { FormField } from "@/components/FormField";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { t } from "@/lib/i18n";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300/90">
      {children}
    </div>
  );
}

export function DemoHint({
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

export function LanguageSelect({
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

export type StadiumOption = { id: string; name: string; city: string };

export function StadiumSelect({
  stadiums,
  value,
  onChange,
  lang = "en",
}: {
  stadiums: StadiumOption[];
  value: string;
  onChange: (v: string) => void;
  lang?: string;
}) {
  return (
    <div>
      <FormField label={t(lang, "home.stadiumLive")}>
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
      </FormField>
      <p className="text-[10px] text-[var(--muted)] mt-1">
        {t(lang, "home.pinsDoc")}
      </p>
    </div>
  );
}
