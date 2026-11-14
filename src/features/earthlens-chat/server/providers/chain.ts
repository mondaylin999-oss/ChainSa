import "server-only";
import type { ProviderAttempt } from "../../types";
import type { ProviderConfig, ServerConfig } from "../env";
import { isFreeOpenRouterModel } from "../env";
import type { ChatMessage } from "../prompt";
import { chatCompletion } from "./openai-compatible";

export interface ChainResult {
  text: string | null;
  provider: "openrouter" | "groq" | null;
  model: string | null;
  attempts: ProviderAttempt[];
}

/** Return true to accept an answer, or the rejection reason to make the chain try the next model. */
export type AnswerCheck = (text: string) => true | "unverified_numbers" | "forbidden_claim";

const MAX_ATTEMPTS_PER_PROVIDER = 3;
const TOTAL_BUDGET_MS = 50_000;

function extras(p: ProviderConfig, model: string, cfg: ServerConfig): { headers?: Record<string, string>; extraBody?: Record<string, unknown> } {
  if (p.name === "openrouter") {
    const headers: Record<string, string> = { "X-Title": cfg.openrouterTitle };
    if (cfg.openrouterReferer) headers["HTTP-Referer"] = cfg.openrouterReferer;
    return { headers };
  }
  // Groq's gpt-oss models are reasoning models; low effort keeps answers fast and within free token limits.
  if (model.startsWith("openai/gpt-oss")) return { extraBody: { reasoning_effort: "low" } };
  return {};
}

/**
 * Primary: OpenRouter free models. Backup: Groq free models. Never a paid model:
 * the model lists were already filtered in env.ts, and we re-check here as a second guard.
 */
export async function runProviderChain(
  messages: ChatMessage[],
  cfg: ServerConfig,
  accept: AnswerCheck,
  fetchImpl?: typeof fetch,
): Promise<ChainResult> {
  const attempts: ProviderAttempt[] = [];
  const started = Date.now();

  for (const p of [cfg.openrouter, cfg.groq]) {
    if (!p.apiKey || !p.models.length) {
      attempts.push({ provider: p.name, model: p.models[0] ?? "-", outcome: "not_configured" });
      continue;
    }
    let tried = 0;
    for (const model of p.models) {
      // Groq models were already filtered against the free allowlist in env.ts.
      const free = p.name === "openrouter" ? isFreeOpenRouterModel(model) : true;
      if (!free) continue;
      if (tried >= MAX_ATTEMPTS_PER_PROVIDER || Date.now() - started > TOTAL_BUDGET_MS) break;
      tried++;
      const r = await chatCompletion({ baseUrl: p.baseUrl, apiKey: p.apiKey, model, messages, timeoutMs: cfg.aiTimeoutMs, fetchImpl, ...extras(p, model, cfg) });
      if (r.outcome !== "ok" || !r.text) {
        attempts.push({ provider: p.name, model, outcome: r.outcome });
        // 402 from OpenRouter means the account would need credits — stop using this provider entirely.
        if (r.status === 402) break;
        continue;
      }
      const verdict = accept(r.text);
      if (verdict !== true) {
        attempts.push({ provider: p.name, model: r.model ?? model, outcome: verdict });
        continue;
      }
      attempts.push({ provider: p.name, model: r.model ?? model, outcome: "ok" });
      return { text: r.text, provider: p.name, model: r.model ?? model, attempts };
    }
  }
  return { text: null, provider: null, model: null, attempts };
}
