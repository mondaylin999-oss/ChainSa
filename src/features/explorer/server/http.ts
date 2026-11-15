import "server-only";

/** A provider failure with a user-facing message (never includes credentials or raw provider bodies). */
export class ProviderError extends Error {}

/**
 * GET JSON from a free NASA service with a timeout and one retry for intermittent gateway errors
 * (502/503/504). Timeouts are not retried, so a slow service cannot double the wait.
 */
export async function fetchJson(url: string, opts: { provider: string; timeoutMs: number; fetchImpl?: typeof fetch; retryDelayMs?: number }): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeoutMs), headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (error) {
      const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new ProviderError(timeout ? `${opts.provider} did not respond within ${Math.round(opts.timeoutMs / 1000)} seconds. Try again shortly.` : `${opts.provider} could not be reached. Try again shortly.`);
    }
    if (response.ok) {
      try { return await response.json() as unknown; } catch { throw new ProviderError(`${opts.provider} returned an unreadable response.`); }
    }
    if (attempt === 0 && [502, 503, 504].includes(response.status)) {
      await new Promise(resolve => setTimeout(resolve, opts.retryDelayMs ?? 2000));
      continue;
    }
    throw new ProviderError(`${opts.provider} is temporarily unavailable (HTTP ${response.status}). Try again shortly.`);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
