"use client";
import { chartText } from "@/features/environmental/components/chartCopy";
import { indicatorName } from "../workspace-copy";

import { useState } from "react";
import { Download, Trash2, ArrowUpRight } from "lucide-react";
import type { HistoryCard } from "./store";

export const historyValue = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

export function HistoryCards({ cards, lang, loading, error, busyId, onOpen, onDownload, onDelete, onClear }: {
  cards: HistoryCard[]; lang: "en" | "my"; loading: boolean; error: string; busyId: string | null;
  onOpen: (id: string) => void; onDownload: (id: string) => void; onDelete: (id: string) => void; onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const my = lang === "my";
  const shown = cards.filter(card => `${card.location} ${card.locationMy} ${card.dataset} ${card.region} ${card.selection.start} ${card.selection.end}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="saved-history" aria-label={my ? "သိမ်းထားသော ရှာဖွေမှုများ" : "Saved search history"}>
    <div className="history-toolbar">
      <label>{my ? "မှတ်တမ်းရှာရန်" : "Find a saved search"}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={my ? "နေရာ သို့မဟုတ် အချက်အလက်" : "Location, dataset, or date"} /></label>
      {cards.length > 0 && <button className="button-secondary" onClick={() => setConfirmClear(true)}><Trash2 size={16} />{my ? "မှတ်တမ်းအားလုံး ဖျက်ရန်" : "Clear history"}</button>}
    </div>
    {confirmClear && <div className="history-notice" role="alert"><p>{my ? "ဤစက်ပေါ်ရှိ သိမ်းထားသော ရှာဖွေမှုအားလုံးကို ဖျက်မလား။ ဒေါင်းလုဒ်လုပ်ထားသော PDF များကို မဖျက်ပါ။" : "Delete all saved searches on this device? Downloaded PDFs will remain."}</p><button className="button-secondary" onClick={() => { onClear(); setConfirmClear(false); }}>{my ? "အားလုံးဖျက်ရန်" : "Delete all"}</button> <button className="text-button" onClick={() => setConfirmClear(false)}>{my ? "မဖျက်တော့ပါ" : "Cancel"}</button></div>}
    {error && <p className="history-notice" role="alert">{chartText(lang,error)}</p>}
    {loading ? <p role="status">{my ? "မှတ်တမ်းများ ဖွင့်နေသည်…" : "Opening saved searches…"}</p>
      : !cards.length ? <div className="history-empty"><h2>{my ? "သိမ်းထားသော ရှာဖွေမှု မရှိသေးပါ" : "Your discoveries start here"}</h2><p>{my ? "လေ့လာရေးစာမျက်နှာတွင် နေရာ၊ အချက်အလက်နှင့် ကာလကို ရွေးပါ။ အချက်အလက် အောင်မြင်စွာရရှိပါက ဤနေရာတွင် အလိုအလျောက် သိမ်းပေးပါမည်။" : "Choose a location, dataset, and period in Explore. Successful searches with observations are saved here automatically."}</p></div>
      : !shown.length ? <p>{my ? "ကိုက်ညီသော မှတ်တမ်း မတွေ့ပါ" : "No saved searches match your search."}</p>
        : <div className="history-grid">{shown.map(card => <article className="history-card" key={card.id}>
          <div className="history-card-heading"><span className="history-badge">{card.locationType === "township" ? (my ? "မြို့နယ်" : "Township") : (my ? "တိုင်း / ပြည်နယ်" : "State / region")}</span><time dateTime={card.savedAt}>{new Date(card.savedAt).toLocaleString(my ? "my-MM" : "en-GB")}</time></div>
          <button className="history-open" onClick={() => onOpen(card.id)}><h2>{my ? card.locationMy || card.location : card.location}</h2><span>{indicatorName(card.selection.datasetId,card.dataset,lang)} <ArrowUpRight size={15} /></span></button>
          <p>{card.selection.start} — {card.selection.end} <small>UTC</small></p>
          <HistorySparkline card={card} />
          <div className="history-stats"><span>{my ? "ပျမ်းမျှ" : "Mean"}<strong>{historyValue(card.summary.mean)} <small>{card.unit}</small></strong></span><span>{my ? "အချက်အလက်အရေအတွက်" : "Observations"}<strong>{card.summary.count}</strong></span></div>
          <p className="history-source">{card.source}</p>
          <div className="history-actions"><button className="button-primary" onClick={() => onDownload(card.id)} disabled={busyId === card.id}><Download size={15} />{busyId === card.id ? (my ? "ပြင်ဆင်နေသည်…" : "Preparing…") : (my ? "PDF ဒေါင်းလုဒ်" : "Download PDF")}</button><button className="button-secondary" aria-label={`${my ? "ဖျက်ရန်" : "Delete"}: ${card.location}, ${card.dataset}`} onClick={() => onDelete(card.id)}><Trash2 size={15} /></button></div>
        </article>)}</div>}
  </section>;
}

function HistorySparkline({ card }: { card: HistoryCard }) {
  const values = card.preview.flatMap(point => point.value === null ? [] : [point.value]);
  if (!values.length) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const first = Date.parse(card.preview[0].date), span = Math.max(1, Date.parse(card.preview.at(-1)!.date) - first);
  let drawing = false;
  const path = card.preview.map(point => {
    if (point.value === null) { drawing = false; return ""; }
    const command = drawing ? "L" : "M"; drawing = true;
    return `${command}${8 + (Date.parse(point.date) - first) / span * 284},${high === low ? 40 : 72 - (point.value - low) / (high - low) * 64}`;
  }).join(" ");
  return <svg className="history-sparkline" viewBox="0 0 300 80" role="img" aria-label={`${card.dataset}: ${card.selection.start} to ${card.selection.end}`}><path d={path} stroke="currentColor" fill="none" strokeWidth="2.5" />{values.length === 1 && <circle cx="8" cy="40" r="3" fill="currentColor" />}</svg>;
}
