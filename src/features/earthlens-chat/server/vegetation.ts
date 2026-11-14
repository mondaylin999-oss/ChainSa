import "server-only";
import type { Fact, Lang, SourceRef } from "../types";
import type { Region } from "../regions";
import { fetchNdviSummary, NDVI_SOURCE, type HistoryMode, type NdviSummary } from "./nasa/modis-ndvi";
import { addDays } from "./nasa/power";

/** NASA MODIS NDVI facts for the chatbot: one observation, the trend, and the comparison with past years. */
export interface VegetationEvidence {
  facts: Fact[];
  sources: SourceRef[];
  notes: string[];
  summary: NdviSummary | null;
}

const UNIT = "NDVI";

export function ndviFacts(s: NdviSummary): Fact[] {
  const facts: Fact[] = [];
  const end = (d: string) => addDays(d, 15);
  const base = { param: "vegetation" as const, unit: UNIT, decimals: 2, source: NDVI_SOURCE.id };
  if (s.latest.value !== null)
    facts.push({ ...base, id: "ndvi_latest", kind: "observation", label: "Vegetation greenness (MODIS NDVI, 16-day composite)", labelMy: "အပင် စိမ်းလန်းမှု (MODIS NDVI၊ ၁၆ ရက် ပေါင်းစပ်ပုံ)", value: s.latest.value, period: { start: s.latest.date, end: end(s.latest.date) } });
  if (s.previous?.value != null)
    facts.push({ ...base, id: "ndvi_previous", kind: "observation", label: "Vegetation greenness, previous composite (MODIS NDVI)", labelMy: "အပင် စိမ်းလန်းမှု၊ ယခင် ပေါင်းစပ်ပုံ (MODIS NDVI)", value: s.previous.value, period: { start: s.previous.date, end: end(s.previous.date) } });
  if (s.historyMean !== null && s.history.length) {
    const first = s.history[0], last = s.history[s.history.length - 1];
    facts.push({ ...base, id: "ndvi_hist_mean", kind: "comparison", label: `Average NDVI for the same 16 days in ${first.year}–${last.year}`, labelMy: `${first.year}–${last.year} ရှိ တူညီသော ၁၆ ရက်အတွက် ပျမ်းမျှ NDVI`, value: s.historyMean });
  }
  if (s.percentile !== null)
    facts.push({ ...base, id: "ndvi_percentile", kind: "comparison", label: "Vegetation greenness vs the same 16 days in past years (percentile)", labelMy: "ယခင်နှစ်များ၏ တူညီသော ၁၆ ရက်နှင့် နှိုင်းယှဉ် အပင်စိမ်းလန်းမှု (ရာခိုင်နှုန်းအဆင့်)", value: s.percentile, unit: "percentile", decimals: 0, period: { start: s.latest.date, end: end(s.latest.date) } });
  return facts;
}

const NOTE = {
  en: (s: NdviSummary) =>
    `MODIS NDVI is the average of ${s.latest.validPixels} valid 250 m pixels within about ${s.windowKm} × ${s.windowKm} km of the grid point. NDVI measures how green vegetation is (about 0.2 = sparse, above 0.6 = dense and healthy); it is not a crop-yield estimate, and clouds or flooding can lower it.`,
  my: (s: NdviSummary) =>
    `MODIS NDVI သည် ဂရစ်အမှတ်အနီး ${s.windowKm} × ${s.windowKm} km ခန့်အတွင်းရှိ မှန်ကန်သော 250 m pixel ${s.latest.validPixels} ခု၏ ပျမ်းမျှ ဖြစ်ပါသည်။ NDVI သည် အပင်များ မည်မျှ စိမ်းလန်းသည်ကို ပြပြီး (0.2 ခန့် = ကျဲပါး၊ 0.6 အထက် = ထူထပ်ကျန်းမာ) သီးနှံအထွက်နှုန်း ခန့်မှန်းချက် မဟုတ်ပါ။ တိမ် သို့မဟုတ် ရေလွှမ်းမှုကြောင့် တန်ဖိုး နိမ့်နိုင်ပါသည်။`,
};

const HIST = {
  pending: {
    en: "The comparison of vegetation greenness with past years is still being prepared from NASA MODIS (it takes about a minute the first time); ask again shortly to include it.",
    my: "ယခင်နှစ်များနှင့် အပင်စိမ်းလန်းမှု နှိုင်းယှဉ်ချက်ကို NASA MODIS မှ ပြင်ဆင်နေဆဲ ဖြစ်ပါသည် (ပထမအကြိမ်တွင် တစ်မိနစ်ခန့် ကြာပါသည်)။ ထည့်သွင်းလိုပါက ခဏအကြာတွင် ထပ်မေးပါ။",
  },
  unavailable: {
    en: "Too few past years of NASA MODIS vegetation data could be retrieved, so no historical NDVI comparison is shown.",
    my: "ယခင်နှစ်များ၏ NASA MODIS အပင်စိမ်းလန်းမှု အချက်အလက် လုံလောက်စွာ မရရှိသဖြင့် NDVI နှိုင်းယှဉ်ချက် မပြပါ။",
  },
};

const FAIL = {
  en: "NASA MODIS vegetation data (NDVI) could not be retrieved, so vegetation greenness is not included.",
  my: "NASA MODIS အပင်စိမ်းလန်းမှု (NDVI) အချက်အလက်ကို မရယူနိုင်သဖြင့် ထည့်သွင်းမထားပါ။",
};

export async function buildVegetation(
  region: Region,
  lang: Lang,
  deps: { fetchImpl?: typeof fetch; timeoutMs: number; modisBaseUrl?: string; historyMode?: HistoryMode },
): Promise<VegetationEvidence> {
  try {
    // The chat never waits for the slow past-year requests; they are prepared in the background and cached.
    const s = await fetchNdviSummary(region.lat, region.lon, deps.timeoutMs, deps.fetchImpl, deps.modisBaseUrl, deps.historyMode ?? "cached-only");
    const facts = ndviFacts(s);
    if (!facts.length) return { facts, sources: [], notes: [FAIL[lang]], summary: s };
    const notes = [NOTE[lang](s)];
    if (s.historyStatus !== "ok") notes.push(HIST[s.historyStatus][lang]);
    return { facts, sources: [NDVI_SOURCE], notes, summary: s };
  } catch (err) {
    console.warn(`[earthlens-chat] MODIS NDVI: ${(err as Error).message}`);
    return { facts: [], sources: [], notes: [FAIL[lang]], summary: null };
  }
}
