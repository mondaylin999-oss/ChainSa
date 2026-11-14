"use client";

import { useId, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, CloudRain, Droplets, Flame, Leaf, MapPin, Search, ShieldAlert, Sparkles, Sprout, Zap } from "lucide-react";
import type { ActionCard, ChatResponseBody, ConfidenceLevel, DataTable, DecisionType, Lang, SummaryParts } from "../types";
import { answerFormat } from "../config/answer-format";
import { UI_STRINGS } from "../i18n";

/**
 * Structured rendering of an environmental answer: section headings, the NASA data table and the
 * Evidence-Based Action Cards. Everything shown comes from the server response; nothing is computed here.
 */

const sign = (v: number) => (v > 0 ? `+${v}` : String(v));

export function DataTableView({ table, lang }: { table: DataTable; lang: Lang }) {
  const t = UI_STRINGS[lang];
  return (
    <div className="-mx-1 mt-1 overflow-x-auto">
      <table className="w-full min-w-[280px] table-fixed border-collapse text-left text-[11px] leading-snug">
        <caption className="sr-only">{t.tableCaption}</caption>
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[26%]" />
          <col className="w-[24%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/10 align-bottom text-[10px] font-semibold text-slate-400">
            <th scope="col" className="py-1 pr-2 font-medium">{t.colParam}</th>
            <th scope="col" className="py-1 pr-2 font-medium">{t.colLatest}</th>
            <th scope="col" className="py-1 pr-2 font-medium">{t.colTypical}</th>
            <th scope="col" className="py-1 font-medium">{t.colDiff}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.label} className="border-b border-white/5 align-top">
              <th scope="row" className="py-1.5 pr-2 font-medium text-slate-200">{r.label}</th>
              <td className="py-1.5 pr-2 text-white">
                <span className="whitespace-nowrap font-semibold">{r.latest.value} {r.latest.unit}</span>
                <span className="block text-[10px] text-slate-500">{r.latest.when}</span>
              </td>
              <td className="py-1.5 pr-2 text-slate-300">
                {r.reference ? (
                  <>
                    <span className="whitespace-nowrap">{r.reference.value} {r.reference.unit}</span>
                    <span className="block text-[10px] text-slate-500">{r.referenceLabel}</span>
                  </>
                ) : (
                  <span className="text-slate-500" title={t.notAvailable}>--</span>
                )}
              </td>
              <td className="py-1.5 text-slate-300">
                {r.difference ? (
                  <>
                    <span className={`whitespace-nowrap font-medium ${r.difference.value > 0 ? "text-ocean-300" : r.difference.value < 0 ? "text-amber-300" : ""}`}>
                      {sign(r.difference.value)} {r.difference.unit}
                    </span>
                    {r.rank !== null && <span className="block text-[10px] text-slate-500">{t.rank} {r.rank}/100</span>}
                  </>
                ) : (
                  <span className="text-slate-500" title={t.notAvailable}>--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-slate-500">{t.tableNote}</p>
    </div>
  );
}

const ICON: Record<DecisionType, typeof Leaf> = { agriculture: Sprout, water: Droplets, electricity: Zap, disaster: CloudRain, heat: Flame, vegetation: Leaf };
const CONF_STYLE: Record<ConfidenceLevel, string> = {
  high: "border-leaf-400/40 bg-leaf-500/15 text-leaf-300",
  moderate: "border-ocean-400/40 bg-ocean-500/15 text-ocean-300",
  low: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  insufficient: "border-white/15 bg-white/5 text-slate-300",
};

export function ActionCardView({ card, lang }: { card: ActionCard; lang: Lang }) {
  const t = UI_STRINGS[lang];
  const Icon = ICON[card.decisionType] ?? Leaf;
  const [level, ...rest] = card.confidence.reason.split(" — ");
  return (
    <article className="rounded-xl border border-white/10 bg-abyss-950/50 p-3" aria-label={`${t.actionCard}: ${card.title}`}>
      <header className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ocean-500/20 text-ocean-300"><Icon className="h-3.5 w-3.5" /></span>
        <h4 className="text-[13px] font-semibold text-white">{card.title}</h4>
      </header>
      <dl className="space-y-2 text-[12px]">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.observedChange}</dt>
          <dd className="text-slate-200">{card.observedChange}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.potentialImpact}</dt>
          <dd className="text-slate-300">{card.potentialImpact}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.suggestedOptions}</dt>
          <dd><ul className="list-disc space-y-0.5 pl-4 text-slate-300">{card.suggestedOptions.map((o) => <li key={o}>{o}</li>)}</ul></dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.evidenceNeeded}</dt>
          <dd><ul className="list-disc space-y-0.5 pl-4 text-slate-300">{card.evidenceNeeded.map((o) => <li key={o}>{o}</li>)}</ul></dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.confidence}</dt>
          <dd className="mt-0.5">
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONF_STYLE[card.confidence.level]}`}>{level}</span>
            {rest.length > 0 && <span className="ml-1 text-[11px] text-slate-400">{rest.join(" — ")}</span>}
          </dd>
        </div>
      </dl>
    </article>
  );
}

/** Detailed sections are numbered 1–6; the Executive Summary above them has no number. */
const DETAILED = answerFormat.sections.filter((s) => s.id !== "summary");

const Lines = ({ text, className = "" }: { text: string; className?: string }) => (
  <div className={`whitespace-pre-wrap ${className}`}>{text}</div>
);

/** Executive Summary as three separate paragraphs: region · key findings · key recommendation. */
function SummaryBlock({ parts, lang }: { parts: SummaryParts; lang: Lang }) {
  const t = UI_STRINGS[lang];
  const rows: { icon: typeof MapPin; label: string; text: string; tone: string }[] = [
    { icon: MapPin, label: t.summaryRegion, text: parts.region, tone: parts.regionSelected ? "text-ocean-300" : "text-amber-300" },
    { icon: Search, label: t.summaryFindings, text: parts.keyFindings, tone: "text-ocean-300" },
    { icon: CheckCircle2, label: t.summaryRecommendation, text: parts.recommendation, tone: "text-leaf-300" },
  ];
  return (
    <section aria-label={answerFormat.sections[0].heading[lang]} className="rounded-xl border border-ocean-400/30 bg-ocean-500/10 p-3">
      <h3 className="mb-2 flex items-center gap-1.5 font-display text-[14px] font-semibold text-white">
        <Sparkles className="h-4 w-4 text-ocean-300" />
        {answerFormat.sections[0].heading[lang]}
      </h3>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <r.icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone}`} aria-hidden />
            <p className="text-[13.5px] leading-relaxed text-slate-100">
              <span className={`mr-1 font-semibold ${r.tone}`}>{r.label}:</span>
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One collapsible detailed section. Closed by default; each section opens and closes on its own. */
function AccordionSection({ id, n, title, open, onToggle, children, uid }: { id: string; n: number; title: string; open: boolean; onToggle: () => void; children: ReactNode; uid: string }) {
  const panelId = `${uid}-${id}`;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400/60"
      >
        <span className="flex-1 font-display text-[13.5px] font-semibold text-slate-100">
          <span className="mr-1.5 text-ocean-300">{n}.</span>
          {title}
        </span>
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${open ? "border-ocean-400/60 bg-ocean-500/25 text-white" : "border-white/15 bg-white/[0.04] text-slate-300"}`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {/* grid-rows 0fr → 1fr gives a smooth height animation without measuring the content */}
      <div
        id={panelId}
        role="region"
        aria-label={title}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0.5 text-[13px] leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Rich view: Executive Summary (three paragraphs) on top, then the six detailed sections as an accordion,
 * all closed at first. Returns null for responses without structured data (older messages, general answers).
 */
export function StructuredAnswer({ r, lang }: { r: ChatResponseBody; lang: Lang }) {
  const t = UI_STRINGS[lang];
  const uid = useId();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  // No location chosen: only the three-part summary and the general disclaimer.
  if (r.kind === "needs_region" && r.summaryParts) {
    return (
      <div className="space-y-2">
        <SummaryBlock parts={r.summaryParts} lang={lang} />
        <p className="text-[11px] text-slate-400">{r.sections.disclaimer}</p>
      </div>
    );
  }
  if (r.kind !== "environmental" || !r.sections || !("summary" in r.sections)) return null;
  const s = r.sections;
  const [locationLine] = s.current.split("\n");

  const bodies: Record<string, ReactNode> = {
    current: r.dataTable ? (
      <>
        <p className="text-[11px] text-slate-400">{locationLine}</p>
        <DataTableView table={r.dataTable} lang={lang} />
      </>
    ) : (
      <Lines text={s.current} className="text-slate-300" />
    ),
    history: <Lines text={s.history} className="text-slate-300" />,
    outlook: <Lines text={s.outlook} className="text-slate-300" />,
    actions: r.actionCards?.length ? (
      <div className="space-y-2">
        {r.actionCards.map((c) => <ActionCardView key={c.id} card={c} lang={lang} />)}
        <p className="flex items-start gap-1 text-[11px] text-slate-500"><ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />{t.confidenceNote}</p>
      </div>
    ) : (
      <p className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[12.5px] text-slate-300">{r.actionNote ?? s.actions}</p>
    ),
    sources: <Lines text={s.sources} className="text-[12px] text-slate-400" />,
    disclaimer: <Lines text={s.disclaimer} className="text-[12px] text-slate-400" />,
  };

  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {/* The summary is only shown when the server sent it — it is never put together in the browser. */}
      {r.summaryParts ? (
        <SummaryBlock parts={r.summaryParts} lang={lang} />
      ) : (
        s.summary && <Lines text={s.summary} className="rounded-xl border border-ocean-400/30 bg-ocean-500/10 p-3 text-slate-100" />
      )}

      <div className="flex items-center gap-2 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        {answerFormat.detailedHeading[lang]}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <p className="text-center text-[11px] text-slate-500">{t.expandHint}</p>

      <div className="space-y-1.5">
        {DETAILED.map((sec, i) => (
          <AccordionSection key={sec.id} id={sec.id} n={i + 1} title={sec.heading[lang]} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} uid={uid}>
            {bodies[sec.id]}
          </AccordionSection>
        ))}
      </div>
    </div>
  );
}
