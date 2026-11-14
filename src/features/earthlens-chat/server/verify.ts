import "server-only";
import type { Fact } from "../types";
import type { Region } from "../regions";
import { addDays } from "./nasa/power";

/**
 * Checks every number and date an AI model wrote against the NASA facts.
 * An answer with any number that cannot be traced back to the data is rejected,
 * so the model cannot invent measurements, dates or coordinates.
 */

const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
export const toAsciiDigits = (s: string) => s.replace(/[၀-၉]/g, (d) => String(MM_DIGITS.indexOf(d)));

export interface VerifyResult {
  ok: boolean;
  checked: number;
  verified: number;
  unverified: string[];
}

interface Allowed {
  values: { v: number; d: number }[];
  dates: Set<string>;
  ints: Set<number>;
}

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

export function buildAllowed(facts: Fact[], region: Region, extraNumbers: number[] = []): Allowed {
  const values: Allowed["values"] = [];
  const dates = new Set<string>();
  const ints = new Set<number>(extraNumbers);
  for (const f of facts) {
    values.push({ v: f.value, d: f.decimals });
    const ds = f.date ? [f.date] : f.period ? datesBetween(f.period.start, f.period.end) : [];
    for (const d of ds) {
      dates.add(d);
      const [y, m, day] = d.split("-").map(Number);
      ints.add(y); ints.add(m); ints.add(day);
    }
    if (f.period) ints.add(datesBetween(f.period.start, f.period.end).length);
    // numbers that appear in labels, e.g. "10 m", "2 m", "1 mm", "0–1"
    for (const n of toAsciiDigits(`${f.label} ${f.labelMy} ${f.unit}`).match(/\d+(?:\.\d+)?/g) ?? []) ints.add(Number(n));
  }
  values.push({ v: region.lat, d: 2 }, { v: region.lon, d: 2 });
  return { values, dates, ints };
}

function numberMatches(n: number, decimalsWritten: number, a: Allowed): boolean {
  if (decimalsWritten === 0 && a.ints.has(n)) return true;
  return a.values.some(({ v, d }) => {
    const dd = Math.min(decimalsWritten, d);
    const tol = 0.5 * 10 ** -dd + 1e-9;
    // the model may round a fact (27.63 -> 27.6 or 28) but never add precision or change it
    return decimalsWritten <= Math.max(d, 2) && Math.abs(v - n) <= tol;
  });
}

export function verifyAnswer(text: string, allowed: Allowed): VerifyResult {
  let t = toAsciiDigits(text);
  const unverified: string[] = [];
  let checked = 0;
  let verified = 0;

  // ISO dates first, then remove them so their parts are not re-checked as numbers.
  t = t.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => {
    checked++;
    if (allowed.dates.has(m)) verified++;
    else unverified.push(m);
    return " ";
  });
  // Markdown list markers like "1." or "2)" at line start are formatting, not claims.
  t = t.replace(/^\s*\d+[.)]\s+/gm, "");
  // Remove thousands separators (1,234 -> 1234).
  t = t.replace(/(\d),(?=\d{3}\b)/g, "$1");

  for (const m of t.matchAll(/-?\d+(?:\.\d+)?/g)) {
    const raw = m[0];
    const n = Number(raw);
    const dec = raw.includes(".") ? raw.split(".")[1].length : 0;
    checked++;
    if (numberMatches(Math.abs(n), dec, allowed) || numberMatches(n, dec, allowed)) verified++;
    else unverified.push(raw);
  }
  return { ok: unverified.length === 0, checked, verified, unverified };
}

/**
 * Phrases that would turn the answer into a forecast or invent a probability.
 * Used together with the number check; any match rejects the AI answer.
 */
const FORBIDDEN: RegExp[] = [
  /\d+(?:\.\d+)?\s*%\s*(?:chance|probability|likelihood|risk)/i,
  /\b(?:chance|probability|likelihood)\s+(?:of|that)\b[^.\n]*\d/i,
  /\bwill\s+(?:rain|flood|be\s+(?:dry|wet|hot|rainy)|receive|get|see|experience|drop|rise)\b/i,
  /\b(?:forecast|outlook)\s+(?:shows?|predicts?|indicates?|suggests?)\b/i,
  /ဖြစ်နိုင်ခြေ[^။\n]*[0-9၀-၉]/, // "probability … <number>"
  /ခန့်မှန်းချက်(?:အရ|က\s*ပြ)/, // "according to the forecast"
];

export function forbiddenClaims(text: string): string[] {
  return FORBIDDEN.filter((re) => re.test(text)).map((re) => re.source);
}
