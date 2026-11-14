import "server-only";

/**
 * Basic in-memory sliding-window rate limiter.
 * Good enough for local use and a single server. On serverless/multi-instance hosting each
 * instance keeps its own counters — swap this for a shared store (e.g. Redis) there.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(private max: number, private windowMs: number) {}

  /** Records a hit; returns whether it is allowed and how long to wait if not. */
  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    this.sweep(now);
    const from = now - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > from);
    if (list.length >= this.max) {
      this.hits.set(key, list);
      const retry = Math.max(1, Math.ceil((list[0] + this.windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds: retry, remaining: 0 };
    }
    list.push(now);
    this.hits.set(key, list);
    return { allowed: true, retryAfterSeconds: 0, remaining: this.max - list.length };
  }

  private sweep(now: number) {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    const from = now - this.windowMs;
    for (const [k, v] of this.hits) if (!v.some((t) => t > from)) this.hits.delete(k);
  }
}

/** Client identifier for rate limiting. Only trusts proxy headers when TRUST_PROXY=true. */
export function clientKey(headers: Headers, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return `ip:${fwd}`;
    const real = headers.get("x-real-ip")?.trim();
    if (real) return `ip:${real}`;
  }
  // Without a trusted proxy we cannot see the real IP from a Route Handler; fall back to one
  // shared bucket so the limit still caps total traffic.
  return "ip:local";
}
