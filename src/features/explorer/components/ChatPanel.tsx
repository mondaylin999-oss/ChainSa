"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { ArrowUp, Bot, ExternalLink, LoaderCircle, Sparkles } from "lucide-react";
import { useEarthLensChat } from "../../earthlens-chat/client/useEarthLensChat";
import { StructuredAnswer } from "../../earthlens-chat/components/AnswerView";
import { chartText } from "@/features/environmental/components/chartCopy";
import { REGIONS } from "../../earthlens-chat/regions";

const questions = [
  "What data is available for my township?",
  "How has rainfall changed in my selected township?",
  "Which indicators help explain vegetation changes?",
];

interface ChatPanelProps {
  lang: "en" | "my";
  selectedRegionId: string;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function ChatPanel({ lang, selectedRegionId, inputRef }: ChatPanelProps) {
  const [provider] = useState<"checking" | "available" | "unavailable" | "error">("available");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, busy, send } = useEarthLensChat({
    lang,
    selectedRegionId,
    rateLimitedText: lang === "my" ? "တောင်းဆိုမှုများလွန်းပါသည်။ ခဏစောင့်ပြီး ထပ်ကြိုးစားပါ။" : "Too many requests. Please wait a moment and try again.",
  });
  const region = REGIONS.find((item) => item.id === selectedRegionId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (provider !== "available" || busy || !input.trim()) return;
    const message = input;
    setInput("");
    void send(message);
  }

  const t = (text: string) => chartText(lang,text);
  const enabled = provider === "available";
  return (
    <section id="ask-ai" className="chat-panel panel" aria-labelledby="chat-title" lang={lang}>
      <div className="chat-panel-heading">
        <div className="section-icon"><Bot size={21} aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">{t("Evidence-grounded assistance")}</p>
          <h2 id="chat-title">{t("Ask Myanmar EarthLens")}</h2>
        </div>
        <span className={`service-pill ${enabled ? "service-ready" : "service-muted"}`}>
          <span className="status-dot" />
          {t(provider === "checking" ? "Checking AI" : provider === "available" ? "Evidence ready" : provider === "error" ? "Status unavailable" : "AI unavailable")}
        </span>
      </div>

      {provider === "unavailable" && (
        <div className="inline-notice" role="status">
          AI assistance is currently unavailable. You can still explore connected observations, charts and data sources.
        </div>
      )}
      {provider === "error" && (
        <div className="inline-notice notice-error" role="alert">
          Could not check AI provider configuration. Refresh the page to try again; no provider credentials are exposed in this check.
        </div>
      )}

      <div className="conversation" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="assistant-intro">
              <span className="assistant-avatar"><Sparkles size={16} aria-hidden="true" /></span>
              <p>{t("Ask a question in English or Myanmar. Answers use retrieved evidence and include its dates, sources and limitations.")}</p>
            </div>
            <div className="suggested-questions">
              {questions.map((question) => (
                <button key={t(question)} type="button" disabled={!enabled || busy} onClick={() => void send(t(question))}>
                  {t(question)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const response = message.response;
            return (
              <article key={`${index}-${message.role}`} className={`message message-${message.role}${message.error ? " message-error" : ""}`}>
                {response && (response.kind === "environmental" || response.kind === "needs_region") ? <div className="structured-answer-host"><StructuredAnswer r={response} lang={lang}/></div> : <p className="message-content">{message.content}</p>}
                {response && (
                  <div className="message-evidence">
                    <p>
                      {(lang === "my" ? response.region?.nameMy : response.region?.name) ?? t("General question")} · {response.period ? `${response.period.start} — ${response.period.end}` : t("No observation period")}
                      {response.generator === "template" ? ` · ${t("Evidence-based template")}` : response.model ? ` · ${response.model}` : ` · ${t("AI-assisted")}`}
                    </p>
                    {response.sources.map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                        {source.name}<ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ))}
                    {response.limitations.length > 0 && <p>{response.limitations.join(" ")}</p>}
                  </div>
                )}
              </article>
            );
          })
        )}
        {busy && (
          <div className="loading-message" role="status">
            <LoaderCircle className="spin" size={16} aria-hidden="true" /> Checking NASA evidence and preparing an answer…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-compose" onSubmit={submit}>
        <label className="sr-only" htmlFor="earthlens-chat-input">{t("Message Myanmar EarthLens")}</label>
        <input
          id="earthlens-chat-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("Ask about a township, rainfall, agriculture, water, or environmental change…")}
          maxLength={1000}
          disabled={!enabled || busy}
          lang={lang}
        />
        <button type="submit" disabled={!enabled || busy || !input.trim()} aria-label="Send message">
          {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowUp size={19} />}
          <span>{t("Send")}</span>
        </button>
      </form>
      <p className="chat-context">
        {lang === "my" ? `အကြောင်းအရာ — ${region ? region.nameMy + " ကိုယ်စားပြု တည်နေရာ" : "မြန်မာနိုင်ငံ"} · ရရှိနိုင်ပါက NASA အထောက်အထားများကို အသုံးပြုသည်` : `Context: ${region ? region.name + " regional reference point" : "Myanmar"} · Uses retrieved NASA evidence when available`}
      </p>
    </section>
  );
}
