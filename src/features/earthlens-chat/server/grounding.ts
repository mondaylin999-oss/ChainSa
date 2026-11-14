import "server-only";
import type { Fact, Lang, ParamKey, SourceRef } from "../types";
import type { Region } from "../regions";
import { PARAMS } from "../params";
import { POWER_SOURCE, addDays, fetchPowerDaily, type PowerResult } from "./nasa/power";
import { FIRMS_SOURCE, fetchFires } from "./nasa/firms";

export const WINDOW_DAYS = 7;
const LOOKBACK_DAYS = 30; // POWER's most recent days are often not published yet

export interface Grounding {
  region: Region;
  params: ParamKey[];
  facts: Fact[];
  /** POWER observation window used for the facts. */
  period: { start: string; end: string } | null;
  sources: SourceRef[];
  /** Notes about data coverage, shown to the user and given to the model. */
  notes: string[];
  nasaDataAvailable: boolean;
}

export interface GroundingDeps {
  fetchImpl?: typeof fetch;
  firmsMapKey: string;
  nasaTimeoutMs: number;
  powerBaseUrl?: string;
  today?: string; // YYYY-MM-DD, for tests
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function seriesIn(res: PowerResult, code: string, start: string, end: string) {
  return (res.series[code] ?? []).filter((p) => p.date >= start && p.date <= end && p.value !== null) as { date: string; value: number }[];
}

function extreme(points: { date: string; value: number }[], kind: "max" | "min") {
  return points.reduce((best, p) => ((kind === "max" ? p.value > best.value : p.value < best.value) ? p : best), points[0]);
}

/** Latest date on which every requested code has a valid value. */
export function latestCompleteDate(res: PowerResult, codes: string[]): string | undefined {
  const dates = new Map<string, number>();
  for (const c of codes) for (const p of res.series[c] ?? []) if (p.value !== null) dates.set(p.date, (dates.get(p.date) ?? 0) + 1);
  return [...dates.entries()].filter(([, n]) => n === codes.length).map(([d]) => d).sort().pop();
}

/** Turns POWER daily data into facts. Every value here is computed directly from NASA numbers. */
export function powerFacts(res: PowerResult, params: ParamKey[], start: string, end: string): Fact[] {
  const facts: Fact[] = [];
  const src = POWER_SOURCE.id;
  const period = { start, end };
  const add = (f: Omit<Fact, "source">) => facts.push({ ...f, value: round(f.value, f.decimals), source: src });

  if (params.includes("rainfall")) {
    const pr = seriesIn(res, "PRECTOTCORR", start, end);
    if (pr.length) {
      const wettest = extreme(pr, "max");
      add({ id: "rain_total", param: "rainfall", label: "Total rainfall", labelMy: "စုစုပေါင်း မိုးရေချိန်", value: pr.reduce((a, p) => a + p.value, 0), unit: "mm", decimals: 1, period });
      add({ id: "rain_max_day", param: "rainfall", label: "Wettest day", labelMy: "မိုးအများဆုံး နေ့", value: wettest.value, unit: "mm/day", decimals: 1, date: wettest.date });
      add({ id: "rain_days", param: "rainfall", label: "Days with at least 1 mm of rain", labelMy: "မိုး ၁ မီလီမီတာနှင့်အထက် ရွာသော ရက်", value: pr.filter((p) => p.value >= 1).length, unit: "days", decimals: 0, period });
    }
  }
  if (params.includes("temperature")) {
    const t = seriesIn(res, "T2M", start, end);
    const tx = seriesIn(res, "T2M_MAX", start, end);
    const tn = seriesIn(res, "T2M_MIN", start, end);
    if (t.length) add({ id: "temp_mean", param: "temperature", label: "Average temperature (2 m)", labelMy: "ပျမ်းမျှ အပူချိန်", value: mean(t.map((p) => p.value)), unit: "°C", decimals: 1, period });
    if (tx.length) { const h = extreme(tx, "max"); add({ id: "temp_max", param: "temperature", label: "Highest daily maximum temperature", labelMy: "အမြင့်ဆုံး အပူချိန်", value: h.value, unit: "°C", decimals: 1, date: h.date }); }
    if (tn.length) { const l = extreme(tn, "min"); add({ id: "temp_min", param: "temperature", label: "Lowest daily minimum temperature", labelMy: "အနိမ့်ဆုံး အပူချိန်", value: l.value, unit: "°C", decimals: 1, date: l.date }); }
  }
  if (params.includes("humidity")) {
    const rh = seriesIn(res, "RH2M", start, end);
    if (rh.length) add({ id: "rh_mean", param: "humidity", label: "Average relative humidity (2 m)", labelMy: "ပျမ်းမျှ စိုထိုင်းဆ", value: mean(rh.map((p) => p.value)), unit: "%", decimals: 0, period });
  }
  if (params.includes("wind")) {
    const ws = seriesIn(res, "WS10M", start, end);
    const wx = seriesIn(res, "WS10M_MAX", start, end);
    if (ws.length) add({ id: "wind_mean", param: "wind", label: "Average wind speed (10 m)", labelMy: "ပျမ်းမျှ လေတိုက်နှုန်း", value: mean(ws.map((p) => p.value)), unit: "m/s", decimals: 1, period });
    if (wx.length) { const g = extreme(wx, "max"); add({ id: "wind_max", param: "wind", label: "Highest daily maximum wind speed (10 m)", labelMy: "အမြင့်ဆုံး လေတိုက်နှုန်း", value: g.value, unit: "m/s", decimals: 1, date: g.date }); }
  }
  if (params.includes("soilWetness")) {
    const gw = seriesIn(res, "GWETROOT", start, end);
    if (gw.length) { const last = gw[gw.length - 1]; add({ id: "soil_latest", param: "soilWetness", label: "Root-zone soil wetness (latest day)", labelMy: "မြေဆီလွှာ စိုစွတ်မှု (နောက်ဆုံးရက်)", value: last.value, unit: "fraction (0–1)", decimals: 2, date: last.date }); }
  }
  return facts;
}

const NOTE = {
  gridPoint: (r: Region, lang: Lang) =>
    lang === "my"
      ? `${r.nameMy} အတွက် အချက်အလက်များသည် ကိုယ်စားပြု ဂရစ်အမှတ် တစ်ခု (${r.lat}, ${r.lon}) မှ ဖြစ်ပြီး ဒေသတစ်ခုလုံး၏ အခြေအနေ မဟုတ်နိုင်ပါ။`
      : `Data for ${r.name} comes from one representative grid point (${r.lat}, ${r.lon}) and may not match every part of the region.`,
  pastOnly: (lang: Lang) =>
    lang === "my" ? "ဤအချက်အလက်များသည် ပြီးခဲ့သော တိုင်းတာချက်များဖြစ်ပြီး ခန့်မှန်းချက် မဟုတ်ပါ။" : "These are past observations, not forecasts.",
  powerFailed: (lang: Lang) =>
    lang === "my" ? "NASA POWER မှ အချက်အလက် မရယူနိုင်ပါ။" : "NASA POWER data could not be retrieved.",
  firmsNoKey: (lang: Lang) =>
    lang === "my" ? "NASA FIRMS key မထည့်ထားသဖြင့် မီးလောင်မှု အချက်အလက် မရနိုင်ပါ။" : "Fire data is unavailable because no NASA FIRMS key is configured.",
  firmsFailed: (lang: Lang) =>
    lang === "my" ? "NASA FIRMS မှ မီးလောင်မှု အချက်အလက် မရယူနိုင်ပါ။" : "NASA FIRMS fire data could not be retrieved.",
  firmsArea: (area: string, lang: Lang) =>
    lang === "my" ? "မီးတွေ့ရှိမှုများကို VIIRS ဂြိုဟ်တုမှ ရေတွက်ထားပါသည် (မီးခိုး သို့မဟုတ် တိမ်ဖုံးမှုကြောင့် လွတ်သွားနိုင်ပါသည်)။" : `Fire detections are counted ${area} from VIIRS satellite passes; clouds or smoke can hide fires.`,
};

export async function buildGrounding(region: Region, params: ParamKey[], lang: Lang, deps: GroundingDeps): Promise<Grounding> {
  const today = deps.today ?? new Date().toISOString().slice(0, 10);
  const facts: Fact[] = [];
  const sources: SourceRef[] = [];
  const notes: string[] = [NOTE.gridPoint(region, lang), NOTE.pastOnly(lang)];
  let period: Grounding["period"] = null;

  const codes = [...new Set(params.flatMap((p) => PARAMS[p].powerCodes))];
  const tasks: Promise<void>[] = [];

  if (codes.length) {
    tasks.push(
      (async () => {
        try {
          const res = await fetchPowerDaily(region.lat, region.lon, codes, addDays(today, -LOOKBACK_DAYS), addDays(today, -1), deps.nasaTimeoutMs, deps.fetchImpl, deps.powerBaseUrl);
          const end = latestCompleteDate(res, codes);
          if (!end) throw new Error("no complete days");
          const start = addDays(end, -(WINDOW_DAYS - 1));
          const f = powerFacts(res, params, start, end);
          if (f.length) {
            facts.push(...f);
            period = { start, end };
            sources.push(POWER_SOURCE);
          }
        } catch (err) {
          console.warn(`[earthlens-chat] NASA POWER: ${(err as Error).message}`);
          notes.push(NOTE.powerFailed(lang));
        }
      })(),
    );
  }

  if (params.includes("fires")) {
    if (!deps.firmsMapKey) notes.push(NOTE.firmsNoKey(lang));
    else
      tasks.push(
        (async () => {
          try {
            const { detections, areaNote } = await fetchFires(region, WINDOW_DAYS, deps.firmsMapKey, deps.nasaTimeoutMs, deps.fetchImpl);
            const fp = { start: addDays(today, -(WINDOW_DAYS - 1)), end: today };
            facts.push({ id: "fires_count", param: "fires", label: "Satellite fire detections", labelMy: "ဂြိုဟ်တုမှ တွေ့ရှိသော မီးအမှတ် အရေအတွက်", value: detections.length, unit: "detections", decimals: 0, period: fp, source: FIRMS_SOURCE.id });
            const latest = detections.map((d) => d.date).sort().pop();
            if (latest) facts.push({ id: "fires_latest", param: "fires", label: "Most recent detection day", labelMy: "နောက်ဆုံး တွေ့ရှိသည့်ရက်", value: detections.filter((d) => d.date === latest).length, unit: "detections", decimals: 0, date: latest, source: FIRMS_SOURCE.id });
            sources.push(FIRMS_SOURCE);
            notes.push(NOTE.firmsArea(areaNote, lang));
          } catch (err) {
            console.warn(`[earthlens-chat] NASA FIRMS: ${(err as Error).message}`);
            notes.push(NOTE.firmsFailed(lang));
          }
        })(),
      );
  }

  await Promise.all(tasks);
  return { region, params, facts, period, sources, notes, nasaDataAvailable: facts.length > 0 };
}
