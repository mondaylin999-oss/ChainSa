"use client";

import { useEffect, useRef } from "react";
import { TOPICS, type TopicId } from "@/features/explorer/catalog";
import type { HistoryCard } from "@/features/explorer/history/store";

interface ReferenceHomeProps {
  lang: "en" | "my";
  onExplore: (topic?: TopicId) => void;
  onAsk: () => void;
  onRegion: (id: string) => void;
  onLanguage: (language: "en" | "my") => void;
  historyPreview: { cards: HistoryCard[]; loading: boolean; error: string; busyId: string | null };
  onHistory: (action: string, id?: string) => void;
}

export function ReferenceHome({ lang, onExplore, onAsk, onRegion, onLanguage, historyPreview, onHistory }: ReferenceHomeProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  function sendHistory() {
    frame.current?.contentWindow?.postMessage({ type: "earthlens-history-data", ...historyPreview, cards: historyPreview.cards.slice(0, 3) }, window.location.origin);
  }
  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "earthlens-home-language") {
        if (event.data.lang === "en" || event.data.lang === "my") onLanguage(event.data.lang);
        return;
      }
      if (event.data?.type !== "earthlens-home-navigation") return;
      if (event.data.action === "history-ready") sendHistory();
      else if (typeof event.data.action === "string" && event.data.action.startsWith("history-")) onHistory(event.data.action, typeof event.data.id === "string" ? event.data.id : undefined);
      else if (event.data.action === "assistant") onAsk();
      else if (event.data.action === "explore") {
        if (typeof event.data.region === "string") onRegion(event.data.region);
        else onExplore(TOPICS.find(topic => topic.id === event.data.topic)?.id);
      }
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, [onExplore, onAsk, onRegion, onLanguage, historyPreview, onHistory]);
  useEffect(sendHistory, [historyPreview]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "earthlens-home-language", lang }, window.location.origin);
  }, [lang]);
  return <iframe ref={frame} onLoad={sendHistory} src="/home-exact/Main.dc.html" title="ChainSa home" style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "var(--et-040816)" }} />;
}
