import type { Lang, ParamKey } from "./types";

export interface ParamInfo {
  key: ParamKey;
  label: string;
  labelMy: string;
  /** NASA POWER daily parameter codes; empty for FIRMS. */
  powerCodes: string[];
}

// Labels (English + Myanmar) copied from the EarthLens demo parameter catalogue.
export const PARAMS: Record<ParamKey, ParamInfo> = {
  rainfall: { key: "rainfall", label: "Rainfall", labelMy: "မိုးရေချိန်", powerCodes: ["PRECTOTCORR"] },
  temperature: { key: "temperature", label: "Temperature", labelMy: "အပူချိန်", powerCodes: ["T2M", "T2M_MAX", "T2M_MIN"] },
  humidity: { key: "humidity", label: "Humidity", labelMy: "စိုထိုင်းဆ", powerCodes: ["RH2M"] },
  wind: { key: "wind", label: "Wind conditions", labelMy: "လေတိုက်နှုန်း", powerCodes: ["WS10M", "WS10M_MAX"] },
  soilWetness: { key: "soilWetness", label: "Root-zone soil wetness", labelMy: "မြေဆီလွှာ စိုစွတ်မှု", powerCodes: ["GWETROOT"] },
  fires: { key: "fires", label: "Satellite-detected fires", labelMy: "ဂြိုဟ်တုမှ တွေ့ရှိသော မီးလောင်မှု", powerCodes: [] },
  vegetation: { key: "vegetation", label: "Vegetation greenness (MODIS NDVI)", labelMy: "အပင် စိမ်းလန်းမှု (MODIS NDVI)", powerCodes: [] },
};

const FARM = /farm|crop|rice|paddy|လယ်|စပါး/;
const COAST = /fish|boat|sea|coast|ငါး|လှေ/;

/** Which NASA parameters a question needs. Rules copied from the demo, with SMAP/flood removed. */
export function detectParams(text: string): ParamKey[] {
  const t = text.toLowerCase();
  const s = new Set<ParamKey>();
  if (/rain|precip|wet|monsoon|မိုး/.test(t)) s.add("rainfall");
  if (/temp|heat|hot|cold|warm|အပူ/.test(t)) s.add("temperature");
  if (/humid|moist air|စိုထိုင်း/.test(t)) s.add("humidity");
  // Bare "လေ" is not used: it also appears inside "မန္တလေး" (Mandalay).
  if (/wind|gust|storm|လေတိုက်|လေပြင်း|လေနှုန်း|မုန်တိုင်း/.test(t)) s.add("wind");
  if (/soil|drought|dry|မြေ/.test(t)) s.add("soilWetness");
  if (/fire|burn|smoke|hotspot|မီး/.test(t)) s.add("fires");
  if (/vegetation|ndvi|green|crop|plant|forest|harvest|paddy|rice|farm|agri|seed|drought|လယ်|စိုက်|အပင်|သစ်ပင်|စိမ်း|သီးနှံ|စပါး|သစ်တော|မိုးခေါင်/.test(t)) s.add("vegetation");
  if (!s.size) {
    if (COAST.test(t)) { s.add("rainfall"); s.add("wind"); }
    else { s.add("rainfall"); s.add("temperature"); s.add("humidity"); }
  }
  if (FARM.test(t)) { s.add("rainfall"); s.add("temperature"); }
  if (COAST.test(t)) s.add("wind");
  return [...s];
}

export function audienceOf(text: string): "farmers" | "coastal" | "general" {
  const t = text.toLowerCase();
  return FARM.test(t) ? "farmers" : COAST.test(t) ? "coastal" : "general";
}

/** Question-specific limitations (from the demo), in both languages. */
export function detectLimitations(text: string, regionId: string, lang: Lang): string[] {
  const t = text.toLowerCase();
  const out: { en: string; my: string }[] = [];
  if (/forecast|tomorrow|next (week|days?)|will it|going to rain|upcoming|မနက်ဖြန်|ခန့်မှန်း/.test(t))
    out.push({
      en: "I only have recent NASA observations, not forecasts. For upcoming weather, check the Department of Meteorology and Hydrology (DMH) forecast.",
      my: "ကျွန်ုပ်တွင် မကြာသေးမီက နာဆာ တိုင်းတာချက်များသာ ရှိပြီး ရာသီဥတု ခန့်မှန်းချက် မရှိပါ။ လာမည့် ရာသီဥတုအတွက် မိုးလေဝသနှင့် ဇလဗေဒ ဦးစီးဌာန (DMH) ၏ ခန့်မှန်းချက်ကို ကြည့်ပါ။",
    });
  if (/wave|tide|sea state|swell|current|cyclone|storm surge|safe to (fish|go)|လှိုင်း|ဒီရေ|မုန်တိုင်း|ပင်လယ်ထွက်/.test(t))
    out.push({
      en: "Wave height, tides, sea state and cyclone warnings are not in the integrated NASA data. Land-grid wind measurements alone cannot show whether the sea is safe — follow DMH marine warnings.",
      my: "လှိုင်းအမြင့်၊ ဒီရေ၊ ပင်လယ်အခြေအနေနှင့် မုန်တိုင်းသတိပေးချက်များ ဤနာဆာ အချက်အလက်တွင် မပါဝင်ပါ။ လေတိုက်နှုန်းတစ်ခုတည်းဖြင့် ပင်လယ်ထွက်ရန် လုံခြုံမလုံခြုံ မဆုံးဖြတ်နိုင်ပါ — DMH ၏ ပင်လယ်ပြင် သတိပေးချက်များကို လိုက်နာပါ။",
    });
  if (/flood|ရေကြီး/.test(t))
    out.push({
      en: "River-level and flood forecasts are not integrated yet; flood risk is described from rainfall and soil wetness only.",
      my: "မြစ်ရေမျက်နှာပြင်နှင့် ရေကြီးမှု ခန့်မှန်းချက်များ မထည့်သွင်းရသေးပါ။ ရေကြီးနိုင်ခြေကို မိုးရေချိန်နှင့် မြေစိုစွတ်မှုမှသာ ဖော်ပြထားပါသည်။",
    });
  if (/soil moisture|smap/.test(t))
    out.push({
      en: "SMAP satellite soil moisture is not integrated yet; I can only use NASA POWER's modelled root-zone soil wetness.",
      my: "SMAP ဂြိုဟ်တု မြေစိုထိုင်းဆ မထည့်သွင်းရသေးပါ။ NASA POWER ၏ မော်ဒယ်ဖြင့် တွက်ချက်ထားသော မြေဆီလွှာ စိုစွတ်မှုကိုသာ အသုံးပြုနိုင်ပါသည်။",
    });
  if (regionId === "naypyidaw")
    out.push({
      en: "Naypyidaw data comes from one grid point near the capital.",
      my: "နေပြည်တော် အချက်အလက်သည် မြို့တော်အနီးရှိ ဂရစ်အမှတ် တစ်ခုမှ ဖြစ်ပါသည်။",
    });
  return out.map((o) => o[lang]);
}

export type Topic = "drought" | "flood" | "agriculture";

/** The three priority topics. Questions about none of them still get all three, agriculture first. */
export function detectTopics(text: string): Topic[] {
  const t = text.toLowerCase();
  const out: Topic[] = [];
  if (/drought|dry|water shortage|irrigat|မိုးခေါင်|ခြောက်သွေ့|ရေရှား/.test(t)) out.push("drought");
  if (/flood|inundat|heavy rain|waterlog|ရေကြီး|ရေလျှံ|ရေဝပ်|မိုးသည်း/.test(t)) out.push("flood");
  if (/farm|crop|rice|paddy|plant|harvest|seed|agri|လယ်|စပါး|သီးနှံ|စိုက်|ရိတ်/.test(t)) out.push("agriculture");
  return out.length ? out : ["agriculture", "drought", "flood"];
}

// Earth/environment vocabulary (English + Myanmar). Used to decide between the eight-section
// NASA answer and a short general answer that must not invent environmental analysis.
const ENV_WORDS =
  /vegetation|ndvi|greenness|weather|climate|rain|precip|monsoon|temperat|heat|hot|cold|humid|wind|storm|cyclone|drought|dry|flood|water|river|irrigat|soil|crop|farm|rice|paddy|plant|harvest|seed|agri|fish|fire|smoke|burn|forest|environment|pollut|air quality|nasa|satellite|season|forecast|outlook|risk|မိုး|ရာသီ|အပူ|အအေး|စိုထိုင်း|လေတိုက်|မုန်တိုင်း|ခြောက်သွေ့|ရေကြီး|ရေလျှံ|ရေ|မြစ်|ဆည်|မြေ|သီးနှံ|လယ်|စပါး|စိုက်|ရိတ်|ငါး|မီး|သစ်တော|ပတ်ဝန်းကျင်/;

export function isEnvironmentalQuestion(text: string, regionMentioned: boolean): boolean {
  return regionMentioned || ENV_WORDS.test(text.toLowerCase());
}
