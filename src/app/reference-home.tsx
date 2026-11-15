"use client";

import { useEffect, useRef } from "react";
import { TOPICS, type TopicId } from "@/features/explorer/catalog";

interface ReferenceHomeProps {
  lang: "en" | "my";
  onExplore: (topic?: TopicId) => void;
  onAsk: () => void;
  onRegion: (id: string) => void;
  onLanguage: (language: "en" | "my") => void;
}

export function ReferenceHome({ lang, onExplore, onAsk, onRegion, onLanguage }: ReferenceHomeProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "earthlens-home-language") {
        if (event.data.lang === "en" || event.data.lang === "my") onLanguage(event.data.lang);
        return;
      }
      if (event.data?.type !== "earthlens-home-navigation") return;
      if (event.data.action === "assistant") onAsk();
      else if (event.data.action === "explore") {
        if (typeof event.data.region === "string") onRegion(event.data.region);
        else onExplore(TOPICS.find(topic => topic.id === event.data.topic)?.id);
      }
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, [onExplore, onAsk, onRegion, onLanguage]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "earthlens-home-language", lang }, window.location.origin);
  }, [lang]);
  return <iframe ref={frame} src="/home-exact/Main.dc.html" title="Earth Trend Detective home" style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "var(--et-040816)" }} />;
}
