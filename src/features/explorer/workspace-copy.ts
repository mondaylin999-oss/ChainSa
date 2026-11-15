import type { Lang } from "../earthlens-chat/types";
import type { TopicId } from "./catalog";
import type { SpatialKind } from "./spatial-basis";

/** Presentation copy only: provider metadata and scientific calculations remain authoritative. */
export function workspaceText(lang: Lang, en: string, my: string): string {
  return lang === "my" ? my : en;
}

type Bilingual = readonly [en: string, my: string];
interface IndicatorCopy { name: Bilingual; description: Bilingual }

/** All 36 dataset IDs in the current catalog (37 topic entries, including a night-light alias). */
export const INDICATOR_COPY = {
  rainfall: { name: ["Rainfall", "မိုးရေချိန်"], description: ["Daily corrected rainfall at the selected reference point.", "ရွေးထားသော ကိုယ်စားပြုနေရာ၏ နေ့စဉ် ပြင်ဆင်တွက်ချက်ထားသော မိုးရေချိန်။"] },
  "disaster-rainfall": { name: ["Precipitation", "မိုးရေချိန်"], description: ["Daily rainfall for flood context; rainfall alone does not confirm flooding.", "ရေကြီးမှုကို သုံးသပ်ရန် နေ့စဉ်မိုးရေချိန်။ မိုးများခြင်းတစ်ခုတည်းက ရေကြီးကြောင်း မအတည်ပြုပါ။"] },
  "water-rainfall": { name: ["Precipitation", "မိုးရေချိန်"], description: ["Daily rainfall for water context; not river flow or stored water.", "ရေအခြေအနေကို သုံးသပ်ရန် နေ့စဉ်မိုးရေချိန်။ မြစ်ရေစီးနှုန်း သို့မဟုတ် သိုလှောင်ရေပမာဏ မဟုတ်ပါ။"] },
  "root-zone-wetness": { name: ["Soil moisture", "အမြစ်ဇုန် မြေဆီလွှာစိုစွတ်မှု"], description: ["Modelled root-zone wetness from 0 to 1; not a field measurement.", "မော်ဒယ်ဖြင့် ခန့်မှန်းသော အမြစ်ဇုန်စိုစွတ်မှု (၀ မှ ၁)။ လယ်ကွင်းတွင် တိုင်းတာထားခြင်း မဟုတ်ပါ။"] },
  "air-temperature": { name: ["Air temperature", "လေထုအပူချိန်"], description: ["Daily mean air temperature at 2 metres above ground.", "မြေပြင်အထက် ၂ မီတာရှိ နေ့စဉ်ပျမ်းမျှ လေထုအပူချိန်။"] },
  "agriculture-vegetation-index": { name: ["Vegetation greenness", "အပင်ဖုံးလွှမ်းမှု စိမ်းလန်းညွှန်းကိန်း"], description: ["MODIS NDVI in 16-day composites near the point; not crop yield.", "ကိုယ်စားပြုနေရာအနီး MODIS NDVI ၁၆ ရက်ပေါင်းစည်းဒေတာ။ သီးနှံအထွက်နှုန်း မဟုတ်ပါ။"] },
  "vegetation-index": { name: ["Vegetation index", "အပင်စိမ်းလန်းညွှန်းကိန်း"], description: ["MODIS NDVI in 16-day composites near the selected point.", "ရွေးထားသော နေရာအနီး အပင်စိမ်းလန်းမှုကို ဖော်ပြသော MODIS NDVI ၁၆ ရက်ပေါင်းစည်းဒေတာ။"] },
  evapotranspiration: { name: ["Evapotranspiration", "မြေနှင့်အပင်မှ ရေငွေ့ပျံမှု"], description: ["Modelled water loss from soil and plants per composite, usually 8 days.", "မြေနှင့်အပင်မှ ရေဆုံးရှုံးမှုကို မော်ဒယ်ဖြင့် တွက်ချက်ထားသော ပေါင်းစည်းကာလတစ်ခုစာ (ပုံမှန် ၈ ရက်) ပမာဏ။"] },
  "extreme-rainfall-frequency": { name: ["Extreme rainfall days", "မိုးအလွန်များသော ရက်အရေအတွက်"], description: ["Monthly days above the local wet-day 95th percentile; provisional 2009–2025 baseline.", "ဒေသ၏ မိုးရွာရက် မိုးရေချိန် ၉၅ ရာခိုင်နှုန်းအဆင့်ထက် ကျော်သော လစဉ်ရက်များ။ ယာယီအခြေခံကာလ ၂၀၀၉–၂၀၂၅။"] },
  "flood-extent": { name: ["Possible flood extent", "ရေလွှမ်းနိုင်သော ဧရိယာ"], description: ["MODIS water outside the same year's dry-season water extent; not confirmed flooding.", "ထိုနှစ် နွေခြောက်ရာသီ ရေပြင်အပြင်ဘက်၌ MODIS က တွေ့ရှိသော ရေဧရိယာ။ ရေကြီးကြောင်း အတည်ပြုချက် မဟုတ်ပါ။"] },
  "drought-indicators": { name: ["Drought indicators", "မိုးခေါင်မှု ညွှန်းကိန်းများ"], description: ["Combined 3-month rainfall and soil-wetness percentiles; lower means drier.", "၃ လစာ မိုးရေချိန်နှင့် မြေဆီစိုစွတ်မှု ရာခိုင်နှုန်းအဆင့်များကို ပေါင်းစပ်ထားသည်။ နိမ့်လေ ပိုခြောက်သွေ့လေ ဖြစ်သည်။"] },
  "hot-day-frequency": { name: ["Hot-day frequency", "ပူပြင်းသော ရက်အရေအတွက်"], description: ["Monthly days above the local calendar-day 90th percentile of maximum temperature.", "ထိုပြက္ခဒိန်ရက်အတွက် ဒေသ၏ အမြင့်ဆုံးအပူချိန် ၉၀ ရာခိုင်နှုန်းအဆင့်ထက် ကျော်သော လစဉ်ရက်များ။"] },
  "fire-detections": { name: ["Active fire / hotspots", "လောင်ကျွမ်းမှု / အပူပြင်းနေရာများ"], description: ["VIIRS detections inside the selected boundary from the latest seven-day FIRMS feed.", "နောက်ဆုံး ၇ ရက်စာ FIRMS ဒေတာမှ ရွေးထားသော နယ်နိမိတ်အတွင်း VIIRS တွေ့ရှိချက်များ။"] },
  "burned-area": { name: ["Burned area", "မီးလောင်ကျွမ်းခဲ့သော ဧရိယာ"], description: ["Monthly share of mapped land burned in MODIS MCD64A1; distinct from active fires.", "MODIS MCD64A1 ဖြင့် လစဉ်မြေပုံတင်ထားသော မြေထဲမှ မီးလောင်ခဲ့သော အချိုး။ လက်ရှိလောင်နေသော မီးတွေ့ရှိချက် မဟုတ်ပါ။"] },
  "forest-cover": { name: ["Tree cover", "သစ်ပင်အုပ်ဖုံးလွှမ်းမှု"], description: ["Annual MODIS tree-canopy percentage; not legally designated forest area.", "နှစ်စဉ် MODIS သစ်ပင်အုပ်ဖုံးလွှမ်းမှု ရာခိုင်နှုန်း။ ဥပဒေအရ သတ်မှတ်သစ်တောဧရိယာ မဟုတ်ပါ။"] },
  "land-cover": { name: ["Land cover", "မြေမျက်နှာပြင် ဖုံးလွှမ်းမှု"], description: ["Annual dominant MODIS land-cover class share with a full class breakdown near the point.", "ကိုယ်စားပြုနေရာအနီး နှစ်စဉ် MODIS အများဆုံးဖုံးလွှမ်းသော မြေအမျိုးအစားအချိုးနှင့် အမျိုးအစားအလိုက် ခွဲခြမ်းချက်။"] },
  "land-surface-temperature": { name: ["Land-surface temperature", "မြေမျက်နှာပြင် အပူချိန်"], description: ["Clear-sky daytime MODIS surface temperature in 8-day composites; not air temperature.", "မိုးတိမ်ကင်းချိန် နေ့ဘက် MODIS မြေမျက်နှာပြင်အပူချိန် ၈ ရက်ပေါင်းစည်းဒေတာ။ လေထုအပူချိန် မဟုတ်ပါ။"] },
  "land-cover-change": { name: ["Land-cover change", "မြေဖုံးလွှမ်းမှု ပြောင်းလဲခြင်း"], description: ["Annual classification differences from the first selected year; may include mapping noise.", "ပထမရွေးထားသောနှစ်နှင့် နှိုင်းယှဉ်သည့် နှစ်စဉ်မြေအမျိုးအစား ကွာခြားမှု။ မြေပုံခွဲခြားမှုအမှား ပါနိုင်သည်။"] },
  "aerosol-optical-depth": { name: ["Aerosol optical depth", "လေထုအမှုန်ကြောင့် အလင်းလျော့နည်းမှု"], description: ["PACE 550 nm aerosol optical depth in a 0.1° cell; not ground-level PM2.5.", "၀.၁° ဂရစ်ကွက်အတွင်း PACE 550 nm လေထုအမှုန်ကြောင့် အလင်းလျော့နည်းမှု။ မြေပြင်အနီး PM2.5 မဟုတ်ပါ။"] },
  "built-up-area": { name: ["Built-up area", "အဆောက်အအုံ ဖုံးလွှမ်းဧရိယာ"], description: ["Share of MODIS pixels classified as urban or built-up; small settlements can be missed.", "MODIS က မြို့ပြ သို့မဟုတ် အဆောက်အအုံရှိဟု ခွဲထားသော ပစ်ဇယ်အချိုး။ ရွာငယ်များ မပါဝင်နိုင်ပါ။"] },
  "settlement-expansion": { name: ["Settlement expansion", "လူနေအခြေချဧရိယာ တိုးချဲ့မှု"], description: ["Built-up cover difference from the first selected year; not confirmed construction.", "ပထမရွေးထားသောနှစ်နှင့် နှိုင်းယှဉ်သည့် အဆောက်အအုံဖုံးလွှမ်းမှု ကွာခြားချက်။ ဆောက်လုပ်မှုကို အတည်ပြုခြင်း မဟုတ်ပါ။"] },
  "land-use-change": { name: ["Land-use change", "မြေအသုံးပြုမှု ပြောင်းလဲခြင်း"], description: ["Cropland-cover difference as a land-use proxy; not observed zoning or actual land use.", "စိုက်ပျိုးမြေဖုံးလွှမ်းမှု ကွာခြားချက်ကို မြေအသုံးပြုမှု ကိုယ်စားပြုအဖြစ် သုံးသည်။ တကယ့်မြေအသုံးပြုမှု သို့မဟုတ် ဇုန်သတ်မှတ်မှု မဟုတ်ပါ။"] },
  "urban-vegetation": { name: ["Urban vegetation", "မြို့ပြ စိမ်းလန်းမှု"], description: ["MODIS NDVI over pixels mapped as built-up; no rural substitute when urban pixels are absent.", "အဆောက်အအုံရှိဟု မြေပုံတင်ထားသော ပစ်ဇယ်များ၏ MODIS NDVI။ မြို့ပြပစ်ဇယ်မရှိပါက ကျေးလက်တန်ဖိုးဖြင့် အစားမထိုးပါ။"] },
  "urban-surface-temperature": { name: ["Urban surface temperature", "မြို့ပြ မြေမျက်နှာပြင်အပူချိန်"], description: ["Clear-sky daytime MODIS surface heat over mapped built-up pixels.", "အဆောက်အအုံရှိဟု မြေပုံတင်ထားသော ပစ်ဇယ်များ၏ မိုးတိမ်ကင်းချိန် နေ့ဘက် MODIS မျက်နှာပြင်အပူချိန်။"] },
  "water-extent": { name: ["Surface-water extent", "ရေပြင်ဖုံးလွှမ်းမှု"], description: ["Water share of clear MODIS pixels in a roughly 9.7 km window, every 8 days.", "ခန့်မှန်း ၉.၇ ကီလိုမီတာ နမူနာဧရိယာအတွင်း မိုးတိမ်ကင်း MODIS ပစ်ဇယ်များ၏ ရေဖုံးလွှမ်းမှုအချိုး၊ ၈ ရက်တစ်ကြိမ်။"] },
  "seasonal-water-change": { name: ["Seasonal water changes", "ရာသီအလိုက် ရေပြင်ပြောင်းလဲမှု"], description: ["Monthly MODIS water share near the point for seasonal comparisons.", "ရာသီအလိုက် နှိုင်းယှဉ်ရန် ကိုယ်စားပြုနေရာအနီး လစဉ် MODIS ရေဖုံးလွှမ်းမှုအချိုး။"] },
  "river-discharge": { name: ["River discharge / flow", "မြစ်ရေ စီးဆင်းနှုန်း"], description: ["Provisional SWOT discharge for the nearest observed river reach; often unavailable.", "အနီးဆုံးတိုင်းတာထားသော မြစ်အပိုင်း၏ ယာယီ SWOT ရေစီးနှုန်း။ ဒေတာ မကြာခဏ မရနိုင်ပါ။"] },
  "river-water-surface-elevation": { name: ["River water surface elevation", "မြစ်ရေမျက်နှာပြင် အမြင့်"], description: ["SWOT mean water-surface elevation along the nearest observed river reach.", "အနီးဆုံးတိုင်းတာထားသော မြစ်အပိုင်းတစ်လျှောက် SWOT ပျမ်းမျှ ရေမျက်နှာပြင်အမြင့်။"] },
  "river-width": { name: ["River width", "မြစ်အကျယ်"], description: ["SWOT mean water width along the nearest observed river reach.", "အနီးဆုံးတိုင်းတာထားသော မြစ်အပိုင်းတစ်လျှောက် SWOT ပျမ်းမျှ ရေပြင်အကျယ်။"] },
  "river-surface-slope": { name: ["River surface slope", "မြစ်ရေမျက်နှာပြင် လျှောစောက်"], description: ["SWOT river water-surface slope in centimetres per kilometre; irregular satellite passes.", "SWOT မြစ်ရေမျက်နှာပြင် လျှောစောက်၊ တစ်ကီလိုမီတာလျှင် စင်တီမီတာ။ ဂြိုဟ်တုဖြတ်သန်းချိန်အလိုက်သာ ရရှိသည်။"] },
  "surface-water-area": { name: ["Surface water area", "ရေပြင်ဧရိယာ"], description: ["MODIS MNDWI water area near the point, with persistent and seasonal water separated.", "ကိုယ်စားပြုနေရာအနီး MODIS MNDWI ရေပြင်ဧရိယာ၊ အမြဲရှိရေနှင့် ရာသီအလိုက်ရေကို ခွဲထားသည်။"] },
  "reservoir-surface-area": { name: ["Reservoir surface area", "ရေလှောင်ကန် ရေပြင်ဧရိယာ"], description: ["SWOT water area of the nearest lake-on-river reach; not reservoir volume or total storage.", "အနီးဆုံး မြစ်ပေါ်ရေကန်အပိုင်း၏ SWOT ရေပြင်ဧရိယာ။ ရေလှောင်ကန်ရေထုထည် သို့မဟုတ် စုစုပေါင်းသိုလှောင်ရေ မဟုတ်ပါ။"] },
  "solar-radiation": { name: ["Solar radiation", "နေရောင်ခြည် စွမ်းအင်"], description: ["Daily all-sky shortwave radiation at the surface; screening context, not electricity generation.", "မြေမျက်နှာပြင်သို့ ရောက်သော နေ့စဉ်နေရောင်ခြည် လှိုင်းတိုစွမ်းအင်။ ကနဦးလေ့လာရန်သာ ဖြစ်ပြီး လျှပ်စစ်ထုတ်လုပ်မှုပမာဏ မဟုတ်ပါ။"] },
  "wind-speed": { name: ["Wind speed", "လေတိုက်နှုန်း"], description: ["Daily wind speed at 10 metres; not turbine-height wind.", "မြေပြင်အထက် ၁၀ မီတာရှိ နေ့စဉ်လေတိုက်နှုန်း။ လေအားတာဘိုင်အမြင့်ရှိ လေတိုက်နှုန်း မဟုတ်ပါ။"] },
  "nighttime-lights": { name: ["Nighttime lights", "ညအချိန် အလင်းရောင်"], description: ["Monthly Black Marble nighttime radiance; a lighting proxy, not electricity supply.", "လစဉ် Black Marble ညအလင်းတောက်ပမှု။ အလင်းရောင်ကို ကိုယ်စားပြုပြီး လျှပ်စစ်ပေးဝေမှုပမာဏ မဟုတ်ပါ။"] },
  "lit-area": { name: ["Lit area", "အလင်းရောင်ရှိသော ဧရိယာ"], description: ["Monthly Black Marble area at or above 2 nW·cm⁻²·sr⁻¹; not grid access.", "လစဉ် Black Marble တွင် 2 nW·cm⁻²·sr⁻¹ နှင့်အထက် အလင်းရှိသော ဧရိယာ။ မီးလိုင်းရရှိမှု မဟုတ်ပါ။"] },
} as const satisfies Record<string, IndicatorCopy>;

function indicatorCopy(id: string): IndicatorCopy | undefined {
  return Object.hasOwn(INDICATOR_COPY, id) ? INDICATOR_COPY[id as keyof typeof INDICATOR_COPY] : undefined;
}

export function indicatorName(id: string, fallback: string, lang: Lang): string {
  const copy = indicatorCopy(id);
  return copy ? workspaceText(lang, ...copy.name) : fallback;
}

export function indicatorDescription(id: string, fallback: string, lang: Lang): string {
  const copy = indicatorCopy(id);
  return copy ? workspaceText(lang, ...copy.description) : fallback;
}

export const CATEGORY_COPY = {
  agriculture: ["Agriculture", "စိုက်ပျိုးရေး"],
  "disaster-intelligence": ["Disaster intelligence", "ဘေးအန္တရာယ်ဆိုင်ရာ အချက်အလက်"],
  "environmental-change": ["Environmental change", "ပတ်ဝန်းကျင် ပြောင်းလဲမှု"],
  "infrastructure-urban-change": ["Infrastructure and urban change", "အခြေခံအဆောက်အအုံနှင့် မြို့ပြပြောင်းလဲမှု"],
  water: ["Water", "ရေ"],
  energy: ["Energy and electricity", "စွမ်းအင်နှင့် လျှပ်စစ်"],
} as const satisfies Record<TopicId, Bilingual>;

export function categoryName(id: string, lang: Lang): string {
  const copy = Object.hasOwn(CATEGORY_COPY, id) ? CATEGORY_COPY[id as TopicId] : undefined;
  return copy ? workspaceText(lang, copy[0], copy[1]) : id;
}

export const SPATIAL_BASIS_COPY = {
  point: ["Reference point", "ကိုယ်စားပြုနေရာ"],
  "pixel-window": ["Pixel window around the point", "ကိုယ်စားပြုနေရာအနီး ပစ်ဇယ်နမူနာဧရိယာ"],
  "grid-cell": ["Grid cell containing the point", "ကိုယ်စားပြုနေရာပါဝင်သော ဂရစ်ကွက်"],
  "river-reach": ["Observed river reach", "တိုင်းတာထားသော မြစ်အပိုင်း"],
  buffer: ["Area around the reference point", "ကိုယ်စားပြုနေရာပတ်လည် နမူနာဧရိယာ"],
  "area-average": ["Full boundary area average", "နယ်နိမိတ်တစ်ခုလုံး၏ ဧရိယာပျမ်းမျှ"],
  "area-total": ["Full boundary area total", "နယ်နိမိတ်တစ်ခုလုံး၏ စုစုပေါင်းပမာဏ"],
} as const satisfies Record<SpatialKind, Bilingual>;

/** Use alongside the response's exact label, which retains coordinates, window size and reach ID. */
export function spatialBasisName(kind: string, lang: Lang): string {
  const copy = Object.hasOwn(SPATIAL_BASIS_COPY, kind) ? SPATIAL_BASIS_COPY[kind as SpatialKind] : undefined;
  return copy ? workspaceText(lang, copy[0], copy[1]) : workspaceText(lang, "Spatial basis not supplied", "နေရာအခြေခံကို မဖော်ပြထားပါ");
}

export const METADATA_COPY = {
  source: ["Data source", "ဒေတာရင်းမြစ်"],
  unit: ["Unit", "ယူနစ်"],
  temporalResolution: ["Time resolution", "အချိန်အပိုင်းအခြား"],
  coverage: ["Archive coverage", "ဒေတာမှတ်တမ်း ရရှိနိုင်သောကာလ"],
  start: ["Start date", "စတင်ရက်"],
  end: ["End date", "ပြီးဆုံးရက်"],
  defaultPeriod: ["Suggested period", "အကြံပြုထားသော ကာလ"],
  ongoing: ["Ongoing archive; latest releases may lag", "ဆက်လက်ဖြည့်စွက်နေသော မှတ်တမ်း။ နောက်ဆုံးဒေတာ ထုတ်ပြန်မှု နောက်ကျနိုင်သည်"],
  available: ["Source available", "ရင်းမြစ်ကို ချိတ်ဆက်အသုံးပြုနိုင်သည်"],
  unavailable: ["Source unavailable", "ရင်းမြစ်ကို လောလောဆယ် အသုံးမပြုနိုင်ပါ"],
  setupRequired: ["Source connection required", "ဒေတာရင်းမြစ် ချိတ်ဆက်ရန်လိုသည်"],
  reason: ["Availability details", "ရရှိနိုင်မှု အသေးစိတ်"],
  spatialBasis: ["Spatial basis", "နေရာအလိုက် တွက်ချက်မှုအခြေခံ"],
  geographicCoverage: ["Geographic coverage", "ပထဝီဝင်အကျုံးဝင်မှု"],
  limitations: ["Limitations", "ကန့်သတ်ချက်များ"],
  observedAt: ["Retrieved at", "ဒေတာရယူချိန်"],
  missingCount: ["Missing observations", "မရရှိသော တိုင်းတာချက်အရေအတွက်"],
  count: ["Valid observations", "အသုံးပြုနိုင်သော တိုင်းတာချက်အရေအတွက်"],
  mean: ["Mean", "ပျမ်းမျှ"],
  min: ["Minimum", "အနိမ့်ဆုံး"],
  max: ["Maximum", "အမြင့်ဆုံး"],
  latest: ["Latest valid value", "နောက်ဆုံးရရှိသော မှန်ကန်သည့်တန်ဖိုး"],
  noData: ["No observations for this selection", "ဤရွေးချယ်မှုအတွက် တိုင်းတာချက်မရှိပါ"],
  missingNote: ["Missing values are unknown, not zero.", "ပျောက်နေသောတန်ဖိုးများသည် မသိရှိခြင်းဖြစ်ပြီး သုည မဟုတ်ပါ။"],
  dataWarning: ["Data comparability warning", "ဒေတာနှိုင်းယှဉ်ရာတွင် သတိပြုရန်"],
  qaPolicy: ["Quality screening", "ဒေတာအရည်အသွေး စစ်ဆေးမှု"],
  daily: ["Daily", "နေ့စဉ်"],
  monthly: ["Monthly", "လစဉ်"],
  annual: ["Annual", "နှစ်စဉ်"],
  "8-day composites": ["8-day composites", "၈ ရက်ပေါင်းစည်းဒေတာ"],
  "16-day composites": ["16-day composites", "၁၆ ရက်ပေါင်းစည်းဒေတာ"],
  "8-day totals": ["8-day totals", "၈ ရက်စာ စုစုပေါင်း"],
  "Monthly counts from daily data": ["Monthly counts from daily data", "နေ့စဉ်ဒေတာမှ တွက်သော လစဉ်အရေအတွက်"],
  "Irregular satellite passes": ["Irregular satellite passes", "အချိန်မမှန်သော ဂြိုဟ်တုဖြတ်သန်းမှုများ"],
} as const satisfies Record<string, Bilingual>;

/** Unknown metadata remains verbatim; never translate or alter scientific units and source URLs. */
export function metadataText(key: string, lang: Lang): string {
  const normalized = ({ Daily: "daily", Monthly: "monthly", Annual: "annual" } as Record<string, string>)[key] ?? key;
  const copy = Object.hasOwn(METADATA_COPY, normalized) ? METADATA_COPY[normalized as keyof typeof METADATA_COPY] : undefined;
  return copy ? workspaceText(lang, copy[0], copy[1]) : key;
}

export function workspaceError(message: string, lang: Lang): string {
  if (lang !== "my" || !message) return message;
  const exact: Record<string, string> = {
    "Choose a state or region first.": "တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ်ကို အရင်ရွေးပါ။",
    "Choose a township within the selected region.": "ရွေးထားသော တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ်အတွင်း မြို့နယ်တစ်ခုကို ရွေးပါ။",
    "Choose an environmental indicator.": "ပတ်ဝန်းကျင် ညွှန်ကိန်းတစ်ခုကို ရွေးပါ။",
    "This indicator requires data-source setup.": "ဤညွှန်ကိန်းအတွက် ဒေတာရင်းမြစ် ချိတ်ဆက်ရန် လိုပါသည်။",
    "This indicator is currently unavailable.": "ဤညွှန်ကိန်းကို လောလောဆယ် အသုံးပြု၍မရပါ။",
    "Choose both a start date and an end date, then apply the range.": "စတင်ရက်နှင့် ပြီးဆုံးရက် နှစ်ခုလုံးကို ရွေးပြီး အသုံးပြုရန် နှိပ်ပါ။",
    "Choose real calendar dates in YYYY-MM-DD format.": "မှန်ကန်သော ရက်စွဲကို YYYY-MM-DD ပုံစံဖြင့် ရွေးပါ။",
    "Start date must be on or before end date.": "စတင်ရက်သည် ပြီးဆုံးရက်ထက် နောက်မကျရပါ။",
    "Future observation dates are not available.": "အနာဂတ်ရက်များအတွက် တိုင်းတာချက် မရရှိနိုင်ပါ။",
    "The public fire feed covers the most recent seven days. Choose dates within that period.": "အများပြည်သူရရှိနိုင်သော မီးလောင်မှုမှတ်တမ်းတွင် နောက်ဆုံး ၇ ရက်သာ ပါဝင်သည်။ ထိုကာလအတွင်း ရွေးပါ။",
    "Choose up to two years for aerosol charts.": "လေထုအမှုန် ဂရပ်အတွက် အများဆုံး ၂ နှစ် ရွေးပါ။",
    "Choose up to three years for SWOT charts.": "SWOT ဂရပ်အတွက် အများဆုံး ၃ နှစ် ရွေးပါ။",
    "Choose up to 12 months for monthly water comparisons.": "ရေဖုံးလွှမ်းမှု လစဉ်နှိုင်းယှဉ်ရန် အများဆုံး ၁၂ လ ရွေးပါ။",
    "Choose up to one year for vegetation charts.": "အပင်ညွှန်းကိန်း ဂရပ်အတွက် အများဆုံး ၁ နှစ် ရွေးပါ။",
  };
  if (exact[message]) return exact[message];
  const date = message.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (message.includes("begins on") && date) return `ဤဒေတာကို ${date} မှ စတင်ရရှိနိုင်ပါသည်။`;
  if (message.includes("ends on") && date) return `ဤဒေတာကို ${date} အထိသာ ရရှိနိုင်ပါသည်။`;
  if (message.includes("1981")) return "NASA POWER မှတ်တမ်းကို 1981-01-01 မှ စတင်ရရှိနိုင်ပါသည်။";
  return "ဒေတာရင်းမြစ်မှ တိုင်းတာချက်များကို ရယူမရပါ။ ရွေးချယ်မှုကို စစ်ပြီး ထပ်မံစမ်းကြည့်ပါ။ မရရှိသောတန်ဖိုးများကို အစားမထိုးထားပါ။";
}

export function indicatorLimitations(id: string, fallback: string, lang: Lang): string {
  if (lang !== "my") return fallback;
  if (["rainfall", "disaster-rainfall", "water-rainfall", "root-zone-wetness", "air-temperature"].includes(id)) return "NASA POWER ဂရစ်တစ်ခုရှိ ကိုယ်စားပြုနေရာ နမူနာဖြစ်ပြီး လယ်ကွင်းတိုင်းတာချက်၊ မြို့နယ် သို့မဟုတ် တိုင်းဒေသကြီး ပျမ်းမျှ မဟုတ်ပါ။ မြန်မာနိုင်ငံအတွက် ၂၀၀၈ ခုနှစ်အတွင်း ဒေတာရင်းမြစ် ပြောင်းလဲမှု ရှိသဖြင့် ၂၀၀၉ ခုနှစ်မှစ၍သာ နှိုင်းယှဉ်ပါ။";
  if (id.includes("nighttime") || id === "lit-area") return "ညအလင်းရောင်သည် လျှပ်စစ်ပေးဝေမှု သို့မဟုတ် မီးလိုင်းရရှိမှုကို တိုက်ရိုက် မတိုင်းတာပါ။ မိုးတိမ်နှင့် အရည်အသွေး စစ်ထုတ်မှုကြောင့် ဒေတာလစ်လပ်နိုင်သည်။";
  if (id.startsWith("river-") || id === "reservoir-surface-area") return "SWOT မှ အနီးဆုံးမြစ်အပိုင်းကို ဂြိုဟ်တု ဖြတ်သန်းချိန်အလိုက်သာ တိုင်းတာသည်။ မြို့နယ် သို့မဟုတ် တိုင်းဒေသကြီး ပျမ်းမျှ မဟုတ်ပါ။ ရေပြင်ဧရိယာသည် သိုလှောင်ရေထုထည် မဟုတ်ပါ။";
  if (id === "aerosol-optical-depth") return "လေထုတစ်လွှာလုံး၏ အမှုန်သက်ရောက်မှုဖြစ်ပြီး မြေပြင်အနီး PM2.5 ပြင်းအား မဟုတ်ပါ။ မိုးတိမ်ကြောင့် ဒေတာလစ်လပ်နိုင်သည်။";
  if (["hot-day-frequency", "extreme-rainfall-frequency", "drought-indicators"].includes(id)) return "၂၀၀၉–၂၀၂၅ ယာယီအခြေခံကာလနှင့် နှိုင်းယှဉ်သော ဖော်ပြချက်သာဖြစ်သည်။ ခန့်မှန်းချက်၊ တရားဝင် သဘာဝဘေး ကြေညာချက် သို့မဟုတ် ကျန်းမာရေး သတိပေးချက် မဟုတ်ပါ။";
  if (id === "fire-detections") return "နောက်ဆုံး ၇ ရက် NASA FIRMS မှတ်တမ်းသာ ဖြစ်သည်။ တိမ်နှင့် ဂြိုဟ်တုဖြတ်သန်းချိန်က တွေ့ရှိမှုကို သက်ရောက်စေသည်။ သုညသည် ဤမှတ်တမ်းတွင် မတွေ့ရှိခြင်းဖြစ်ပြီး မီးလုံးဝမရှိကြောင်း အတည်မပြုပါ။";
  if (id.includes("land-") || id.includes("built-up") || id.includes("settlement")) return "ဂြိုဟ်တုမြေဖုံးလွှမ်းမှု အမျိုးအစား ခွဲခြားချက်ဖြစ်ပြီး အမှန်တကယ် မြေသုံးစွဲမှု သို့မဟုတ် ဆောက်လုပ်မှုကို တိုက်ရိုက် အတည်မပြုပါ။ အမျိုးအစားခွဲခြားမှု အမှား ရှိနိုင်သည်။";
  return "ဤဂြိုဟ်တုထုတ်ကုန်တွင် အရည်အသွေး စစ်ထုတ်မှု၊ ပစ်ဇယ်အရွယ်အစားနှင့် ထုတ်ပြန်မှု နောက်ကျခြင်း ကန့်သတ်ချက်များ ရှိသည်။ နေရာအလိုက် တွက်ချက်မှုအခြေခံကို စစ်ဆေးပါ။ လစ်လပ်သောဒေတာကို သုညအဖြစ် မသတ်မှတ်ပါ။ တိုင်းတာချက်များသည် ခန့်မှန်းချက် မဟုတ်ပါ။";
}
