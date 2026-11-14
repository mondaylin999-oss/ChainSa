"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatErrorBody, ChatResponseBody, Lang } from "../types";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  response?: ChatResponseBody;
}

export interface UseChatOptions {
  endpoint?: string;
  lang: Lang;
  selectedRegionId?: string;
  rateLimitedText: string;
}

/** Browser-side chat state. Talks only to our own API route — no keys or provider URLs here. */
export function useEarthLensChat({ endpoint = "/api/earthlens-chat", lang, selectedRegionId, rateLimitedText }: UseChatOptions) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      // Earlier answers are long (tables, cards); only their short summary is sent back as context.
      const history = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: (m.response?.summary || m.content).slice(0, 1500) }))
        .slice(-10);
      setMessages((m) => [...m, { role: "user", content: message }]);
      setBusy(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, lang, selectedRegionId, history, sessionId: sessionId.current }),
        });
        const data = (await res.json()) as ChatResponseBody | ChatErrorBody;
        if (!res.ok || "error" in data) {
          const err = data as ChatErrorBody;
          throw new Error(res.status === 429 ? rateLimitedText : err.error ?? `HTTP ${res.status}`);
        }
        setMessages((m) => [...m, { role: "assistant", content: data.answer, response: data }]);
      } catch (e) {
        setMessages((m) => [...m, { role: "assistant", content: (e as Error).message || "Request failed", error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, endpoint, lang, messages, rateLimitedText, selectedRegionId],
  );

  return { messages, busy, send, clear: () => setMessages([]) };
}
