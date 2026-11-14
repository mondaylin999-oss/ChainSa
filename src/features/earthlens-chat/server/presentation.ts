import "server-only";
import type { ActionCard, ConfidenceLevel, DataTable, DataTableRow, DecisionType, Fact, Lang, ParamKey } from "../types";
import type { Assessment } from "./climate/assessment";
import type { Topic } from "../params";

/**
 * Structured presentation built ONLY from NASA facts:
 * - a compact measurement table (latest value · typical past value · calculated difference)
 * - Evidence-Based Action Cards (rule-based; the AI never writes them, so it cannot invent evidence)
 */

type T = Record<Lang, string>;
const L = (t: T, lang: Lang) => t[lang];
const MM = "၀၁၂၃၄၅၆၇၈၉";
const myDigits = (s: string) => s.replace(/[0-9]/g, (d) => MM[Number(d)]);

export function whenText(f: Fact, lang: Lang): string {
  const s = f.date ?? (f.period ? (f.period.start === f.period.end ? f.period.start : `${f.period.start} → ${f.period.end}`) : "");
  return lang === "my" ? s : s;
}

const UNIT_SHORT: Record<string, string> = { "fraction (0–1)": "0–1", NDVI: "NDVI" };
const unit = (f: Fact) => UNIT_SHORT[f.unit] ?? f.unit;
const round = (v: number, d: number) => Number(v.toFixed(d));

interface RowSpec {
  param: ParamKey;
  label: T;
  latest: string[]; // first fact id that exists is used
  ref?: string;
  rank?: string;
  refLabel?: (a: Assessment, facts: Map<string, Fact>, lang: Lang) => string;
}

const medianLabel = (a: Assessment, _f: Map<string, Fact>, lang: Lang) => {
  const span = a.baseline ? `${a.baseline.firstYear}–${a.baseline.lastYear}` : "";
  return lang === "my" ? `အလယ်ကိန်း ${myDigits(span)}` : `median ${span}`;
};

const ROWS: Record<string, RowSpec> = {
  rainfall: { param: "rainfall", label: { en: "Rainfall, last 30 days", my: "မိုးရေချိန် (ပြီးခဲ့သော ရက် ၃၀)" }, latest: ["rain_30d"], ref: "rain_30d_ref", rank: "rain_30d_pct", refLabel: medianLabel },
  rainfall7: { param: "rainfall", label: { en: "Rainfall, last 7 days", my: "မိုးရေချိန် (ပြီးခဲ့သော ၇ ရက်)" }, latest: ["rain_total"] },
  soil: { param: "soilWetness", label: { en: "Root-zone soil wetness", my: "မြေဆီလွှာ စိုစွတ်မှု" }, latest: ["soil_latest"], ref: "soil_ref", rank: "soil_pct", refLabel: medianLabel },
  temperature: { param: "temperature", label: { en: "Hottest day, last 7 days", my: "အပူဆုံးနေ့ (ပြီးခဲ့သော ၇ ရက်)" }, latest: ["tmax_7d", "temp_max"], ref: "tmax_7d_ref", rank: "tmax_7d_pct", refLabel: medianLabel },
  humidity: { param: "humidity", label: { en: "Relative humidity (7-day mean)", my: "စိုထိုင်းဆ (၇ ရက် ပျမ်းမျှ)" }, latest: ["rh_mean"] },
  wind: { param: "wind", label: { en: "Wind speed at 10 m (7-day mean)", my: "၁၀ မီတာ လေတိုက်နှုန်း (၇ ရက် ပျမ်းမျှ)" }, latest: ["wind_mean"] },
  vegetation: {
    param: "vegetation", label: { en: "Vegetation greenness (MODIS NDVI)", my: "အပင် စိမ်းလန်းမှု (MODIS NDVI)" }, latest: ["ndvi_latest"], ref: "ndvi_hist_mean", rank: "ndvi_percentile",
    refLabel: (_a, f, lang) => {
      const m = /(\d{4}–\d{4})/.exec(f.get("ndvi_hist_mean")?.label ?? "");
      return lang === "my" ? `ပျမ်းမျှ ${myDigits(m?.[1] ?? "")}` : `mean ${m?.[1] ?? ""}`;
    },
  },
  fires: { param: "fires", label: { en: "Satellite fire detections", my: "ဂြိုဟ်တု မီးတွေ့ရှိချက်" }, latest: ["fires_count"] },
};

/** Which rows matter most for each kind of question (first rows win, max 4). */
const ORDER: Record<string, string[]> = {
  drought: ["rainfall", "soil", "vegetation", "temperature"],
  flood: ["rainfall", "rainfall7", "soil"],
  agriculture: ["rainfall", "soil", "temperature", "vegetation"],
  heat: ["temperature", "humidity", "soil"],
  water: ["rainfall", "soil"],
  electricity: ["rainfall", "soil"],
  disaster: ["rainfall", "rainfall7", "soil"],
  vegetation: ["vegetation", "rainfall", "soil"],
};

export function buildDataTable(facts: Fact[], a: Assessment, opts: { topics: Topic[]; decisions: DecisionType[]; asked: ParamKey[]; lang: Lang; maxRows?: number }): DataTable | null {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const order: string[] = [];
  const push = (k: string) => !order.includes(k) && order.push(k);
  // explicitly asked parameters first (e.g. "wind in Yangon")
  for (const p of opts.asked) {
    const k = p === "soilWetness" ? "soil" : p;
    if (ROWS[k] && ["wind", "humidity", "fires"].includes(k)) push(k);
  }
  for (const d of opts.decisions) (ORDER[d] ?? []).forEach(push);
  for (const t of opts.topics) (ORDER[t] ?? []).forEach(push);
  ["rainfall", "temperature", "soil", "humidity"].forEach(push);

  const rows: DataTableRow[] = [];
  for (const key of order) {
    if (rows.length >= (opts.maxRows ?? 4)) break;
    const spec = ROWS[key];
    if (key === "rainfall7" && rows.some((r) => r.param === "rainfall" && r.factIds.includes("rain_30d")) && !opts.topics.includes("flood") && !opts.decisions.includes("disaster")) continue;
    const latestFact = spec.latest.map((id) => byId.get(id)).find(Boolean);
    if (!latestFact) continue;
    const refFact = spec.ref ? byId.get(spec.ref) : undefined;
    // a reference only makes sense against the same kind of value (e.g. hottest day vs typical hottest day)
    const refOk = refFact && (spec.latest[0] === latestFact.id);
    const rankFact = spec.rank ? byId.get(spec.rank) : undefined;
    const d = latestFact.decimals;
    rows.push({
      param: spec.param,
      label: L(spec.label, opts.lang),
      // values are shown with each fact's own precision (e.g. NDVI 0.86, rainfall 265.7 mm)
      latest: { value: round(latestFact.value, d), unit: unit(latestFact), when: whenText(latestFact, opts.lang) },
      reference: refOk ? { value: round(refFact!.value, refFact!.decimals), unit: unit(refFact!), when: whenText(refFact!, opts.lang) } : null,
      referenceLabel: refOk && spec.refLabel ? spec.refLabel(a, byId, opts.lang) : null,
      difference: refOk ? { value: round(round(latestFact.value, d) - round(refFact!.value, refFact!.decimals), Math.max(d, refFact!.decimals)), unit: unit(latestFact) } : null,
      rank: refOk && rankFact ? rankFact.value : null,
      factIds: [latestFact.id, ...(refOk ? [refFact!.id] : []), ...(refOk && rankFact ? [rankFact.id] : [])],
    });
  }
  return rows.length ? { rows } : null;
}

/** Plain-text (Markdown) version of the table, used in `answer` and chat history. */
export function tableText(t: DataTable | null, lang: Lang): string {
  if (!t) return lang === "my" ? "NASA တိုင်းတာချက် မရရှိပါ။" : "No NASA measurements are available.";
  const h = lang === "my"
    ? "| ကိန်းရှင် | နောက်ဆုံး တန်ဖိုး | ယခင်နှစ်များ ပုံမှန် | ကွာခြားချက် |"
    : "| Parameter | Latest value | Typical in past years | Difference |";
  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const lines = t.rows.map((r) => {
    const latest = `${r.latest.value} ${r.latest.unit} (${r.latest.when})`;
    const ref = r.reference ? `${r.reference.value} ${r.reference.unit} (${r.referenceLabel ?? ""})` : "--";
    const diff = r.difference ? `${fmt(r.difference.value)} ${r.difference.unit}${r.rank !== null ? `, ${lang === "my" ? "အဆင့်" : "rank"} ${r.rank}` : ""}` : "--";
    return `| ${r.label} | ${latest} | ${ref} | ${diff} |`;
  });
  return [h, "|---|---|---|---|", ...lines].join("\n");
}

// ---------------------------------------------------------------- Action Cards

const DECISION_WORDS: Record<Exclude<DecisionType, "agriculture" | "vegetation">, RegExp> = {
  water: /water (supply|distribution|allocation|resources?|shortage)|reservoir|irrigat|\bdams?\b|canal|ရေလှောင်|ဆည်|ရေပေး|ရေဖြန့်|ရေသွင်း|ရေရှား/,
  electricity: /electric|power (supply|generation|plant|cut)|hydro ?power|hydro|energy|\bgrid\b|load shed|လျှပ်စစ်|ဓာတ်အား|မီးပျက်/,
  disaster: /evacuat|emergency|disaster|rescue|flood|ရွှေ့ပြောင်း|အရေးပေါ်|ဘေးအန္တရာယ်|ကယ်ဆယ်|ရေကြီး/,
  heat: /heat ?wave|heat|hot|အပူ/,
};

export function detectDecisions(text: string, topics: Topic[]): DecisionType[] {
  const t = text.toLowerCase();
  const out: DecisionType[] = [];
  for (const [k, re] of Object.entries(DECISION_WORDS)) if (re.test(t)) out.push(k as DecisionType);
  if (topics.includes("agriculture") && /farm|crop|rice|paddy|plant|harvest|seed|agri|လယ်|စပါး|သီးနှံ|စိုက်|ရိတ်/.test(t)) out.push("agriculture");
  return out;
}

const INSUFFICIENT: T = {
  en: "Insufficient evidence to generate a reliable action recommendation.",
  my: "ယုံကြည်စိတ်ချရသော လုပ်ဆောင်ချက် အကြံပြုချက် ပေးရန် အထောက်အထား မလုံလောက်ပါ။",
};

const LEVEL_TEXT: Record<ConfidenceLevel, T> = {
  high: { en: "High", my: "မြင့်" },
  moderate: { en: "Moderate", my: "အလယ်အလတ်" },
  low: { en: "Low", my: "နိမ့်" },
  insufficient: { en: "Insufficient Evidence", my: "အထောက်အထား မလုံလောက်" },
};
export const confidenceLabel = (l: ConfidenceLevel, lang: Lang) => L(LEVEL_TEXT[l], lang);

interface CardCtx {
  facts: Map<string, Fact>;
  a: Assessment;
  lang: Lang;
  today: string;
}

const daysOld = (date: string | undefined, today: string) => (date ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000) : Infinity);

/**
 * Confidence = strength of the evidence (how many independent historical comparisons agree, how fresh
 * the data is, and whether the decision needs local operational data that NASA cannot provide).
 * It is a category, never a probability.
 */
function confidence(c: CardCtx, comparisons: string[], kind: DecisionType, missing: T): ActionCard["confidence"] {
  const n = comparisons.filter((id) => c.facts.has(id)).length;
  const fresh = daysOld(c.a.latestDate, c.today) <= 14;
  const highImpact = kind === "water" || kind === "disaster" || kind === "electricity";
  let level: ConfidenceLevel;
  if (n === 0) level = "insufficient";
  else if (kind === "electricity") level = "low"; // weather data cannot show electricity supply or demand
  else if (n >= 2 && fresh && !highImpact) level = "high";
  else if (n >= 2 || (n === 1 && !highImpact && fresh)) level = "moderate";
  else level = "low";
  const why: T =
    level === "insufficient"
      ? { en: "no historical comparison could be calculated from NASA data", my: "NASA အချက်အလက်မှ ယခင်နှစ်များနှင့် နှိုင်းယှဉ်ချက် မတွက်ချက်နိုင်ပါ" }
      : n >= 2
        ? { en: `${n} independent NASA comparisons point the same way${fresh ? "" : ", but the latest data is more than two weeks old"}`, my: `NASA နှိုင်းယှဉ်ချက် ${myDigits(String(n))} ခု တူညီစွာ ညွှန်ပြသည်${fresh ? "" : "၊ သို့သော် နောက်ဆုံး အချက်အလက်သည် နှစ်ပတ်ထက် ပိုဟောင်းနေသည်"}` }
        : { en: "only one NASA comparison supports it", my: "NASA နှိုင်းယှဉ်ချက် တစ်ခုတည်းသာ ထောက်ခံသည်" };
  const reason = lang(c) === "my" ? `${L(LEVEL_TEXT[level], "my")} — ${why.my}${highImpact || level !== "high" ? `၊ ${missing.my}` : ""}။` : `${L(LEVEL_TEXT[level], "en")} — ${why.en}${highImpact || level !== "high" ? `; ${missing.en}` : ""}.`;
  return { level, reason };
}
const lang = (c: CardCtx) => c.lang;

/** "Last-30-day rainfall 120 mm vs typical 80 mm (rank 85)" built from facts only. */
function compare(c: CardCtx, latestId: string, refId: string, rankId: string | null, name: T): string | null {
  const f = c.facts.get(latestId);
  if (!f) return null;
  const ref = c.facts.get(refId);
  const rank = rankId ? c.facts.get(rankId) : undefined;
  const u = unit(f);
  const v = (x: Fact) => round(x.value, x.decimals); // each value with its own precision
  if (c.lang === "my")
    return `${name.my} ${v(f)} ${u}${ref ? `၊ ပုံမှန် ${v(ref)} ${unit(ref)}` : ""}${rank ? ` (အဆင့် ${rank.value})` : ""}`;
  return `${name.en} ${v(f)} ${u}${ref ? ` vs typical ${v(ref)} ${unit(ref)}` : ""}${rank ? ` (rank ${rank.value} of 100)` : ""}`;
}

function observed(c: CardCtx, parts: (string | null)[]): string | null {
  const p = parts.filter((x): x is string => !!x);
  if (!p.length) return null;
  return c.lang === "my" ? `${p.join("၊ ")}။` : `${p.join("; ")}.`;
}

const RAIN: T = { en: "Last-30-day rainfall", my: "ပြီးခဲ့သော ရက် ၃၀ မိုးရေချိန်" };
const SOIL: T = { en: "root-zone soil wetness", my: "မြေဆီလွှာ စိုစွတ်မှု" };
const HOT: T = { en: "hottest day of the last 7 days", my: "ပြီးခဲ့သော ၇ ရက်၏ အပူဆုံးနေ့" };
const NDVI: T = { en: "vegetation greenness (NDVI)", my: "အပင် စိမ်းလန်းမှု (NDVI)" };

const rainObs = (c: CardCtx) => compare(c, "rain_30d", "rain_30d_ref", "rain_30d_pct", RAIN);
const soilObs = (c: CardCtx) => compare(c, "soil_latest", "soil_ref", "soil_pct", SOIL);

/**
 * `topics` must be the topics the question actually names (not the default "all topics"). When the
 * question names no topic or decision ("general"), cards are only made for unusual conditions in the data.
 */
export function buildActionCards(o: { facts: Fact[]; a: Assessment; topics: Topic[]; decisions: DecisionType[]; lang: Lang; today: string; focused?: boolean }): { cards: ActionCard[]; note: string | null } {
  const c: CardCtx = { facts: new Map(o.facts.map((f) => [f.id, f])), a: o.a, lang: o.lang, today: o.today };
  const t = (x: T) => L(x, o.lang);
  const cards: ActionCard[] = [];
  const dry = o.a.drought === "watch" || o.a.drought === "warning";
  const wet = o.a.wet === "watch";
  const want = (k: DecisionType) => o.decisions.includes(k);
  const refs = (ids: string[]) => ids.filter((id) => c.facts.has(id));
  // "general" = the question has no topic, decision or specific parameter (e.g. "conditions in Bago?").
  const general = !o.topics.length && !o.decisions.length && !o.focused;

  // ---- Agriculture / crops ----
  if (want("agriculture") || o.topics.includes("agriculture") || (o.topics.includes("drought") && !want("water")) || (general && dry)) {
    const obs = observed(c, [rainObs(c), soilObs(c), compare(c, "ndvi_latest", "ndvi_hist_mean", "ndvi_percentile", NDVI)]);
    const comps = ["rain_30d_pct", "soil_pct", "ndvi_percentile"];
    if (obs && refs(comps).length) {
      cards.push({
        id: "agriculture", decisionType: "agriculture",
        title: t({ en: "Crops and field work", my: "သီးနှံနှင့် လယ်ယာလုပ်ငန်း" }),
        observedChange: obs,
        potentialImpact: t(dry
          ? { en: "Soils are drier than usual, so rain-fed crops may face water stress, especially at sensitive growth stages.", my: "မြေဆီလွှာ ပုံမှန်ထက် ခြောက်သွေ့သဖြင့် မိုးရေကိုသာ မှီခိုသော သီးနှံများ အထူးသဖြင့် အရေးကြီးသော ကြီးထွားမှုအဆင့်တွင် ရေငတ်ဒဏ် ခံရနိုင်သည်။" }
          : wet
            ? { en: "Wetter-than-usual conditions may cause waterlogging and make field work or harvesting harder.", my: "ပုံမှန်ထက် စိုစွတ်သဖြင့် ရေဝပ်ခြင်း ဖြစ်နိုင်ပြီး လယ်ယာလုပ်ငန်း သို့မဟုတ် ရိတ်သိမ်းခြင်း ခက်ခဲနိုင်သည်။" }
            : { en: "The data shows no unusual moisture stress, but conditions can differ from field to field.", my: "အချက်အလက်တွင် ပုံမှန်မဟုတ်သော စိုထိုင်းမှု ပြဿနာ မတွေ့ရသော်လည်း လယ်ကွက်အလိုက် ကွာခြားနိုင်သည်။" }),
        suggestedOptions: (dry
          ? [{ en: "Consider giving available irrigation to crops at flowering or grain-filling first.", my: "ရရှိနိုင်သော ဆည်ရေကို ပန်းပွင့်ချိန် သို့မဟုတ် အစေ့လောင်းချိန် သီးနှံများကို ဦးစားပေးရန် စဉ်းစားပါ။" },
             { en: "Consider delaying new sowing until soil moisture has been checked in the field.", my: "လယ်ကွင်းတွင် မြေစိုထိုင်းဆ စစ်ဆေးပြီးမှ မျိုးစေ့ချရန် စဉ်းစားပါ။" }]
          : wet
            ? [{ en: "Check and clear field drainage.", my: "လယ်ကွင်း ရေထုတ်မြောင်းများ စစ်ဆေး ရှင်းလင်းပါ။" },
               { en: "Consider postponing fertiliser if heavy rain is forecast by DMH.", my: "DMH က မိုးသည်းမည်ဟု ခန့်မှန်းပါက မြေသြဇာ ကျွေးခြင်းကို ရွှေ့ဆိုင်းရန် စဉ်းစားပါ။" }]
            : [{ en: "Continue routine monitoring and check field moisture before key operations.", my: "ပုံမှန် စောင့်ကြည့်ပြီး အရေးကြီး လုပ်ငန်းမတိုင်မီ လယ်ကွင်း စိုထိုင်းဆ စစ်ဆေးပါ။" }]).map(t),
        evidenceNeeded: [
          { en: "Crop type and growth stage", my: "သီးနှံ အမျိုးအစားနှင့် ကြီးထွားမှု အဆင့်" },
          { en: "Soil moisture measured in the field", my: "လယ်ကွင်းတွင် တိုင်းတာထားသော မြေစိုထိုင်းဆ" },
          { en: "Irrigation water actually available", my: "အမှန်တကယ် ရရှိနိုင်သော ဆည်ရေ" },
          { en: "Official DMH weather forecast", my: "DMH တရားဝင် ရာသီဥတု ခန့်မှန်းချက်" },
        ].map(t),
        confidence: confidence(c, comps, "agriculture", { en: "crop type, growth stage and field measurements are not known", my: "သီးနှံ အမျိုးအစား၊ ကြီးထွားမှုအဆင့်နှင့် လယ်ကွင်း တိုင်းတာချက်များ မသိရပါ" }),
        evidenceRefs: refs(["rain_30d", "rain_30d_ref", "rain_30d_pct", "soil_latest", "soil_ref", "soil_pct", "ndvi_latest", "ndvi_hist_mean", "ndvi_percentile"]),
      });
    }
  }

  // ---- Water distribution ----
  if (want("water") || (dry && o.topics.includes("drought"))) {
    const obs = observed(c, [rainObs(c), compare(c, "rain_90d", "rain_90d_ref", "rain_90d_pct", { en: "last-90-day rainfall", my: "ပြီးခဲ့သော ရက် ၉၀ မိုးရေချိန်" }), soilObs(c)]);
    const comps = ["rain_30d_pct", "rain_90d_pct", "soil_pct"];
    if (obs && refs(comps).length) {
      cards.push({
        id: "water", decisionType: "water",
        title: t({ en: "Water distribution", my: "ရေဖြန့်ဝေမှု" }),
        observedChange: obs,
        potentialImpact: t(dry
          ? { en: "Less rain than usual may reduce inflow to ponds and reservoirs, so water for farming could become more limited.", my: "မိုးနည်းခြင်းကြောင့် ကန်နှင့် ရေလှောင်ကန်များသို့ ရေဝင်နည်းနိုင်ပြီး စိုက်ပျိုးရေးအတွက် ရေ ပိုရှားနိုင်သည်။" }
          : { en: "Rainfall does not indicate a water shortage, but rainfall alone cannot show how much water is actually stored.", my: "မိုးရေချိန်အရ ရေရှားပါးမှု မညွှန်ပြသော်လည်း မိုးရေချိန်တစ်ခုတည်းဖြင့် အမှန်တကယ် သိုလှောင်ထားသော ရေပမာဏကို မသိနိုင်ပါ။" }),
        suggestedOptions: [
          { en: "Review local reservoir and water-storage levels.", my: "ဒေသတွင်း ရေလှောင်ကန်နှင့် ရေသိုလှောင်မှု အဆင့်များကို ပြန်လည်စစ်ဆေးပါ။" },
          { en: "Reassess distribution schedules only after checking stored water and demand.", my: "သိုလှောင်ရေနှင့် လိုအပ်ချက်ကို စစ်ဆေးပြီးမှသာ ရေဖြန့်ဝေမှု အချိန်ဇယားကို ပြန်လည်သုံးသပ်ပါ။" },
          { en: "Keep monitoring rainfall updates before making operational changes.", my: "လုပ်ငန်းဆိုင်ရာ ပြောင်းလဲမှု မပြုမီ မိုးရေချိန် အချက်အလက်များကို ဆက်လက် စောင့်ကြည့်ပါ။" },
        ].map(t),
        evidenceNeeded: [
          { en: "Reservoir storage levels", my: "ရေလှောင်ကန် သိုလှောင်မှု အဆင့်" },
          { en: "River water levels", my: "မြစ်ရေ အမြင့်" },
          { en: "Irrigation demand", my: "ဆည်ရေ လိုအပ်ချက်" },
          { en: "Local rain-gauge observations", my: "ဒေသတွင်း မိုးချိန်ခွက် တိုင်းတာချက်" },
          { en: "Local operational constraints", my: "ဒေသတွင်း လုပ်ငန်းဆိုင်ရာ ကန့်သတ်ချက်များ" },
        ].map(t),
        confidence: confidence(c, comps, "water", { en: "reservoir, river and demand data are not available, and NASA rainfall alone cannot decide water allocation", my: "ရေလှောင်ကန်၊ မြစ်ရေနှင့် လိုအပ်ချက် အချက်အလက် မရှိပါ၊ NASA မိုးရေချိန်တစ်ခုတည်းဖြင့် ရေခွဲဝေမှုကို ဆုံးဖြတ်၍ မရပါ" }),
        evidenceRefs: refs(["rain_30d", "rain_30d_ref", "rain_30d_pct", "rain_90d", "rain_90d_ref", "rain_90d_pct", "soil_latest", "soil_ref", "soil_pct"]),
      });
    }
  }

  // ---- Flood / disaster ----
  if (want("disaster") || o.topics.includes("flood") || (general && wet)) {
    const heavy = c.facts.get("heavy_threshold");
    const maxDay = c.facts.get("rain_max_day");
    const heavyPart = heavy && maxDay
      ? t({ en: `wettest recent day ${maxDay.value} mm/day (${maxDay.date}) vs very-heavy threshold ${heavy.value} mm/day`, my: `မကြာသေးမီ မိုးအများဆုံးနေ့ ${maxDay.value} mm/day (${maxDay.date})၊ အလွန်ပြင်းထန် သတ်မှတ်ချက် ${heavy.value} mm/day` })
      : null;
    const obs = observed(c, [rainObs(c), soilObs(c), heavyPart]);
    const comps = ["rain_30d_pct", "soil_pct", ...(heavyPart ? ["heavy_threshold"] : [])];
    if (obs && refs(comps).length) {
      cards.push({
        id: "flood", decisionType: "disaster",
        title: t({ en: "Flood preparedness", my: "ရေကြီးမှု ကြိုတင်ပြင်ဆင်ခြင်း" }),
        observedChange: obs,
        potentialImpact: t(wet
          ? { en: "Wet soils and heavy rain make local flooding and waterlogging possible; this is not an official warning.", my: "စိုစွတ်သော မြေနှင့် မိုးသည်းမှုကြောင့် ဒေသတွင်း ရေကြီးခြင်း၊ ရေဝပ်ခြင်း ဖြစ်နိုင်သည်။ ဤအချက်သည် တရားဝင် သတိပေးချက် မဟုတ်ပါ။" }
          : { en: "Rainfall data does not show an unusual flood signal, but river floods can come from rain far upstream.", my: "မိုးရေချိန်တွင် ပုံမှန်မဟုတ်သော ရေကြီးမှု အချက်ပြ မတွေ့ရသော်လည်း မြစ်ရေကြီးမှုသည် အထက်ပိုင်း မိုးကြောင့် ဖြစ်နိုင်သည်။" }),
        suggestedOptions: [
          { en: "Follow official DMH and local authority warnings; this assistant cannot issue evacuation orders.", my: "DMH နှင့် ဒေသဆိုင်ရာ အာဏာပိုင်များ၏ တရားဝင် သတိပေးချက်များကို လိုက်နာပါ။ ဤလက်ထောက်သည် ရွှေ့ပြောင်းရန် အမိန့် မထုတ်နိုင်ပါ။" },
          { en: "Check drainage and keep emergency supplies ready.", my: "ရေထုတ်မြောင်းများ စစ်ဆေးပြီး အရေးပေါ် ပစ္စည်းများ အသင့်ထားပါ။" },
        ].map(t),
        evidenceNeeded: [
          { en: "Official DMH flood and weather warnings", my: "DMH တရားဝင် ရေကြီးမှုနှင့် ရာသီဥတု သတိပေးချက်များ" },
          { en: "River levels and flood-gauge readings", my: "မြစ်ရေ အမြင့်နှင့် ရေကြီးမှု တိုင်းတာချက်များ" },
          { en: "Local reports from the area", my: "ဒေသတွင်း သတင်းများ" },
          { en: "How recent and how local the data is", my: "အချက်အလက် မည်မျှ လတ်ဆတ်ပြီး မည်မျှ ဒေသနှင့် သက်ဆိုင်သည်" },
        ].map(t),
        confidence: confidence(c, comps, "disaster", { en: "river levels and official warnings are not included, so this is not an official warning", my: "မြစ်ရေအမြင့်နှင့် တရားဝင် သတိပေးချက်များ မပါဝင်သဖြင့် တရားဝင် သတိပေးချက် မဟုတ်ပါ" }),
        evidenceRefs: refs(["rain_30d", "rain_30d_ref", "rain_30d_pct", "soil_latest", "soil_ref", "soil_pct", "rain_max_day", "heavy_threshold"]),
      });
    }
  }

  // ---- Electricity / hydropower ----
  if (want("electricity")) {
    const obs = observed(c, [compare(c, "rain_90d", "rain_90d_ref", "rain_90d_pct", { en: "Last-90-day rainfall", my: "ပြီးခဲ့သော ရက် ၉၀ မိုးရေချိန်" }), rainObs(c)]);
    const comps = ["rain_90d_pct", "rain_30d_pct"];
    if (obs && refs(comps).length) {
      cards.push({
        id: "electricity", decisionType: "electricity",
        title: t({ en: "Electricity and hydropower", my: "လျှပ်စစ်နှင့် ရေအားလျှပ်စစ်" }),
        observedChange: obs,
        potentialImpact: t({ en: "Rainfall affects reservoir inflow for hydropower, but NASA weather data cannot show electricity demand, generation or grid conditions.", my: "မိုးရေချိန်သည် ရေအားလျှပ်စစ် ရေလှောင်ကန်သို့ ရေဝင်မှုကို သက်ရောက်သော်လည်း NASA ရာသီဥတု အချက်အလက်ဖြင့် လျှပ်စစ် လိုအပ်ချက်၊ ထုတ်လုပ်မှု သို့မဟုတ် ဓာတ်အားလိုင်း အခြေအနေကို မပြနိုင်ပါ။" }),
        suggestedOptions: [
          { en: "Discuss reservoir inflow trends with hydropower operators before any planning change.", my: "စီမံကိန်း မပြောင်းလဲမီ ရေအားလျှပ်စစ် လုပ်ငန်းရှင်များနှင့် ရေဝင်မှု အခြေအနေကို ဆွေးနွေးပါ။" },
          { en: "Use this rainfall comparison only as background information.", my: "ဤမိုးရေချိန် နှိုင်းယှဉ်ချက်ကို နောက်ခံ အချက်အလက်အဖြစ်သာ အသုံးပြုပါ။" },
        ].map(t),
        evidenceNeeded: [
          { en: "Actual electricity demand", my: "အမှန်တကယ် လျှပ်စစ် လိုအပ်ချက်" },
          { en: "Power generation capacity", my: "ဓာတ်အား ထုတ်လုပ်နိုင်မှု" },
          { en: "Reservoir and hydropower operating data", my: "ရေလှောင်ကန်နှင့် ရေအားလျှပ်စစ် လုပ်ငန်း အချက်အလက်" },
          { en: "Grid conditions", my: "ဓာတ်အားလိုင်း အခြေအနေ" },
          { en: "Local operational data", my: "ဒေသတွင်း လုပ်ငန်းဆိုင်ရာ အချက်အလက်" },
        ].map(t),
        confidence: confidence(c, comps, "electricity", { en: "demand, generation and reservoir operating data are not available", my: "လိုအပ်ချက်၊ ထုတ်လုပ်မှုနှင့် ရေလှောင်ကန် လုပ်ငန်း အချက်အလက် မရှိပါ" }),
        evidenceRefs: refs(["rain_90d", "rain_90d_ref", "rain_90d_pct", "rain_30d", "rain_30d_ref", "rain_30d_pct"]),
      });
    }
  }

  // ---- Heat ----
  if (want("heat") || (general && o.a.heat === "unusual")) {
    const obs = observed(c, [compare(c, "tmax_7d", "tmax_7d_ref", "tmax_7d_pct", HOT)]);
    const comps = ["tmax_7d_pct"];
    if (obs && refs(comps).length) {
      cards.push({
        id: "heat", decisionType: "heat",
        title: t({ en: "Heat", my: "အပူ" }),
        observedChange: obs,
        potentialImpact: t(o.a.heat === "unusual"
          ? { en: "Unusual heat may stress crops, livestock and outdoor workers and raise water demand.", my: "ပုံမှန်မဟုတ်သော အပူသည် သီးနှံ၊ တိရစ္ဆာန်နှင့် ပြင်ပလုပ်သားများကို ဒဏ်ခံစေပြီး ရေလိုအပ်ချက် တိုးစေနိုင်သည်။" }
          : { en: "Temperatures are within the usual range for the season.", my: "အပူချိန်သည် ဤရာသီ၏ ပုံမှန်အတိုင်းအတာအတွင်း ရှိသည်။" }),
        suggestedOptions: (o.a.heat === "unusual"
          ? [{ en: "Consider shifting outdoor work and watering to early morning or evening.", my: "ပြင်ပအလုပ်နှင့် ရေလောင်းခြင်းကို နံနက်စောစော သို့မဟုတ် ညနေပိုင်းသို့ ရွှေ့ရန် စဉ်းစားပါ။" },
             { en: "Make sure people and animals have shade and drinking water.", my: "လူနှင့် တိရစ္ဆာန်များအတွက် အရိပ်နှင့် သောက်ရေ ရှိစေပါ။" }]
          : [{ en: "No special heat measures are indicated by the data; keep following DMH updates.", my: "အချက်အလက်အရ အထူး အပူကာကွယ်ရေး မလိုအပ်သော်လည်း DMH သတင်းများကို ဆက်လက် လိုက်နာပါ။" }]).map(t),
        evidenceNeeded: [
          { en: "Local temperature readings", my: "ဒေသတွင်း အပူချိန် တိုင်းတာချက်" },
          { en: "Official heat advisories", my: "တရားဝင် အပူ သတိပေးချက်များ" },
        ].map(t),
        confidence: confidence(c, comps, "heat", { en: "it is based on one grid point, not local thermometers", my: "ဒေသတွင်း သာမိုမီတာ မဟုတ်ဘဲ ဂရစ်အမှတ် တစ်ခုအပေါ် အခြေခံသည်" }),
        evidenceRefs: refs(["tmax_7d", "tmax_7d_ref", "tmax_7d_pct"]),
      });
    }
  }

  const relevant = cards.slice(0, 3);
  return { cards: relevant, note: relevant.length ? null : t(INSUFFICIENT) };
}

/** Plain-text version of the cards for `answer` and chat history. */
export function cardsText(cards: ActionCard[], note: string | null, lang: Lang): string {
  if (!cards.length) return note ?? "";
  const lab = lang === "my"
    ? { obs: "တွေ့ရှိထားသော ပြောင်းလဲမှု", imp: "ဖြစ်နိုင်သော သက်ရောက်မှု", opt: "စဉ်းစားနိုင်သော လုပ်ဆောင်ချက်များ", ev: "ထပ်မံလိုအပ်သော အထောက်အထား", conf: "ယုံကြည်စိတ်ချရမှု", card: "လုပ်ဆောင်ချက် ကတ်" }
    : { obs: "Observed change", imp: "Potential impact", opt: "Suggested options", ev: "Evidence needed", conf: "Confidence", card: "ACTION CARD" };
  return cards
    .map((k) => [
      `${lab.card} — ${k.title}`,
      `${lab.obs}: ${k.observedChange}`,
      `${lab.imp}: ${k.potentialImpact}`,
      `${lab.opt}:`, ...k.suggestedOptions.map((s) => `• ${s}`),
      `${lab.ev}:`, ...k.evidenceNeeded.map((s) => `• ${s}`),
      `${lab.conf}: ${k.confidence.reason}`,
    ].join("\n"))
    .join("\n\n");
}
