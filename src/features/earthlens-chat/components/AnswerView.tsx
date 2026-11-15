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
          <tr className="border-b border-[var(--et-26375b)] align-bottom text-[10px] font-semibold text-[var(--et-c5cee6)]">
            <th scope="col" className="py-1 pr-2 font-medium">{t.colParam}</th>
            <th scope="col" className="py-1 pr-2 font-medium">{t.colLatest}</th>
            <th scope="col" className="py-1 pr-2 font-medium">{t.colTypical}</th>
            <th scope="col" className="py-1 font-medium">{t.colDiff}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.label} className="border-b border-[var(--et-26375b)] align-top">
              <th scope="row" className="py-1.5 pr-2 font-medium text-[var(--et-c5cee6)]">{r.label}</th>
              <td className="py-1.5 pr-2 text-[var(--et-c5cee6)]">
                <span className="whitespace-nowrap font-semibold">{r.latest.value} {r.latest.unit}</span>
                <span className="block text-[10px] text-[var(--et-c5cee6)]">{r.latest.when}</span>
              </td>
              <td className="py-1.5 pr-2 text-[var(--et-c5cee6)]">
                {r.reference ? (
                  <>
                    <span className="whitespace-nowrap">{r.reference.value} {r.reference.unit}</span>
                    <span className="block text-[10px] text-[var(--et-c5cee6)]">{r.referenceLabel}</span>
                  </>
                ) : (
                  <span className="text-[var(--et-c5cee6)]" title={t.notAvailable}>--</span>
                )}
              </td>
              <td className="py-1.5 text-[var(--et-c5cee6)]">
                {r.difference ? (
                  <>
                    <span className={`whitespace-nowrap font-medium ${r.difference.value > 0 ? "text-[var(--et-c5cee6)]" : r.difference.value < 0 ? "text-[var(--et-c5cee6)]" : ""}`}>
                      {sign(r.difference.value)} {r.difference.unit}
                    </span>
                    {r.rank !== null && <span className="block text-[10px] text-[var(--et-c5cee6)]">{t.rank} {r.rank}/100</span>}
                  </>
                ) : (
                  <span className="text-[var(--et-c5cee6)]" title={t.notAvailable}>--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-[var(--et-c5cee6)]">{t.tableNote}</p>
    </div>
  );
}

const ICON: Record<DecisionType, typeof Leaf> = { agriculture: Sprout, water: Droplets, electricity: Zap, disaster: CloudRain, heat: Flame, vegetation: Leaf };
const CONF_STYLE: Record<ConfidenceLevel, string> = {
  high: "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]",
  moderate: "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]",
  low: "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]",
  insufficient: "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]",
};

export function ActionCardView({ card, lang }: { card: ActionCard; lang: Lang }) {
  const t = UI_STRINGS[lang];
  const Icon = ICON[card.decisionType] ?? Leaf;
  const [level, ...rest] = card.confidence.reason.split(" — ");
  return (
    <article className="rounded-xl border border-[var(--et-26375b)] bg-[var(--et-101b35)] p-3" aria-label={`${t.actionCard}: ${card.title}`}>
      <header className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--et-101b35)] text-[var(--et-c5cee6)]"><Icon className="h-3.5 w-3.5" /></span>
        <h4 className="text-[13px] font-semibold text-[var(--et-c5cee6)]">{card.title}</h4>
      </header>
      <dl className="space-y-2 text-[12px]">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--et-c5cee6)]">{t.observedChange}</dt>
          <dd className="text-[var(--et-c5cee6)]">{card.observedChange}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--et-c5cee6)]">{t.potentialImpact}</dt>
          <dd className="text-[var(--et-c5cee6)]">{card.potentialImpact}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--et-c5cee6)]">{t.suggestedOptions}</dt>
          <dd><ul className="list-disc space-y-0.5 pl-4 text-[var(--et-c5cee6)]">{card.suggestedOptions.map((o) => <li key={o}>{o}</li>)}</ul></dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--et-c5cee6)]">{t.evidenceNeeded}</dt>
          <dd><ul className="list-disc space-y-0.5 pl-4 text-[var(--et-c5cee6)]">{card.evidenceNeeded.map((o) => <li key={o}>{o}</li>)}</ul></dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--et-c5cee6)]">{t.confidence}</dt>
          <dd className="mt-0.5">
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONF_STYLE[card.confidence.level]}`}>{level}</span>
            {rest.length > 0 && <span className="ml-1 text-[11px] text-[var(--et-c5cee6)]">{rest.join(" — ")}</span>}
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
    { icon: MapPin, label: t.summaryRegion, text: parts.region, tone: parts.regionSelected ? "text-[var(--et-c5cee6)]" : "text-[var(--et-c5cee6)]" },
    { icon: Search, label: t.summaryFindings, text: parts.keyFindings, tone: "text-[var(--et-c5cee6)]" },
    { icon: CheckCircle2, label: t.summaryRecommendation, text: parts.recommendation, tone: "text-[var(--et-c5cee6)]" },
  ];
  return (
    <section aria-label={answerFormat.sections[0].heading[lang]} className="rounded-xl border border-[var(--et-26375b)] bg-[var(--et-101b35)] p-3">
      <h3 className="mb-2 flex items-center gap-1.5 font-display text-[14px] font-semibold text-[var(--et-c5cee6)]">
        <Sparkles className="h-4 w-4 text-[var(--et-c5cee6)]" />
        {answerFormat.sections[0].heading[lang]}
      </h3>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <r.icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone}`} aria-hidden />
            <p className="text-[13.5px] leading-relaxed text-[var(--et-c5cee6)]">
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
    <div className="rounded-xl border border-[var(--et-26375b)] bg-[var(--et-101b35)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--et-101b35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ba989]"
      >
        <span className="flex-1 font-display text-[13.5px] font-semibold text-[var(--et-c5cee6)]">
          <span className="mr-1.5 text-[var(--et-c5cee6)]">{n}.</span>
          {title}
        </span>
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${open ? "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]" : "border-[var(--et-26375b)] bg-[var(--et-101b35)] text-[var(--et-c5cee6)]"}`}
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
        <p className="text-[11px] text-[var(--et-c5cee6)]">{r.sections.disclaimer}</p>
      </div>
    );
  }
  if (r.kind !== "environmental" || !r.sections || !("summary" in r.sections)) return null;
  const s = r.sections;
  const [locationLine] = s.current.split("\n");

  const bodies: Record<string, ReactNode> = {
    current: r.dataTable ? (
      <>
        <p className="text-[11px] text-[var(--et-c5cee6)]">{locationLine}</p>
        <DataTableView table={r.dataTable} lang={lang} />
      </>
    ) : (
      <Lines text={s.current} className="text-[var(--et-c5cee6)]" />
    ),
    history: <Lines text={s.history} className="text-[var(--et-c5cee6)]" />,
    outlook: <Lines text={s.outlook} className="text-[var(--et-c5cee6)]" />,
    actions: r.actionCards?.length ? (
      <div className="space-y-2">
        {r.actionCards.map((c) => <ActionCardView key={c.id} card={c} lang={lang} />)}
        <p className="flex items-start gap-1 text-[11px] text-[var(--et-c5cee6)]"><ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />{t.confidenceNote}</p>
      </div>
    ) : (
      <p className="rounded-lg border border-[var(--et-26375b)] bg-[var(--et-101b35)] px-2 py-1.5 text-[12.5px] text-[var(--et-c5cee6)]">{r.actionNote ?? s.actions}</p>
    ),
    sources: <Lines text={s.sources} className="text-[12px] text-[var(--et-c5cee6)]" />,
    disclaimer: <Lines text={s.disclaimer} className="text-[12px] text-[var(--et-c5cee6)]" />,
  };

  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {/* The summary is only shown when the server sent it — it is never put together in the browser. */}
      {r.summaryParts ? (
        <SummaryBlock parts={r.summaryParts} lang={lang} />
      ) : (
        s.summary && <Lines text={s.summary} className="rounded-xl border border-[var(--et-26375b)] bg-[var(--et-101b35)] p-3 text-[var(--et-c5cee6)]" />
      )}

      <div className="flex items-center gap-2 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--et-c5cee6)]">
        <span className="h-px flex-1 bg-[var(--et-101b35)]" />
        {answerFormat.detailedHeading[lang]}
        <span className="h-px flex-1 bg-[var(--et-101b35)]" />
      </div>
      <p className="text-center text-[11px] text-[var(--et-c5cee6)]">{t.expandHint}</p>

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
