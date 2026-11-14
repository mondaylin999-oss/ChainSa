"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, MessageCircle, Send, ShieldCheck, X } from "lucide-react";
import type { Lang } from "../types";
import { UI_STRINGS } from "../i18n";
import { getRegion } from "../regions";
import { useEarthLensChat, type UiMessage } from "../client/useEarthLensChat";
import { StructuredAnswer } from "./AnswerView";

export interface ChatWidgetProps {
  /** Controlled UI language. If omitted, the widget shows its own EN / မြန်မာ switch. */
  lang?: Lang;
  onLangChange?: (lang: Lang) => void;
  /** Region selected on the map; used when a question names no region. */
  selectedRegionId?: string;
  /** API route; defaults to /api/earthlens-chat. */
  endpoint?: string;
  defaultOpen?: boolean;
}

/**
 * Floating chat button + panel. Markup and Tailwind classes follow the Myanmar EarthLens demo's
 * chat panel so it drops into the existing site without visual changes.
 */
export function ChatWidget({ lang: controlledLang, onLangChange, selectedRegionId, endpoint, defaultOpen = false }: ChatWidgetProps) {
  const [ownLang, setOwnLang] = useState<Lang>("en");
  const lang = controlledLang ?? ownLang;
  const setLang = (l: Lang) => (onLangChange ? onLangChange(l) : setOwnLang(l));
  const t = UI_STRINGS[lang];
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const { messages, busy, send } = useEarthLensChat({ endpoint, lang, selectedRegionId, rateLimitedText: t.rateLimited });
  const region = getRegion(selectedRegionId);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  const mm = lang === "my" ? "font-mm leading-[1.8]" : "";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.chatTitle}
        className={`fixed bottom-5 right-5 z-[2000] ${open ? "max-sm:hidden" : ""} grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-ocean-500 to-leaf-500 text-white shadow-[0_10px_30px_-5px_rgba(43,143,232,.6)] transition hover:scale-105`}
      >
        {!open && <span className="absolute inset-0 animate-pulsering rounded-full bg-ocean-400/40" />}
        {open ? <X className="relative h-6 w-6" /> : <MessageCircle className="relative h-6 w-6" />}
      </button>

      <div
        role="dialog"
        aria-label={t.chatTitle}
        lang={lang}
        className={`fixed z-[1999] flex flex-col overflow-hidden border border-white/10 bg-abyss-900/95 shadow-2xl backdrop-blur-xl transition-all duration-300 inset-0 sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[620px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px] sm:rounded-2xl ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        } ${mm}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-ocean-600/30 to-leaf-500/10 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-ocean-500/30">
            <Bot className="h-4 w-4 text-ocean-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-white">{t.chatTitle}</div>
            <div className="truncate text-[11px] text-slate-400">
              {t.context}: {region ? (lang === "my" ? region.nameMy : region.name) : "Myanmar"} · {t.liveData}
            </div>
          </div>
          {!controlledLang && (
            <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]" role="group" aria-label={t.language}>
              {(["en", "my"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`rounded-md px-2 py-0.5 ${lang === l ? "bg-ocean-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {l === "en" ? "EN" : "မြန်မာ"}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-white sm:hidden" aria-label={t.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl rounded-tl-sm bg-white/[0.05] px-3 py-2 text-sm text-slate-200">{t.chatWelcome}</div>
          {messages.length === 0 && (
            <div className="space-y-2">
              {t.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-xl border border-ocean-400/20 bg-ocean-500/5 px-3 py-2 text-left text-xs text-ocean-300 hover:bg-ocean-500/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} m={m} lang={lang} />
          ))}
          {busy && (
            <div className="flex w-16 items-center gap-1 rounded-2xl rounded-tl-sm bg-white/[0.05] px-3 py-3" aria-label="…">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ocean-300" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          )}
          <div ref={bottom} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = input;
            setInput("");
            send(v);
          }}
          className="flex items-center gap-2 border-t border-white/10 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chatPlaceholder}
            maxLength={1000}
            aria-label={t.chatPlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-abyss-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-ocean-400/50 focus:outline-none"
          />
          <button type="submit" disabled={busy || !input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-ocean-500 text-white disabled:opacity-40" aria-label={t.send}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}

function MessageBubble({ m, lang }: { m: UiMessage; lang: Lang }) {
  const t = UI_STRINGS[lang];
  const r = m.response;
  const cls =
    m.role === "user"
      ? "rounded-tr-sm bg-ocean-500/80 text-white"
      : m.error
        ? "rounded-tl-sm bg-ember-500/15 text-ember-400"
        : "rounded-tl-sm bg-white/[0.05] text-slate-200";
  // Environmental answers with structured data get the table + Action Card view; others (and older messages) plain text.
  const rich = m.role === "assistant" && !m.error && r ? <StructuredAnswer r={r} lang={r.lang ?? lang} /> : null;
  return (
    <div className={m.role === "user" ? "flex justify-end" : ""}>
      <div className={`${rich ? "w-full" : "max-w-[92%] whitespace-pre-wrap"} [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-sm ${cls}`}>
        {m.error ? `${t.errorPrefix} ${m.content}` : m.role === "assistant" ? (rich ?? <AnswerText text={m.content} />) : m.content}
        {r && (
          <div className="mt-2 text-[10px] text-slate-500">
            {r.region ? (lang === "my" ? r.region.nameMy : r.region.name) : t.noRegion}
            {r.period ? ` · ${r.period.start} → ${r.period.end}` : ` · ${t.noData}`}
            {" · "}
            {r.generator === "llm" ? `${t.aiWritten}${r.model ? ` (${r.model})` : ""}` : t.template}
          </div>
        )}
        {r?.verification && (
          <div className="mt-1 inline-flex items-center gap-1 rounded bg-leaf-500/20 px-1.5 py-0.5 text-[10px] text-leaf-300">
            <ShieldCheck className="h-3 w-3" />
            {r.verification.numbersVerified}/{r.verification.numbersChecked} {t.numbersChecked}
          </div>
        )}
        {r && r.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-ocean-300 hover:bg-white/10">
                {s.name}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Plain-text fallback: shows numbered section lines ("1. Direct Answer" …) as headings. */
function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        /^[1-9]\. \S/.test(line) ? (
          <div key={i} className={`font-display font-semibold text-ocean-300 ${i ? "mt-2" : ""}`}>
            {line}
          </div>
        ) : (
          <div key={i} className={line.trim() ? "" : "h-1"}>
            {line}
          </div>
        ),
      )}
    </>
  );
}
