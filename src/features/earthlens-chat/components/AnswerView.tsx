"use client";

import { CloudRain, Droplets, Flame, Leaf, ShieldAlert, Sprout, Zap } from "lucide-react";
import type { ActionCard, ChatResponseBody, ConfidenceLevel, DataTable, DecisionType, Lang } from "../types";
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

function Heading({ id, lang, first }: { id: string; lang: Lang; first?: boolean }) {
  const i = answerFormat.sections.findIndex((s) => s.id === id);
  if (i < 0) return null;
  return <h3 className={`font-display text-[13px] font-semibold text-ocean-300 ${first ? "" : "mt-3"}`}>{`${i + 1}. ${answerFormat.sections[i].heading[lang]}`}</h3>;
}

const Lines = ({ text, className = "" }: { text: string; className?: string }) => (
  <div className={`whitespace-pre-wrap ${className}`}>{text}</div>
);

/** Rich view for environmental answers. Returns null when the response has no structured data (older messages). */
export function StructuredAnswer({ r, lang }: { r: ChatResponseBody; lang: Lang }) {
  const t = UI_STRINGS[lang];
  if (r.kind !== "environmental" || !r.sections || !("actions" in r.sections)) return null;
  const s = r.sections;
  const [locationLine] = s.current.split("\n");
  return (
    <div className="space-y-1 text-[13px] leading-relaxed">
      <Heading id="direct" lang={lang} first />
      <Lines text={s.direct} className="text-slate-100" />

      <Heading id="current" lang={lang} />
      {r.dataTable ? (
        <>
          <p className="text-[11px] text-slate-400">{locationLine}</p>
          <DataTableView table={r.dataTable} lang={lang} />
        </>
      ) : (
        <Lines text={s.current} />
      )}

      <Heading id="history" lang={lang} />
      <Lines text={s.history} className="text-slate-300" />

      <Heading id="outlook" lang={lang} />
      <Lines text={s.outlook} className="text-slate-300" />

      <Heading id="actions" lang={lang} />
      {r.actionCards?.length ? (
        <div className="space-y-2">
          {r.actionCards.map((c) => <ActionCardView key={c.id} card={c} lang={lang} />)}
          <p className="flex items-start gap-1 text-[10px] text-slate-500"><ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />{t.confidenceNote}</p>
        </div>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[12px] text-slate-300">{r.actionNote ?? s.actions}</p>
      )}

      <Heading id="sources" lang={lang} />
      <Lines text={s.sources} className="text-[11px] text-slate-400" />

      <Heading id="disclaimer" lang={lang} />
      <Lines text={s.disclaimer} className="text-[11px] text-slate-400" />
    </div>
  );
}
