import "server-only";
import type { Fact } from "../../types";
import type { Region } from "../../regions";
import { POWER_SOURCE, addDays, fetchPowerDaily } from "../nasa/power";
import { latestCompleteDate } from "../grounding";
import {
  allValues, historicalWindowSums, percentileRank, quantile, sameDateInYear, seasonalSample, toDailyMap, windowMax, windowSum, type DailyMap,
} from "./stats";

/**
 * Drought / wet / heat context from the NASA POWER record (1981 – latest available day).
 * Everything here describes the past. The "historical pattern" for the next 30 days is the
 * distribution of what happened on the same calendar dates in earlier years — NOT a forecast.
 *
 * The status rules below are EarthLens indicators, not official drought or flood declarations.
 */

export const FIRST_YEAR = 1981; // MERRA-2 start in NASA POWER
export const OUTLOOK_DAYS = 30;
/** Below this median 30-day rainfall the season is too dry for rainfall percentiles to mean much. */
export const DRY_SEASON_MEDIAN_MM = 10;
const HISTORY_CODES = ["PRECTOTCORR", "GWETROOT", "T2M_MAX"];

export type DroughtStatus = "none" | "watch" | "warning" | "unknown";
export type WetStatus = "none" | "watch" | "unknown";
export type HeatStatus = "none" | "unusual" | "unknown";

export interface Assessment {
  available: boolean;
  latestDate?: string;
  baseline?: { firstYear: number; lastYear: number };
  outlookWindow: { start: string; end: string };
  facts: Fact[];
  drought: DroughtStatus;
  wet: WetStatus;
  heat: HeatStatus;
  /** Ids of the facts that triggered each status. */
  triggers: { drought: string[]; wet: string[]; heat: string[] };
  /** True when the coming 30 days are normally very dry, so rainfall percentiles are not meaningful. */
  drySeasonAhead: boolean;
  drySeasonNow: boolean;
  /** How soil wetness usually changes over the coming 30 days (from past years). */
  soilSeasonalChange?: "wetter" | "drier" | "similar";
}

const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const my = (n: number) => String(n).replace(/[0-9]/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[Number(d)]);

interface Ctx { rain: DailyMap; soil: DailyMap; tmax: DailyMap; latest: string; today: string }

export function computeAssessment(ctx: Ctx): Assessment {
  const { rain, soil, tmax, latest, today } = ctx;
  const facts: Fact[] = [];
  const src = POWER_SOURCE.id;
  const add = (f: Omit<Fact, "source">) => facts.push({ ...f, value: r(f.value, f.decimals), source: src });
  const triggers = { drought: [] as string[], wet: [] as string[], heat: [] as string[] };
  const outlookWindow = { start: addDays(today, 1), end: addDays(today, OUTLOOK_DAYS) };
  let lastYear = FIRST_YEAR;
  const track = (ys: { year: number }[]) => ys.forEach((y) => (lastYear = Math.max(lastYear, y.year)));

  // ---- Current rainfall vs the same calendar window in past years ----
  const pct: Record<string, number | undefined> = {};
  let drySeasonNow = false;
  for (const days of [30, 90]) {
    const start = addDays(latest, -(days - 1));
    const now = windowSum(rain, start, latest);
    if (now === undefined) continue;
    const past = historicalWindowSums(rain, latest, days, FIRST_YEAR, start);
    track(past);
    add({ id: `rain_${days}d`, param: "rainfall", kind: "observation", label: `Rainfall, last ${days} days`, labelMy: `ပြီးခဲ့သော ${my(days)} ရက် မိုးရေချိန်`, value: now, unit: "mm", decimals: 1, period: { start, end: latest } });
    const median = quantile(past.map((p) => p.value), 0.5);
    if (median !== undefined && past.length >= 20)
      add({ id: `rain_${days}d_ref`, param: "rainfall", kind: "comparison", label: `Typical rainfall for the same ${days} days in past years (median)`, labelMy: `ယခင်နှစ်များ၏ တူညီသော ${my(days)} ရက် ပုံမှန် မိုးရေချိန် (အလယ်ကိန်း)`, value: median, unit: "mm", decimals: 1, period: { start, end: latest } });
    if (median !== undefined && median < DRY_SEASON_MEDIAN_MM) {
      if (days === 30) drySeasonNow = true;
      continue; // dry season: a percentile of near-zero totals is not meaningful
    }
    const p = percentileRank(now, past.map((x) => x.value));
    if (p === undefined || past.length < 20) continue;
    pct[`rain_${days}d_pct`] = p;
    add({ id: `rain_${days}d_pct`, param: "rainfall", kind: "comparison", label: `Rank of last-${days}-day rainfall among ${past.length} past years (percentile)`, labelMy: `ပြီးခဲ့သော ${my(days)} ရက် မိုးရေချိန်၏ ယခင်နှစ် ${my(past.length)} နှစ်နှင့် နှိုင်းယှဉ် အဆင့် (ရာခိုင်နှုန်းအဆင့်)`, value: p, unit: "percentile", decimals: 0, period: { start, end: latest } });
  }

  // ---- Soil wetness vs the same dates (±7 days) in past years ----
  const soilNow = soil.get(latest);
  if (soilNow !== undefined) {
    const sample = seasonalSample(soil, latest, 7, FIRST_YEAR, addDays(latest, -7));
    const p = percentileRank(soilNow, sample);
    const soilMed = quantile(sample, 0.5);
    if (soilMed !== undefined && sample.length >= 200)
      add({ id: "soil_ref", param: "soilWetness", kind: "comparison", label: "Typical root-zone soil wetness for this date in past years (median)", labelMy: "ယခင်နှစ်များ၏ ဤရက် ပုံမှန် မြေဆီလွှာ စိုစွတ်မှု (အလယ်ကိန်း)", value: soilMed, unit: "fraction (0–1)", decimals: 2, date: latest });
    if (p !== undefined && sample.length >= 200) {
      pct.soil_pct = p;
      add({ id: "soil_pct", param: "soilWetness", kind: "comparison", label: "Rank of root-zone soil wetness among past years for this date (percentile)", labelMy: "ဤရက်အတွက် ယခင်နှစ်များနှင့် နှိုင်းယှဉ် မြေဆီလွှာ စိုစွတ်မှု အဆင့် (ရာခိုင်နှုန်းအဆင့်)", value: p, unit: "percentile", decimals: 0, date: latest });
    }
  }

  // ---- Heat: hottest day in the last 7 days vs the same season ----
  const t7 = windowMax(tmax, addDays(latest, -6), latest);
  if (t7 !== undefined) {
    add({ id: "tmax_7d", param: "temperature", kind: "observation", label: "Hottest day in the last 7 days (2 m maximum)", labelMy: "ပြီးခဲ့သော ၇ ရက်အတွင်း အပူဆုံးနေ့ (၂ မီတာ အမြင့်ဆုံး)", value: t7, unit: "°C", decimals: 1, period: { start: addDays(latest, -6), end: latest } });
    // Same 7-day window in each past year: hottest day, then the median across years.
    const pastMax: number[] = [];
    for (let y = FIRST_YEAR; y < Number(latest.slice(0, 4)); y++) {
      const end = sameDateInYear(latest, y);
      const m = windowMax(tmax, addDays(end, -6), end);
      if (m !== undefined) pastMax.push(m);
    }
    const tRef = quantile(pastMax, 0.5);
    if (tRef !== undefined && pastMax.length >= 20)
      add({ id: "tmax_7d_ref", param: "temperature", kind: "comparison", label: "Typical hottest day for the same 7 days in past years (median)", labelMy: "ယခင်နှစ်များ၏ တူညီသော ၇ ရက် ပုံမှန် အပူဆုံးနေ့ (အလယ်ကိန်း)", value: tRef, unit: "°C", decimals: 1, period: { start: addDays(latest, -6), end: latest } });
    const sample = seasonalSample(tmax, latest, 7, FIRST_YEAR, addDays(latest, -7));
    const p = percentileRank(t7, sample);
    if (p !== undefined && sample.length >= 200) {
      pct.tmax_pct = p;
      add({ id: "tmax_7d_pct", param: "temperature", kind: "comparison", label: "Rank of the hottest day in the last 7 days among past years for this season (percentile)", labelMy: "ပြီးခဲ့သော ၇ ရက်အတွင်း အပူဆုံးနေ့၏ ယခင်နှစ်များနှင့် နှိုင်းယှဉ် အဆင့် (ရာခိုင်နှုန်းအဆင့်)", value: p, unit: "percentile", decimals: 0, period: { start: addDays(latest, -6), end: latest } });
    }
  }

  // ---- Very heavy rain threshold: top 1% of all days since 1981 ----
  const heavy = quantile(allValues(rain, addDays(latest, -365)), 0.99);
  if (heavy !== undefined && heavy > 0) {
    add({ id: "heavy_threshold", param: "rainfall", kind: "historical", label: "Very heavy rain day threshold (wettest 1% of days since 1981)", labelMy: "အလွန်ပြင်းထန်သော မိုးရက် သတ်မှတ်ချက် (၁၉၈၁ ခုနှစ်မှစ၍ မိုးအများဆုံး ၁ ရာခိုင်နှုန်းရှိသော ရက်များ)", value: heavy, unit: "mm/day", decimals: 1 });
    const recentMax = windowMax(rain, addDays(latest, -6), latest);
    if (recentMax !== undefined && recentMax >= heavy) triggers.wet.push("heavy_threshold");
  }

  // ---- Historical pattern for the coming 30 calendar days (NOT a forecast) ----
  const past30 = historicalWindowSums(rain, outlookWindow.end, OUTLOOK_DAYS, FIRST_YEAR, latest);
  track(past30);
  let drySeasonAhead = false;
  if (past30.length >= 20) {
    const vals = past30.map((p) => p.value);
    const hp = { start: outlookWindow.start, end: outlookWindow.end };
    add({ id: "hist_years", param: "rainfall", kind: "historical", label: "Past years compared", labelMy: "နှိုင်းယှဉ်ထားသော ယခင်နှစ်များ", value: past30.length, unit: "years", decimals: 0, period: hp });
    add({ id: "hist_rain_p20", param: "rainfall", kind: "historical", label: "Past years: 30-day rainfall, drier years (20th percentile)", labelMy: "ယခင်နှစ်များ - ရက် ၃၀ မိုးရေချိန်၊ ခြောက်သွေ့သောနှစ်များ (အောက်ခြေ ၂၀ ရာခိုင်နှုန်း)", value: quantile(vals, 0.2)!, unit: "mm", decimals: 0, period: hp });
    add({ id: "hist_rain_p50", param: "rainfall", kind: "historical", label: "Past years: 30-day rainfall, typical (median)", labelMy: "ယခင်နှစ်များ - ရက် ၃၀ မိုးရေချိန်၊ ပုံမှန် (အလယ်ကိန်း)", value: quantile(vals, 0.5)!, unit: "mm", decimals: 0, period: hp });
    add({ id: "hist_rain_p80", param: "rainfall", kind: "historical", label: "Past years: 30-day rainfall, wetter years (80th percentile)", labelMy: "ယခင်နှစ်များ - ရက် ၃၀ မိုးရေချိန်၊ မိုးများသောနှစ်များ (အထက် ၈၀ ရာခိုင်နှုန်း)", value: quantile(vals, 0.8)!, unit: "mm", decimals: 0, period: hp });
    drySeasonAhead = quantile(vals, 0.5)! < DRY_SEASON_MEDIAN_MM;
    if (heavy !== undefined) {
      let k = 0;
      for (const p of past30) {
        const end = sameDateInYear(outlookWindow.end, p.year);
        const mx = windowMax(rain, addDays(end, -(OUTLOOK_DAYS - 1)), end);
        if (mx !== undefined && mx >= heavy) k++;
      }
      add({ id: "hist_heavy_years", param: "rainfall", kind: "historical", label: "Past years with at least one very heavy rain day in these 30 days", labelMy: "ဤရက် ၃၀ အတွင်း အလွန်ပြင်းထန်သော မိုးရက် အနည်းဆုံး တစ်ရက် ရှိခဲ့သော ယခင်နှစ်များ", value: k, unit: "years", decimals: 0, period: hp });
    }
  }
  let soilSeasonalChange: Assessment["soilSeasonalChange"];
  const soilNowMed = quantile(seasonalSample(soil, today, 7, FIRST_YEAR, latest), 0.5);
  const soilEndMed = quantile(seasonalSample(soil, outlookWindow.end, 7, FIRST_YEAR, latest), 0.5);
  if (soilNowMed !== undefined && soilEndMed !== undefined) {
    add({ id: "hist_soil_now", param: "soilWetness", kind: "historical", label: "Past years: typical soil wetness around today's date (median)", labelMy: "ယခင်နှစ်များ - ယနေ့ရက်ဝန်းကျင် ပုံမှန် မြေဆီလွှာ စိုစွတ်မှု (အလယ်ကိန်း)", value: soilNowMed, unit: "fraction (0–1)", decimals: 2, date: today });
    add({ id: "hist_soil_end", param: "soilWetness", kind: "historical", label: "Past years: typical soil wetness 30 days later (median)", labelMy: "ယခင်နှစ်များ - ရက် ၃၀ အကြာ ပုံမှန် မြေဆီလွှာ စိုစွတ်မှု (အလယ်ကိန်း)", value: soilEndMed, unit: "fraction (0–1)", decimals: 2, date: outlookWindow.end });
    const diff = soilEndMed - soilNowMed;
    soilSeasonalChange = diff > 0.03 ? "wetter" : diff < -0.03 ? "drier" : "similar";
  }

  // ---- EarthLens indicators (rules documented in README) ----
  const low = (id: string) => pct[id] !== undefined && pct[id]! < 20;
  for (const id of ["rain_30d_pct", "rain_90d_pct", "soil_pct"]) if (low(id)) triggers.drought.push(id);
  const anyDroughtData = ["rain_30d_pct", "rain_90d_pct", "soil_pct"].some((id) => pct[id] !== undefined);
  const drought: DroughtStatus = !anyDroughtData
    ? "unknown"
    : (pct.soil_pct !== undefined && pct.soil_pct < 10) || (low("soil_pct") && low("rain_90d_pct"))
      ? "warning"
      : triggers.drought.length
        ? "watch"
        : "none";

  if (pct.rain_30d_pct !== undefined && pct.rain_30d_pct > 90 && pct.soil_pct !== undefined && pct.soil_pct > 80) triggers.wet.push("rain_30d_pct", "soil_pct");
  const wet: WetStatus = pct.rain_30d_pct === undefined && pct.soil_pct === undefined && !triggers.wet.length ? "unknown" : triggers.wet.length ? "watch" : "none";

  if (pct.tmax_pct !== undefined && pct.tmax_pct > 90) triggers.heat.push("tmax_7d_pct");
  const heat: HeatStatus = pct.tmax_pct === undefined ? "unknown" : triggers.heat.length ? "unusual" : "none";

  return {
    available: facts.length > 0,
    latestDate: latest,
    baseline: { firstYear: FIRST_YEAR, lastYear },
    outlookWindow,
    facts,
    drought,
    wet,
    heat,
    triggers,
    drySeasonAhead,
    drySeasonNow,
    soilSeasonalChange,
  };
}

export interface AssessmentDeps {
  fetchImpl?: typeof fetch;
  timeoutMs: number;
  powerBaseUrl?: string;
  today?: string;
}

export async function buildAssessment(region: Region, deps: AssessmentDeps): Promise<Assessment> {
  const today = deps.today ?? new Date().toISOString().slice(0, 10);
  const empty: Assessment = {
    available: false, outlookWindow: { start: addDays(today, 1), end: addDays(today, OUTLOOK_DAYS) }, facts: [],
    drought: "unknown", wet: "unknown", heat: "unknown", triggers: { drought: [], wet: [], heat: [] }, drySeasonAhead: false, drySeasonNow: false,
  };
  try {
    // One long request per region per day (cached in memory for 6 hours).
    const res = await fetchPowerDaily(region.lat, region.lon, HISTORY_CODES, `${FIRST_YEAR}-01-01`, addDays(today, -1), deps.timeoutMs, deps.fetchImpl, deps.powerBaseUrl);
    const latest = latestCompleteDate(res, HISTORY_CODES);
    if (!latest) return empty;
    return computeAssessment({
      rain: toDailyMap(res.series.PRECTOTCORR), soil: toDailyMap(res.series.GWETROOT), tmax: toDailyMap(res.series.T2M_MAX), latest, today,
    });
  } catch (err) {
    console.warn(`[earthlens-chat] NASA POWER history: ${(err as Error).message}`);
    return empty;
  }
}
