import "server-only";
import { z } from "zod";
import { REGIONS, getRegion, type Region } from "@/features/earthlens-chat/regions";
import { addDays, fetchPowerDaily, NasaError, POWER_SOURCE, type PowerPoint } from "@/features/earthlens-chat/server/nasa/power";
import { fetchFires, FIRMS_SOURCE, type FireDetection } from "@/features/earthlens-chat/server/nasa/firms";
import { getConfig } from "@/features/earthlens-chat/server/env";
import type { Lang } from "@/features/earthlens-chat/types";
import type { AnalyzeResult, MetricCard, SeriesChart, SiteParam, TextItem } from "../types";

/**
 * Dashboard analysis for one region. Every number comes from NASA POWER (daily, AG community)
 * or NASA FIRMS. There is no demo/sample data: if NASA is unreachable the user sees an error.
 */

export const SITE_PARAMS = ["rainfall", "temperature", "humidity", "wind", "soilWetness", "fires"] as const;
const MAX_DAYS = 92;

const regionIds = REGIONS.map((r) => r.id) as [string, ...string[]];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD");

export const analyzeSchema = z
  .object({
    regionId: z.enum(regionIds),
    params: z.array(z.enum(SITE_PARAMS)).min(1, "Select at least one parameter").max(SITE_PARAMS.length),
    range: z.object({ start: date, end: date }).optional(),
    lang: z.enum(["en", "my"]).optional(),
    // accepted for compatibility with the original EarthLens front end; always live data here
    mode: z.enum(["live", "demo"]).optional(),
  })
  .strict();

export type AnalyzeRequest = z.infer<typeof analyzeSchema>;

const CODES: Record<Exclude<SiteParam, "fires">, string[]> = {
  rainfall: ["PRECTOTCORR"],
  temperature: ["T2M", "T2M_MAX", "T2M_MIN"],
  humidity: ["RH2M"],
  wind: ["WS10M", "WS10M_MAX"],
  soilWetness: ["GWETROOT"],
};

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;

export function validateRange(range: { start: string; end: string } | undefined): string | null {
  if (!range) return null;
  if (Number.isNaN(Date.parse(range.start)) || Number.isNaN(Date.parse(range.end))) return "Invalid date.";
  if (range.start > range.end) return "The start date must be before the end date.";
  if (range.end > today()) return "The end date cannot be in the future (NASA POWER only has past observations).";
  if (range.start < "1981-01-01") return "NASA POWER daily data starts on 1981-01-01.";
  if (daysBetween(range.start, range.end) > MAX_DAYS) return `Choose a period of at most ${MAX_DAYS} days.`;
  return null;
}

type T = { en: string; my: string };
const tr = (t: T, lang: Lang) => t[lang];
const valid = (s: PowerPoint[]) => s.filter((p): p is { date: string; value: number } => p.value !== null);
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
const mean = (v: number[]) => (v.length ? sum(v) / v.length : NaN);
const round = (v: number, d: number) => Number(v.toFixed(d));

/** Least-squares slope per day. */
function slope(points: { date: string; value: number }[]): number {
  if (points.length < 3) return NaN;
  const xs = points.map((_, i) => i);
  const mx = mean(xs), my = mean(points.map((p) => p.value));
  const num = sum(points.map((p, i) => (xs[i] - mx) * (p.value - my)));
  const den = sum(xs.map((x) => (x - mx) ** 2));
  return den ? num / den : NaN;
}

function extreme(points: { date: string; value: number }[], kind: "max" | "min") {
  return points.reduce((best, p) => (kind === "max" ? p.value > best.value : p.value < best.value) ? p : best, points[0]);
}

/**
 * Picks the period: either the user's dates, or the most recent 7 days for which every
 * requested NASA POWER variable has a valid value (POWER typically lags a few days).
 */
function pickLatest7(series: Record<string, PowerPoint[]>, codes: string[]): { start: string; end: string } | null {
  const dates = (series[codes[0]] ?? []).map((p) => p.date);
  const ok = dates.filter((d) => codes.every((c) => series[c]?.find((p) => p.date === d)?.value != null));
  if (!ok.length) return null;
  const end = ok[ok.length - 1];
  return { start: addDays(end, -6), end };
}

export async function analyze(req: AnalyzeRequest, deps: { fetchImpl?: typeof fetch } = {}): Promise<AnalyzeResult> {
  const lang: Lang = req.lang ?? "en";
  const cfg = getConfig();
  const region = getRegion(req.regionId) as Region;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const powerParams = req.params.filter((p): p is Exclude<SiteParam, "fires"> => p !== "fires");
  const codes = [...new Set(powerParams.flatMap((p) => CODES[p]))];

  const metrics: MetricCard[] = [];
  const charts: SeriesChart[] = [];
  const insights: TextItem[] = [];
  const implications: TextItem[] = [];
  const limitations: string[] = [];
  const sources: AnalyzeResult["sources"] = [];
  let period = req.range ?? { start: addDays(today(), -6), end: today() };
  let latestDate: string | null = null;

  if (codes.length) {
    const fetchStart = req.range ? req.range.start : addDays(today(), -21);
    const fetchEnd = req.range ? req.range.end : today();
    const res = await fetchPowerDaily(region.lat, region.lon, codes, fetchStart, fetchEnd, cfg.nasaTimeoutMs, fetchImpl, cfg.powerBaseUrl);
    if (!req.range) {
      const p = pickLatest7(res.series, codes);
      if (!p) throw new NasaError("NASA POWER returned no valid values for the last three weeks.");
      period = p;
    }
    const inPeriod = (s: PowerPoint[]) => valid(s).filter((p) => p.date >= period.start && p.date <= period.end);
    const S = Object.fromEntries(codes.map((c) => [c, inPeriod(res.series[c] ?? [])]));
    const allDates = codes.flatMap((c) => S[c].map((p) => p.date)).sort();
    latestDate = allDates.length ? allDates[allDates.length - 1] : null;
    const missing = codes.filter((c) => (res.series[c] ?? []).some((p) => p.date >= period.start && p.date <= period.end && p.value === null));
    if (missing.length) limitations.push(tr({ en: `Some days had no valid NASA POWER value (${missing.join(", ")}); they were left out, not filled in.`, my: `အချို့ရက်များတွင် NASA POWER တန်ဖိုး မရှိပါ (${missing.join(", ")})။ ၎င်းတို့ကို ချန်လှပ်ထားပြီး ခန့်မှန်းဖြည့်စွက်ခြင်း မပြုပါ။` }, lang));

    if (powerParams.includes("rainfall") && S.PRECTOTCORR.length) {
      const r = S.PRECTOTCORR;
      const total = sum(r.map((p) => p.value));
      const wet = extreme(r, "max");
      const rainy = r.filter((p) => p.value >= 1).length;
      metrics.push({
        param: "rainfall",
        title: tr({ en: "Rainfall", my: "မိုးရေချိန်" }, lang),
        headline: { label: tr({ en: "Total rainfall", my: "စုစုပေါင်း မိုးရေချိန်" }, lang), value: round(total, 1), unit: "mm" },
        rows: [
          { label: tr({ en: "Mean daily rainfall", my: "နေ့စဉ် ပျမ်းမျှ မိုးရေချိန်" }, lang), value: round(mean(r.map((p) => p.value)), 1), unit: "mm/day" },
          { label: tr({ en: `Wettest day (${wet.date})`, my: `မိုးအများဆုံးနေ့ (${wet.date})` }, lang), value: round(wet.value, 1), unit: "mm/day" },
          { label: tr({ en: "Rainy days (≥1 mm)", my: "မိုးရွာသောရက် (≥၁ mm)" }, lang), value: rainy, unit: tr({ en: "days", my: "ရက်" }, lang) },
        ],
      });
      charts.push({ title: tr({ en: "Rainfall · mm/day · daily", my: "မိုးရေချိန် · mm/day · နေ့စဉ်" }, lang), kind: "bar", unit: "mm/day", series: [{ name: "PRECTOTCORR", color: "#4aaeff", points: r }] });
      insights.push({ title: tr({ en: "Rainfall", my: "မိုးရေချိန်" }, lang), body: tr({ en: `Rainfall totalled ${round(total, 1)} mm over the period, with ${rainy} rainy days. The wettest day (${wet.date}) reached ${round(wet.value, 1)} mm/day.`, my: `ကာလအတွင်း မိုးရေချိန် စုစုပေါင်း ${round(total, 1)} mm ရှိပြီး မိုးရွာသောရက် ${rainy} ရက် ရှိပါသည်။ မိုးအများဆုံးနေ့ (${wet.date}) တွင် ${round(wet.value, 1)} mm/day ရှိပါသည်။` }, lang) });
      if (wet.value >= 50)
        implications.push({ title: tr({ en: "Heavy rain", my: "မိုးသည်းထန်မှု" }, lang), body: tr({ en: "At least one day had very heavy rain. Low-lying fields can become waterlogged — check drainage and follow DMH flood warnings.", my: "အနည်းဆုံး တစ်ရက်တွင် မိုးအလွန်သည်းထန်ခဲ့ပါသည်။ နိမ့်သောလယ်ကွင်းများ ရေဝပ်နိုင်သဖြင့် ရေထုတ်မြောင်းများ စစ်ဆေးပြီး DMH ရေကြီးမှု သတိပေးချက်များကို လိုက်နာပါ။" }, lang) });
      else if (total < 2)
        implications.push({ title: tr({ en: "Little rain", my: "မိုးနည်းခြင်း" }, lang), body: tr({ en: "Almost no rain fell. Rain-fed crops depend on remaining soil moisture; plan irrigation if water is available.", my: "မိုးမရွာသလောက် ဖြစ်ခဲ့ပါသည်။ မိုးရေကို မှီခိုသော သီးနှံများသည် ကျန်ရှိသော မြေစိုထိုင်းဆကိုသာ မှီခိုရပါမည်။ ရေရရှိနိုင်ပါက ဆည်ရေပေးရန် စီစဉ်ပါ။" }, lang) });
    }

    if (powerParams.includes("temperature") && S.T2M.length) {
      const m = mean(S.T2M.map((p) => p.value));
      const hi = S.T2M_MAX.length ? extreme(S.T2M_MAX, "max") : null;
      const lo = S.T2M_MIN.length ? extreme(S.T2M_MIN, "min") : null;
      const tr7 = slope(S.T2M);
      const rows = [];
      if (hi) rows.push({ label: tr({ en: `Highest daily maximum (${hi.date})`, my: `အမြင့်ဆုံး အပူချိန် (${hi.date})` }, lang), value: round(hi.value, 1), unit: "°C" });
      if (lo) rows.push({ label: tr({ en: `Lowest daily minimum (${lo.date})`, my: `အနိမ့်ဆုံး အပူချိန် (${lo.date})` }, lang), value: round(lo.value, 1), unit: "°C" });
      if (Number.isFinite(tr7)) rows.push({ label: tr({ en: "Temperature trend", my: "အပူချိန် ပြောင်းလဲနှုန်း" }, lang), value: round(tr7, 2), unit: "°C/day" });
      metrics.push({ param: "temperature", title: tr({ en: "Temperature", my: "အပူချိန်" }, lang), headline: { label: tr({ en: "Mean air temperature", my: "ပျမ်းမျှ လေထု အပူချိန်" }, lang), value: round(m, 1), unit: "°C" }, rows });
      charts.push({
        title: tr({ en: "Temperature · °C · daily", my: "အပူချိန် · °C · နေ့စဉ်" }, lang),
        kind: "line",
        unit: "°C",
        series: [
          { name: tr({ en: "Mean (°C)", my: "ပျမ်းမျှ (°C)" }, lang), color: "#4fd18b", points: S.T2M },
          { name: tr({ en: "Max (°C)", my: "အမြင့်ဆုံး (°C)" }, lang), color: "#ff8a4c", points: S.T2M_MAX },
          { name: tr({ en: "Min (°C)", my: "အနိမ့်ဆုံး (°C)" }, lang), color: "#7cc7ff", points: S.T2M_MIN },
        ],
      });
      insights.push({ title: tr({ en: "Temperature", my: "အပူချိန်" }, lang), body: tr({ en: `Mean temperature was ${round(m, 1)} °C${hi && lo ? `, with daily values from ${round(lo.value, 1)} °C to ${round(hi.value, 1)} °C` : ""}.`, my: `ပျမ်းမျှ အပူချိန် ${round(m, 1)} °C ရှိပါသည်${hi && lo ? ` (နေ့စဉ် ${round(lo.value, 1)} °C မှ ${round(hi.value, 1)} °C အထိ)` : ""}။` }, lang) });
      if (hi && hi.value >= 38)
        implications.push({ title: tr({ en: "Heat stress", my: "အပူဒဏ်" }, lang), body: tr({ en: "Daily maximums of 38 °C or more can stress crops, livestock and outdoor workers. Water early or late in the day where possible.", my: "၃၈ °C နှင့်အထက် အပူချိန်သည် သီးနှံ၊ တိရစ္ဆာန်နှင့် ပြင်ပလုပ်သားများကို ဒဏ်ခံစေနိုင်ပါသည်။ ဖြစ်နိုင်လျှင် နံနက်စောစော သို့မဟုတ် ညနေပိုင်းတွင် ရေလောင်းပါ။" }, lang) });
    }

    if (powerParams.includes("humidity") && S.RH2M.length) {
      const m = mean(S.RH2M.map((p) => p.value));
      const lo = extreme(S.RH2M, "min");
      metrics.push({ param: "humidity", title: tr({ en: "Humidity", my: "စိုထိုင်းဆ" }, lang), headline: { label: tr({ en: "Mean relative humidity", my: "ပျမ်းမျှ စိုထိုင်းဆ" }, lang), value: round(m, 0), unit: "%" }, rows: [{ label: tr({ en: `Lowest daily humidity (${lo.date})`, my: `အနိမ့်ဆုံး စိုထိုင်းဆ (${lo.date})` }, lang), value: round(lo.value, 0), unit: "%" }] });
      charts.push({ title: tr({ en: "Humidity · % · daily", my: "စိုထိုင်းဆ · % · နေ့စဉ်" }, lang), kind: "line", unit: "%", series: [{ name: "RH2M", color: "#7cc7ff", points: S.RH2M }] });
      insights.push({ title: tr({ en: "Humidity", my: "စိုထိုင်းဆ" }, lang), body: tr({ en: `Relative humidity averaged ${round(m, 0)}%, with a lowest daily value of ${round(lo.value, 0)}%.`, my: `စိုထိုင်းဆ ပျမ်းမျှ ${round(m, 0)}% ရှိပြီး အနိမ့်ဆုံး ${round(lo.value, 0)}% ရှိပါသည်။` }, lang) });
      if (m >= 85)
        implications.push({ title: tr({ en: "Disease pressure", my: "ရောဂါဖြစ်နိုင်ခြေ" }, lang), body: tr({ en: "Long periods of very humid air favour fungal crop diseases. Inspect leaves regularly.", my: "စိုထိုင်းဆ အလွန်မြင့်သော ကာလရှည်တွင် မှိုရောဂါများ ဖြစ်လွယ်ပါသည်။ အရွက်များကို ပုံမှန် စစ်ဆေးပါ။" }, lang) });
    }

    if (powerParams.includes("wind") && S.WS10M.length) {
      const m = mean(S.WS10M.map((p) => p.value));
      const gust = S.WS10M_MAX.length ? extreme(S.WS10M_MAX, "max") : null;
      metrics.push({
        param: "wind",
        title: tr({ en: "Wind conditions", my: "လေတိုက်နှုန်း" }, lang),
        headline: { label: tr({ en: "Mean wind speed at 10 m", my: "၁၀ မီတာ ပျမ်းမျှ လေတိုက်နှုန်း" }, lang), value: round(m, 1), unit: "m/s" },
        rows: gust ? [{ label: tr({ en: `Strongest daily maximum (${gust.date})`, my: `အပြင်းဆုံး လေ (${gust.date})` }, lang), value: round(gust.value, 1), unit: "m/s" }] : [],
      });
      charts.push({ title: tr({ en: "Wind · m/s · daily", my: "လေ · m/s · နေ့စဉ်" }, lang), kind: "line", unit: "m/s", series: [{ name: "WS10M", color: "#4aaeff", points: S.WS10M }, { name: "WS10M_MAX", color: "#ff8a4c", points: S.WS10M_MAX }] });
      insights.push({ title: tr({ en: "Wind", my: "လေ" }, lang), body: tr({ en: `Wind at 10 m averaged ${round(m, 1)} m/s${gust ? `; the strongest daily maximum was ${round(gust.value, 1)} m/s on ${gust.date}` : ""}.`, my: `၁၀ မီတာ လေတိုက်နှုန်း ပျမ်းမျှ ${round(m, 1)} m/s ရှိပါသည်${gust ? `။ အပြင်းဆုံးမှာ ${gust.date} တွင် ${round(gust.value, 1)} m/s ဖြစ်ပါသည်` : ""}။` }, lang) });
      if (region.coastal)
        limitations.push(tr({ en: "Wind values are for a land grid cell; they do not show sea state, waves or cyclone risk. Follow DMH marine warnings before going to sea.", my: "လေတိုက်နှုန်းသည် ကုန်းမြေ ဂရစ်ကွက်အတွက်သာ ဖြစ်ပြီး ပင်လယ်အခြေအနေ၊ လှိုင်း သို့မဟုတ် မုန်တိုင်းအန္တရာယ်ကို မပြပါ။ ပင်လယ်မထွက်မီ DMH သတိပေးချက်များကို လိုက်နာပါ။" }, lang));
    }

    if (powerParams.includes("soilWetness") && S.GWETROOT.length) {
      const last = S.GWETROOT[S.GWETROOT.length - 1];
      const m = mean(S.GWETROOT.map((p) => p.value));
      metrics.push({ param: "soilWetness", title: tr({ en: "Root-zone soil wetness", my: "မြေဆီလွှာ စိုစွတ်မှု" }, lang), headline: { label: tr({ en: `Latest value (${last.date})`, my: `နောက်ဆုံး တန်ဖိုး (${last.date})` }, lang), value: round(last.value, 2), unit: "0–1" }, rows: [{ label: tr({ en: "Period mean", my: "ကာလ ပျမ်းမျှ" }, lang), value: round(m, 2), unit: "0–1" }] });
      charts.push({ title: tr({ en: "Root-zone soil wetness · 0–1 · daily", my: "မြေဆီလွှာ စိုစွတ်မှု · 0–1 · နေ့စဉ်" }, lang), kind: "line", unit: "0–1", series: [{ name: "GWETROOT", color: "#8ae6b0", points: S.GWETROOT }] });
      insights.push({ title: tr({ en: "Soil wetness", my: "မြေစိုစွတ်မှု" }, lang), body: tr({ en: `Root-zone soil wetness was ${round(last.value, 2)} on ${last.date} (0 = completely dry, 1 = saturated).`, my: `${last.date} တွင် မြေဆီလွှာ စိုစွတ်မှု ${round(last.value, 2)} ရှိပါသည် (0 = လုံးဝခြောက်၊ 1 = ရေဝ)။` }, lang) });
      if (last.value < 0.3)
        implications.push({ title: tr({ en: "Dry root zone", my: "မြေဆီလွှာ ခြောက်သွေ့" }, lang), body: tr({ en: "The root zone is relatively dry. Check soil moisture in the field before sowing or transplanting.", my: "အမြစ်ဇုန် အတော်ခြောက်သွေ့နေပါသည်။ မျိုးစေ့ချခြင်း သို့မဟုတ် ပျိုးပြောင်းခြင်း မပြုမီ လယ်ကွင်းတွင် မြေစိုထိုင်းဆကို စစ်ဆေးပါ။" }, lang) });
    }

    sources.push({ name: POWER_SOURCE.name, url: POWER_SOURCE.url, detail: tr({ en: "NASA Langley Research Center — POWER Project · 0.5° × 0.625° (MERRA-2 grid) · daily; the most recent days may lag by several days", my: "NASA Langley Research Center — POWER Project · 0.5° × 0.625° (MERRA-2 grid) · နေ့စဉ်၊ နောက်ဆုံးရက်များ ရက်အနည်းငယ် နောက်ကျနိုင်" }, lang) });
    limitations.push(
      tr({ en: `Values are for one NASA POWER grid cell around ${region.lat.toFixed(2)}°N, ${region.lon.toFixed(2)}°E (≈50 km), not an average for all of ${region.name}.`, my: `တန်ဖိုးများသည် ${region.lat.toFixed(2)}°N, ${region.lon.toFixed(2)}°E အနီးရှိ NASA POWER ဂရစ်ကွက် (≈၅၀ km) တစ်ခုအတွက်သာ ဖြစ်ပြီး ${region.nameMy} တစ်ခုလုံး၏ ပျမ်းမျှ မဟုတ်ပါ။` }, lang),
      tr({ en: "NASA POWER values are model/reanalysis-based estimates, not rain-gauge or station readings.", my: "NASA POWER တန်ဖိုးများသည် မော်ဒယ်/reanalysis အခြေပြု ခန့်မှန်းတန်ဖိုးများ ဖြစ်ပြီး မိုးချိန်ခွက် သို့မဟုတ် စခန်း တိုင်းတာချက် မဟုတ်ပါ။" }, lang),
    );
  }

  if (req.params.includes("fires")) {
    if (!cfg.firmsMapKey) {
      limitations.push(tr({ en: "Satellite fire detections need a NASA FIRMS MAP_KEY on the server, which is not configured.", my: "ဂြိုဟ်တု မီးလောင်မှု တွေ့ရှိချက်များအတွက် server တွင် NASA FIRMS MAP_KEY လိုအပ်ပြီး မသတ်မှတ်ရသေးပါ။" }, lang));
    } else {
      const days = Math.min(10, daysBetween(period.start, today()));
      const { detections, areaNote } = await fetchFires(region, days, cfg.firmsMapKey, cfg.nasaTimeoutMs, fetchImpl);
      const fires: FireDetection[] = detections;
      metrics.push({ param: "fires", title: tr({ en: "Satellite fire detections", my: "ဂြိုဟ်တု မီးတွေ့ရှိချက်" }, lang), headline: { label: tr({ en: `Detections, last ${days} days`, my: `နောက်ဆုံး ${days} ရက် တွေ့ရှိချက်` }, lang), value: fires.length, unit: "" }, rows: [] });
      insights.push({ title: tr({ en: "Fires", my: "မီး" }, lang), body: tr({ en: `NASA FIRMS (VIIRS) recorded ${fires.length} active-fire detections ${areaNote} in the last ${days} days. A detection is a hot spot seen by the satellite, not a confirmed wildfire.`, my: `NASA FIRMS (VIIRS) သည် နောက်ဆုံး ${days} ရက်အတွင်း မီးတွေ့ရှိချက် ${fires.length} ခု မှတ်တမ်းတင်ခဲ့ပါသည်။ တွေ့ရှိချက်တစ်ခုသည် ဂြိုဟ်တုမှ မြင်ရသော အပူစက်သာ ဖြစ်ပြီး အတည်ပြုထားသော တောမီး မဟုတ်ပါ။` }, lang) });
      sources.push({ name: FIRMS_SOURCE.name, url: FIRMS_SOURCE.url, detail: tr({ en: "375 m VIIRS active-fire detections, near real time", my: "375 m VIIRS မီးတွေ့ရှိချက်၊ အချိန်နှင့်တပြေးညီနီးပါး" }, lang) });
      return finish();
    }
  }
  return finish();

  function finish(): AnalyzeResult {
    limitations.push(
      tr({ en: "These are recent historical values. They are not a weather forecast.", my: "ဤတန်ဖိုးများသည် မကြာသေးမီက တိုင်းတာချက်များ ဖြစ်ပြီး ရာသီဥတု ခန့်မှန်းချက် မဟုတ်ပါ။" }, lang),
      tr({ en: "Nothing here guarantees crop outcomes, flood safety or safety at sea.", my: "ဤနေရာရှိ မည်သည့်အရာမှ သီးနှံအောင်မြင်မှု၊ ရေဘေးလုံခြုံမှု သို့မဟုတ် ပင်လယ်ပြင်လုံခြုံမှုကို အာမမခံပါ။" }, lang),
    );
    const summaryParts = insights.map((i) => i.body);
    return {
      region: { id: region.id, name: region.name, nameMy: region.nameMy, type: region.type, lat: region.lat, lon: region.lon, coastal: region.coastal },
      period,
      latestDate,
      mode: "live",
      summary: summaryParts.join(" "),
      metrics,
      charts,
      insights,
      implications,
      sources,
      limitations,
      retrievedAt: new Date().toISOString(),
    };
  }
}
