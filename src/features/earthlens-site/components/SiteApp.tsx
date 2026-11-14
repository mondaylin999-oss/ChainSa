"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Globe2, Info, Languages, Map as MapIcon, MousePointerClick, Satellite, BarChart3 } from "lucide-react";
import { ChatWidget, REGIONS, getRegion, type Lang } from "@/features/earthlens-chat";
import { SITE_STRINGS } from "../strings";
import type { AnalyzeResult, SiteStatus } from "../types";
import { AnalyzePanel, type PanelState } from "./AnalyzePanel";
import { Results } from "./Results";

const RegionMap = dynamic(() => import("./RegionMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-abyss-900/40" /> });

const LANG_KEY = "earthlens-lang";
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const EXPLORE = [
  { name: "NASA POWER", url: "https://power.larc.nasa.gov/" },
  { name: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/" },
  { name: "NASA GPM IMERG", url: "https://gpm.nasa.gov/data/imerg" },
  { name: "NASA Worldview", url: "https://worldview.earthdata.nasa.gov/" },
  { name: "Earthdata Search", url: "https://search.earthdata.nasa.gov/" },
];

/** The Myanmar EarthLens website, rebuilt from the compiled demo as Next.js + TypeScript source. */
export function SiteApp() {
  const [lang, setLangState] = useState<Lang>("en");
  const t = SITE_STRINGS[lang];
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [mapError, setMapError] = useState(false);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>({ params: ["rainfall", "temperature", "humidity"], latest: true, start: daysAgo(20), end: daysAgo(7) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "my") setLangState(saved);
    } catch {
      /* storage unavailable */
    }
    fetch("/api/regions").then((r) => r.json()).then((d) => setBoundaries(d.boundaries)).catch(() => setMapError(true));
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const region = getRegion(selectedId ?? undefined);

  const runAnalyze = useCallback(async () => {
    if (!selectedId) return;
    if (!panel.params.length) return setError(lang === "my" ? "အချက်အလက် အနည်းဆုံး တစ်ခု ရွေးပါ။" : "Select at least one parameter.");
    if (!panel.latest && (!panel.start || !panel.end)) return setError(lang === "my" ? "ရက်စွဲနှစ်ခုလုံး ရွေးပါ။" : "Choose both dates, or use the most recent 7 days.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: selectedId, params: panel.params, lang, mode: "live", ...(panel.latest ? {} : { range: { start: panel.start, end: panel.end } }) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.requestFailed);
      setResult(data as AnalyzeResult);
      requestAnimationFrame(() => document.getElementById("insights")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message || t.requestFailed);
    } finally {
      setBusy(false);
    }
  }, [lang, panel, selectedId, t.requestFailed]);

  const select = (id: string) => {
    setSelectedId(id);
    setResult(null);
    setError(null);
  };

  const coastalCount = REGIONS.filter((r) => r.coastal).length;

  return (
    <div className={lang === "my" ? "font-mm" : ""}>
      <header className="sticky top-0 z-[1500] border-b border-white/5 bg-abyss-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button onClick={() => select("")} className="flex items-center gap-2.5 text-left" aria-label={t.brand}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ocean-500 to-leaf-500 text-white"><Globe2 className="h-5 w-5" /></span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-semibold text-white">{t.brand}</span>
              <span className="block text-[9px] tracking-[0.2em] text-slate-400">{t.brandSub}</span>
            </span>
          </button>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#top" className="hover:text-white">{t.navDashboard}</a>
            <a href="#map" className="hover:text-white">{t.navMap}</a>
            <a href="#insights" className="hover:text-white">{t.navInsights}</a>
            <a href="#about" className="hover:text-white">{t.navAbout}</a>
          </nav>
          <span className="chip ml-auto hidden border-leaf-400/30 text-leaf-300 sm:inline-flex md:ml-0">{t.modeLive}</span>
          <button
            onClick={() => setLang(lang === "en" ? "my" : "en")}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/5"
            aria-label={lang === "en" ? "Switch to Myanmar" : "Switch to English"}
          >
            <Languages className="h-4 w-4" />
            {lang === "en" ? "မြန်မာ" : "English"}
          </button>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className={`grid gap-6 ${region ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"}`}>
          {!region && (
            <div className="space-y-4">
              <div className="card p-6">
                <span className="chip border-ocean-400/30 text-ocean-300"><Satellite className="h-3 w-3" />{t.heroKicker}</span>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">{t.heroTitle}</h1>
                <p className="mt-3 text-sm text-slate-300">{t.heroBody}</p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[[REGIONS.length, t.statRegions], [coastalCount, t.statCoastal], [3, t.statServices]].map(([n, l]) => (
                    <div key={String(l)} className="rounded-xl border border-white/5 bg-abyss-950/40 p-3">
                      <p className="font-display text-2xl font-semibold text-white">{n}</p>
                      <p className="text-[11px] text-slate-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-5">
                <p className="label">{t.howItWorks}</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-200">
                  {[[MousePointerClick, t.step1], [Satellite, t.step2], [BarChart3, t.step3]].map(([Icon, s], i) => {
                    const I = Icon as typeof Satellite;
                    return <li key={i} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ocean-500/15 text-ocean-300"><I className="h-4 w-4" /></span>{i + 1}. {s as string}</li>;
                  })}
                </ol>
              </div>
              <div className="card p-5">
                <p className="label">{t.quickSelect}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <button key={r.id} onClick={() => select(r.id)} className="chip border-white/10 text-slate-200 hover:border-ocean-400/50 hover:bg-ocean-500/10">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.coastal ? "bg-ocean-400" : "bg-leaf-400"}`} />
                      {lang === "my" ? r.nameMy : r.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div id="map" className={`card relative overflow-hidden ${region ? "h-[420px]" : "h-[560px] lg:h-auto lg:min-h-[640px]"}`}>
            <RegionMap regions={REGIONS} boundaries={boundaries} selectedId={selectedId} onSelect={select} lang={lang} />
            {region ? (
              <button onClick={() => select("")} className="absolute left-14 top-3 z-[1000] flex items-center gap-1.5 rounded-lg border border-white/10 bg-abyss-950/85 px-3 py-1.5 text-xs text-slate-200 hover:bg-abyss-900">
                <ArrowLeft className="h-3.5 w-3.5" />{t.back}
              </button>
            ) : (
              <p className="absolute right-3 top-3 z-[1000] flex max-w-[16rem] items-start gap-2 rounded-xl border border-ocean-400/30 bg-abyss-950/85 px-3 py-2 text-xs text-ocean-300">
                <MapIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t.clickHint}
              </p>
            )}
            {mapError && <p className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-abyss-950/90 px-3 py-2 text-xs text-ember-400">{t.mapError}</p>}
            <div className="absolute bottom-6 left-3 z-[1000] max-w-[15rem] rounded-xl border border-white/10 bg-abyss-950/85 p-3 text-[11px] text-slate-300">
              <p className="label mb-1.5">{t.legend}</p>
              <p className="flex items-center gap-2"><span className="h-3 w-4 rounded-sm border-2 border-ocean-300 bg-ocean-500/40" />{t.legendSelected}</p>
              <p className="mt-1 flex items-center gap-2"><span className="h-3 w-4 rounded-sm border border-[#3b6ea5] bg-[#132a45]" />{t.legendInland} · <span className="h-3 w-4 rounded-sm border border-[#3b8f9a] bg-[#123a44]" />{t.legendCoastal}</p>
              <p className="mt-1 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white bg-ocean-400" />{t.legendPoint}</p>
              <p className="mt-1.5 text-[10px] text-slate-500">{t.naypyidawNote}</p>
            </div>
          </div>
        </div>

        {region && (
          <AnalyzePanel
            t={t}
            lang={lang}
            regions={REGIONS}
            region={region}
            onRegion={select}
            state={panel}
            onChange={setPanel}
            onAnalyze={runAnalyze}
            busy={busy}
            error={error}
            firmsReady={Boolean(status?.firms)}
          />
        )}

        {region && !result && !busy && <p className="text-center text-sm text-slate-400">{t.noResultsYet}</p>}
        {result && <Results r={result} t={t} lang={lang} />}

        <section id="about" className="card grid gap-6 p-6 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white"><Info className="h-5 w-5 text-ocean-300" />{t.about}</h2>
            <p className="mt-2 text-sm text-slate-300">{t.aboutBody}</p>
            <p className="mt-3 text-xs text-slate-500">{t.boundaries}</p>
          </div>
          <div>
            <p className="label">{t.exploreMore}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {EXPLORE.map((e) => (
                <li key={e.name}><a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ocean-300 hover:underline">{e.name}<ExternalLink className="h-3 w-3" /></a></li>
              ))}
            </ul>
          </div>
        </section>
        <p className="pb-20 text-center text-xs text-slate-500">{t.tagline}</p>
      </main>

      <ChatWidget lang={lang} onLangChange={setLang} selectedRegionId={selectedId ?? undefined} endpoint="/api/chat" />
    </div>
  );
}
