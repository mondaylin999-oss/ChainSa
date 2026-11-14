"use client";

import { useEffect, useRef } from "react";
import { TOPICS, type TopicId } from "@/features/explorer/catalog";

interface ReferenceHomeProps {
  onExplore: (topic?: TopicId) => void;
  onAsk: () => void;
  onRegion: (id: string) => void;
}

export function ReferenceHome({ onExplore, onAsk, onRegion }: ReferenceHomeProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function navigate(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "earthlens-home-navigation") return;
      if (event.data.action === "assistant") onAsk();
      else if (event.data.action === "explore") {
        if (typeof event.data.region === "string") onRegion(event.data.region);
        else onExplore(TOPICS.find(topic => topic.id === event.data.topic)?.id);
      }
    }
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  }, [onExplore, onAsk, onRegion]);
  return <iframe ref={frame} src="/home-exact/Main.dc.html" title="Earth Trend Detective home" style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#040816" }} />;
}
