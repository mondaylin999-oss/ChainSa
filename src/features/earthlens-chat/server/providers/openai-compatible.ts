import "server-only";
import type { AttemptOutcome } from "../../types";
import type { ChatMessage } from "../prompt";

export interface CompletionResult {
  outcome: AttemptOutcome;
  text?: string;
  /** Model actually used (OpenRouter's free router reports the chosen model). */
  model?: string;
  status?: number;
}

export interface CompletionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs: number;
  headers?: Record<string, string>;
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}

/** Removes hidden reasoning that some free models put in the visible text. */
export function cleanModelText(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^\s*<think>[\s\S]*$/i, "").trim();
}

/** POST {baseUrl}/chat/completions — works for OpenRouter and Groq (both OpenAI-compatible). */
export async function chatCompletion(req: CompletionRequest): Promise<CompletionResult> {
  const f = req.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(`${req.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(req.timeoutMs),
      cache: "no-store",
      headers: { "content-type": "application/json", authorization: `Bearer ${req.apiKey}`, ...req.headers },
      body: JSON.stringify({ model: req.model, messages: req.messages, temperature: 0.2, max_tokens: 1500, ...req.extraBody }),
    });
  } catch (err) {
    const name = (err as Error)?.name;
    return { outcome: name === "TimeoutError" || name === "AbortError" ? "timeout" : "http_error" };
  }
  // 429 = rate/free limit reached; 402 = OpenRouter "payment required" — never retried with a paid model.
  if (res.status === 429 || res.status === 402) return { outcome: "rate_limited", status: res.status };
  if (!res.ok) return { outcome: "http_error", status: res.status };
  let json: { model?: string; choices?: { message?: { content?: string | null } }[] };
  try {
    json = await res.json();
  } catch {
    return { outcome: "http_error", status: res.status };
  }
  const text = cleanModelText(json.choices?.[0]?.message?.content ?? "");
  if (!text) return { outcome: "empty", model: json.model };
  return { outcome: "ok", text, model: json.model ?? req.model };
}
