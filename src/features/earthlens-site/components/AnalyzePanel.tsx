"use client";

import { CloudRain, Fish, Leaf, Loader2, Search, Trees } from "lucide-react";
import type { Region } from "@/features/earthlens-chat/regions";
import type { Lang } from "@/features/earthlens-chat/types";
import type { SiteParam } from "../types";
import type { SiteStrings } from "../strings";

export interface PanelState {
  params: SiteParam[];
  latest: boolean;
  start: string;
  end: string;
}

interface Props {
  t: SiteStrings;
  lang: Lang;
  regions: Region[];
  region: Region;
  onRegion: (id: string) => void;
  state: PanelState;
  onChange: (s: PanelState) => void;
  onAnalyze: () => void;
  busy: boolean;
  error: string | null;
  firmsReady: boolean;
}

type Item = { key: SiteParam | null; label: keyof SiteStrings; soon?: boolean };

// Same three groups as the EarthLens demo dashboard.
const GROUPS: { id: "agriculture" | "fishing" | "environment"; icon: typeof Leaf; items: Item[] }[] = [
  { id: "agriculture", icon: Leaf, items: [{ key: "rainfall", label: "pRainfall" }, { key: "temperature", label: "pTemperature" }, { key: "humidity", label: "pHumidity" }, { key: "wind", label: "pWind" }, { key: "soilWetness", label: "pSoil" }, { key: null, label: "pSmap", soon: true }] },
  { id: "fishing", icon: Fish, items: [{ key: "rainfall", label: "pRainfall" }, { key: "wind", label: "pWind" }] },
  { id: "environment", icon: Trees, items: [{ key: "soilWetness", label: "pSoil" }, { key: "fires", label: "pFires" }, { key: null, label: "pFlood", soon: true }] },
];

const today = () => new Date().toISOString().slice(0, 10);

export function AnalyzePanel({ t, lang, regions, region, onRegion, state, onChange, onAnalyze, busy, error, firmsReady }: Props) {
  const toggle = (k: SiteParam) =>
    onChange({ ...state, params: state.params.includes(k) ? state.params.filter((p) => p !== k) : [...state.params, k] });

  return (
    <section id="dashboard" className="card grid gap-6 p-5 lg:grid-cols-[1fr_2fr_1fr]">
      <div>
        <p className="label">{t.regionData}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">{lang === "my" ? region.nameMy : region.name}</h2>
        <p className="text-xs text-slate-400">
          {region.type} · {region.lat.toFixed(2)}°N {region.lon.toFixed(2)}°E{region.coastal ? ` · ${t.coastal}` : ""}
        </p>
        <label className="mt-4 block">
          <span className="label">{t.selectRegion}</span>
          <select value={region.id} onChange={(e) => onRegion(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-abyss-950/60 px-3 py-2 text-sm text-white">
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{lang === "my" ? r.nameMy : `${r.name} ${r.type}`}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="label">{t.chooseData}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.id} className="rounded-xl border border-white/5 bg-abyss-950/40 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><g.icon className="h-4 w-4 text-leaf-300" />{t[g.id]}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => {
                  const needsKey = it.key === "fires" && !firmsReady;
                  const disabled = it.soon || !it.key;
                  const on = it.key ? state.params.includes(it.key) : false;
                  return (
                    <button
                      key={it.label}
                      type="button"
                      disabled={disabled}
                      aria-pressed={on}
                      onClick={() => it.key && toggle(it.key)}
                      className={`chip transition ${disabled ? "cursor-not-allowed border-white/5 text-slate-500" : on ? "border-ocean-400/60 bg-ocean-500/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                    >
                      {t[it.label]}
                      {it.soon && <span className="text-slate-500">· {t.comingSoon}</span>}
                      {needsKey && <span className="text-amber-300/80">· {t.needsKey}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label">{t.dateRange}</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={state.latest} onChange={(e) => onChange({ ...state, latest: e.target.checked })} className="h-4 w-4 accent-ocean-500" />
          {t.latest7}
        </label>
        {!state.latest && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <label>{t.from}<input type="date" max={today()} min="1981-01-01" value={state.start} onChange={(e) => onChange({ ...state, start: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/60 px-2 py-1.5 text-sm text-white" /></label>
            <label>{t.to}<input type="date" max={today()} min="1981-01-01" value={state.end} onChange={(e) => onChange({ ...state, end: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/60 px-2 py-1.5 text-sm text-white" /></label>
          </div>
        )}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-leaf-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? t.analyzing : t.analyze}
        </button>
        {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-ember-500/30 bg-ember-500/10 p-2 text-xs text-ember-400"><CloudRain className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    </section>
  );
}
