"use client";

import { AlertTriangle, CalendarDays, Database, ExternalLink, Lightbulb, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import type { Lang } from "@/features/earthlens-chat/types";
import type { AnalyzeResult, SeriesChart } from "../types";
import type { SiteStrings } from "../strings";

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(v));

/** Small dependency-free SVG chart (bars or lines) with axes and a legend. */
function Chart({ chart }: { chart: SeriesChart }) {
  const W = 320, H = 150, L = 30, B = 22, T = 8, R = 8;
  const dates = [...new Set(chart.series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const values = chart.series.flatMap((s) => s.points.map((p) => p.value));
  if (!dates.length) return null;
  const min = chart.kind === "bar" ? 0 : Math.min(0, ...values);
  const rawMax = Math.max(...values, chart.kind === "bar" ? 1 : 0);
  const step = niceStep((rawMax - min) / 4);
  const max = Math.ceil(rawMax / step) * step || step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const x = (d: string) => L + ((dates.indexOf(d) + 0.5) / dates.length) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const bw = Math.max(2, ((W - L - R) / dates.length) * 0.6);
  const every = Math.ceil(dates.length / 7);

  return (
    <figure className="card p-4">
      <figcaption className="mb-2 text-xs font-medium text-slate-300">{chart.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={chart.title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(148,163,184,.15)" />
            <text x={L - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{+t.toFixed(2)}</text>
          </g>
        ))}
        {dates.map((d, i) => (i % every === 0 || i === dates.length - 1 ? <text key={d} x={x(d)} y={H - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.slice(5)}</text> : null))}
        {chart.series.map((s) =>
          chart.kind === "bar"
            ? s.points.map((p) => <rect key={s.name + p.date} x={x(p.date) - bw / 2} y={y(p.value)} width={bw} height={Math.max(0, y(min) - y(p.value))} rx="1.5" fill={s.color}><title>{`${p.date}: ${p.value} ${chart.unit}`}</title></rect>)
            : (
              <g key={s.name}>
                <polyline fill="none" stroke={s.color} strokeWidth="1.8" points={s.points.map((p) => `${x(p.date)},${y(p.value)}`).join(" ")} />
                {s.points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="2.2" fill={s.color}><title>{`${p.date}: ${p.value} ${chart.unit}`}</title></circle>)}
              </g>
            ),
        )}
      </svg>
      {chart.series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
          {chart.series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
    </figure>
  );
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function Results({ r, t, lang }: { r: AnalyzeResult; t: SiteStrings; lang: Lang }) {
  const name = lang === "my" ? r.region.nameMy : r.region.name;
  return (
    <section id="insights" className="space-y-5" aria-live="polite">
      <div className="card p-5">
        <p className="label">{t.results}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">{name} — {t.results}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="chip border-white/10"><CalendarDays className="h-3 w-3" />{t.observationPeriod}: {r.period.start} → {r.period.end}</span>
          {r.latestDate && <span className="chip border-white/10">{t.latestObs}: {r.latestDate}</span>}
          <span className="chip border-white/10"><MapPin className="h-3 w-3" />{r.region.lat.toFixed(2)}°N, {r.region.lon.toFixed(2)}°E</span>
          <span className="chip border-leaf-400/30 text-leaf-300">{t.modeLive}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{t.pointBased}</p>
        {r.summary && (
          <div className="mt-4 rounded-xl border border-white/5 bg-abyss-950/40 p-4">
            <p className="label mb-1">{t.summary}</p>
            <p className="text-sm leading-relaxed text-slate-200">{r.summary}</p>
          </div>
        )}
      </div>

      {r.metrics.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {r.metrics.map((m) => (
            <div key={m.param} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{m.title}</p>
                <span className="chip border-white/10 text-slate-400">{m.param === "fires" ? "FIRMS" : "model/obs."}</span>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-white">
                {fmt(m.headline.value)}<span className="ml-1 text-base text-slate-400">{m.headline.unit}</span>
              </p>
              <p className="text-xs text-slate-400">{m.headline.label}</p>
              {m.rows.length > 0 && (
                <dl className="mt-3 space-y-1 border-t border-white/5 pt-3 text-xs">
                  {m.rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-slate-400">{row.label}</dt>
                      <dd className="whitespace-nowrap text-slate-200">{fmt(row.value)} {row.unit}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}

      {r.charts.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{r.charts.map((c) => <Chart key={c.title} chart={c} />)}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Sparkles className="h-4 w-4 text-ocean-300" />{t.insights}</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {r.insights.map((i) => (
              <li key={i.title}><p className="font-medium text-slate-100">{i.title}</p><p className="text-slate-300">{i.body}</p></li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Lightbulb className="h-4 w-4 text-leaf-300" />{t.implications}</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {r.implications.map((i) => (
              <li key={i.title}><p className="font-medium text-slate-100">{i.title}</p><p className="text-slate-300">{i.body}</p></li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs text-amber-200/80"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t.guidanceOnly}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Database className="h-4 w-4 text-ocean-300" />{t.sources}</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {r.sources.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ocean-300 hover:underline">{s.name}<ExternalLink className="h-3 w-3" /></a>
                <p className="text-xs text-slate-400">{s.detail}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-white/5 bg-abyss-950/40 p-3 text-xs text-slate-400">
            <p className="label mb-1">{t.freshness}</p>
            {t.retrieved}: {new Date(r.retrievedAt).toLocaleString(lang === "my" ? "my-MM" : "en-GB")}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><AlertTriangle className="h-4 w-4 text-ember-400" />{t.limitations}</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {r.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
