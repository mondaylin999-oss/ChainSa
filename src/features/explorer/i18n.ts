/**
 * Burmese (my) text for the Explore workspace. Product identifiers (e.g. MOD09A1, VNP46A3), units and numbers stay
 * in their original form. Long technical limitation paragraphs are summarised in Burmese here and the full English
 * text remains available beneath, so no scientific caveat is lost in translation. Native-speaker review recommended.
 */
export type Lang = "en" | "my";

export const UI = {
  en: {
    eyebrow: "Explore Myanmar", title: "Map & data workspace", intro: "Choose a topic, then view a connected observation series and its source details.",
    back: "Back", toRegion: "To region", allRegions: "All regions", home: "Home",
    finishSetup: "finish setup", accessNeeded: "access needed", noData: "no data yet", seeMore: "See more",
    loading: "Retrieving NASA observations…", initial: "Select an area on the map, then a dataset and date range, to view observations.",
    unavailable: "No observation data is available for this selection.", errorTitle: "Could not retrieve observations.", retry: "Try again",
    empty: "No observations are available for this selection and period. Missing values are left blank, not treated as zero.",
    noValid: "NASA returned no valid observations for this period. Missing values are not plotted as zero.",
    mean: "Mean", minimum: "Minimum", maximum: "Maximum", observations: "Observations",
    sources: "Sources & context", detailed: "Detailed info", backToDetails: "Back to observation details",
    dataset: "Dataset", unit: "Unit", status: "Status", connected: "Connected", source: "Source", measures: "What it measures", limitations: "Limitations", limitationsEnglish: "Full limitations (English)",
    warning: "Data consistency warning", spatialBasis: "Spatial basis", selectedPlace: "Selected place", topic: "Topic", period: "Observation period",
    unitsSource: "Units & source", latest: "Latest available value", coverage: "Geographic coverage", received: "Data received",
    missing: "Missing observations", missingValue: (n: number) => `${n} shown as gaps, not zeros`, reading: "Plain-language reading",
    readArea: "values are calculated over the full selected boundary.", readReach: "they describe the named SWOT river reach, not a township-wide or region-wide condition.",
    readCell: "they describe one satellite grid cell, not a township-wide or region-wide condition.", readPoint: "they describe the sampled point or pixel window, not a township-wide or region-wide condition.",
    readPrefix: "Summary statistics use only available observations;",
  },
  my: {
    eyebrow: "မြန်မာနိုင်ငံကို လေ့လာရန်", title: "မြေပုံနှင့် ဒေတာ လုပ်ငန်းခွင်", intro: "ခေါင်းစဉ်တစ်ခု ရွေးပြီး NASA လေ့လာတွေ့ရှိချက် အစဉ်နှင့် ရင်းမြစ်အသေးစိတ်ကို ကြည့်ပါ။",
    back: "နောက်သို့", toRegion: "တိုင်း/ပြည်နယ်သို့", allRegions: "တိုင်း/ပြည်နယ်အားလုံး", home: "ပင်မစာမျက်နှာ",
    finishSetup: "စနစ်ပြင်ဆင်ရန် လိုသည်", accessNeeded: "ဝင်ရောက်ခွင့် လိုသည်", noData: "ဒေတာ မရှိသေးပါ", seeMore: "ထပ်ကြည့်ရန်",
    loading: "NASA လေ့လာတွေ့ရှိချက်များကို ရယူနေသည်…", initial: "မြေပုံပေါ်တွင် နေရာတစ်ခု ရွေးပြီး ဒေတာအစုနှင့် ရက်စွဲအပိုင်းအခြား ရွေးပါ။",
    unavailable: "ဤရွေးချယ်မှုအတွက် လေ့လာတွေ့ရှိချက် ဒေတာ မရှိပါ။", errorTitle: "လေ့လာတွေ့ရှိချက်များကို မရယူနိုင်ပါ။", retry: "ထပ်ကြိုးစားရန်",
    empty: "ဤရွေးချယ်မှုနှင့် ကာလအတွက် လေ့လာတွေ့ရှိချက် မရှိပါ။ မရှိသော တန်ဖိုးများကို သုညအဖြစ် မပြဘဲ ကွက်လပ်ထားသည်။",
    noValid: "ဤကာလအတွက် NASA မှ မှန်ကန်သော လေ့လာတွေ့ရှိချက် မပေးနိုင်ပါ။ မရှိသော တန်ဖိုးများကို သုညအဖြစ် မဆွဲပါ။",
    mean: "ပျမ်းမျှ", minimum: "အနိမ့်ဆုံး", maximum: "အမြင့်ဆုံး", observations: "လေ့လာတွေ့ရှိချက်",
    sources: "ရင်းမြစ်နှင့် နောက်ခံ", detailed: "အသေးစိတ် အချက်အလက်", backToDetails: "လေ့လာတွေ့ရှိချက် အသေးစိတ်သို့ ပြန်သွားရန်",
    dataset: "ဒေတာအစု", unit: "ယူနစ်", status: "အခြေအနေ", connected: "ချိတ်ဆက်ပြီး", source: "ရင်းမြစ်", measures: "တိုင်းတာသည့်အရာ", limitations: "ကန့်သတ်ချက်များ", limitationsEnglish: "ကန့်သတ်ချက် အပြည့်အစုံ (English)",
    warning: "ဒေတာ ကိုက်ညီမှု သတိပေးချက်", spatialBasis: "နေရာဆိုင်ရာ အခြေခံ", selectedPlace: "ရွေးထားသော နေရာ", topic: "ခေါင်းစဉ်", period: "လေ့လာသည့် ကာလ",
    unitsSource: "ယူနစ်နှင့် ရင်းမြစ်", latest: "နောက်ဆုံးရရှိသော တန်ဖိုး", coverage: "ပထဝီ နယ်ပယ်", received: "ဒေတာ ရရှိချိန်",
    missing: "မရှိသော လေ့လာတွေ့ရှိချက်", missingValue: (n: number) => `${n} ခုကို သုညမဟုတ်ဘဲ ကွက်လပ်အဖြစ် ပြထားသည်`, reading: "ရိုးရှင်းသော ရှင်းလင်းချက်",
    readArea: "တန်ဖိုးများကို ရွေးထားသော နယ်နိမိတ်တစ်ခုလုံးအတွက် တွက်ချက်ထားသည်။", readReach: "၎င်းတို့သည် ဖော်ပြထားသော SWOT မြစ်အပိုင်းကိုသာ ဖော်ပြပြီး မြို့နယ် သို့မဟုတ် တိုင်း/ပြည်နယ် တစ်ခုလုံး၏ အခြေအနေ မဟုတ်ပါ။",
    readCell: "၎င်းတို့သည် ဂြိုဟ်တု ဂရစ်ကွက်တစ်ကွက်ကိုသာ ဖော်ပြပြီး မြို့နယ် သို့မဟုတ် တိုင်း/ပြည်နယ် တစ်ခုလုံး၏ အခြေအနေ မဟုတ်ပါ။", readPoint: "၎င်းတို့သည် နမူနာအမှတ် သို့မဟုတ် pixel ဝင်းဒိုးကိုသာ ဖော်ပြပြီး မြို့နယ် သို့မဟုတ် တိုင်း/ပြည်နယ် တစ်ခုလုံး၏ အခြေအနေ မဟုတ်ပါ။",
    readPrefix: "အကျဉ်းချုပ် စာရင်းအင်းများသည် ရရှိသော လေ့လာတွေ့ရှိချက်များကိုသာ အသုံးပြုသည်။",
  },
} as const;

export const TOPIC_MY: Record<string, string> = {
  agriculture: "စိုက်ပျိုးရေး", "disaster-intelligence": "ဘေးအန္တရာယ် သတင်းအချက်အလက်", "environmental-change": "ပတ်ဝန်းကျင် ပြောင်းလဲမှု",
  "infrastructure-urban-change": "အခြေခံအဆောက်အအုံနှင့် မြို့ပြ ပြောင်းလဲမှု", water: "ရေ", energy: "စွမ်းအင်နှင့် လျှပ်စစ်",
};

/** Indicator names and one-line summaries, keyed by the English sidebar label. */
export const INDICATOR_MY: Record<string, { label: string; summary: string }> = {
  "Rainfall": { label: "မိုးရေချိန်", summary: "NASA POWER နေ့စဉ် ပြုပြင်ပြီး မိုးရေချိန် (တစ်နေရာတည်း၏ ဂရစ်ခန့်မှန်းချက်)။" },
  "Soil Moisture": { label: "မြေဆီလွှာ စိုထိုင်းဆ", summary: "NASA POWER အမြစ်ဇုန် မြေစိုစွတ်မှု မော်ဒယ်ခန့်မှန်းချက် (တိုက်ရိုက်တိုင်းတာမှု မဟုတ်ပါ)။" },
  "Air Temperature": { label: "လေထု အပူချိန်", summary: "NASA POWER ၂ မီတာ အမြင့် လေထု အပူချိန်။" },
  "Vegetation Greenness": { label: "အပင် စိမ်းလန်းမှု", summary: "NASA MODIS MOD13Q1 NDVI ၁၆ ရက် ပေါင်းစပ်ပုံ၊ အမှတ်ပတ်လည် ၁ ကီလိုမီတာခန့်။" },
  "Evapotranspiration": { label: "ရေငွေ့ပျံ့ထွက်မှု", summary: "NASA MODIS MOD16A2GF မြေနှင့် အပင်မှ ရေဆုံးရှုံးမှု မော်ဒယ်တန်ဖိုး (၈ ရက်စုစုပေါင်း)။" },
  "Precipitation": { label: "မိုးရေချိန်", summary: "NASA POWER နေ့စဉ် မိုးရေချိန်။ ရေကြီးမှုကို အတည်ပြုခြင်း မဟုတ်ပါ။" },
  "Extreme Rainfall Frequency": { label: "ပြင်းထန်သော မိုးရွာရက် အကြိမ်ရေ", summary: "ဒေသ၏ ၉၅ ရာခိုင်နှုန်းအဆင့် မိုးရေချိန်ထက် ကျော်သော ရက်အရေအတွက် (ယာယီ ၂၀၀၉–၂၀၂၅ အခြေခံ)။ ရေကြီးမှု ခန့်မှန်းချက် မဟုတ်ပါ။" },
  "Flood Extent": { label: "ရေကြီးနိုင်သော ဧရိယာ", summary: "ခြောက်သွေ့ရာသီထက် ပိုသော ရေပြင် (MODIS)။ မိုးတိမ်ကြောင့် ကန့်သတ်ပြီး တရားဝင် ရေကြီးမြေပုံ မဟုတ်ပါ။" },
  "Drought Indicators": { label: "မိုးခေါင်မှု ညွှန်ကိန်းများ", summary: "၃ လ မိုးရေချိန်နှင့် မြေစိုစွတ်မှု ရာခိုင်နှုန်းအဆင့် ပေါင်းစပ်ချက်။ တရားဝင် မိုးခေါင်ကြေညာချက် မဟုတ်ပါ။" },
  "Hot-day Frequency": { label: "အပူလွန်ရက် အကြိမ်ရေ", summary: "ထိုရက်အတွက် ၉၀ ရာခိုင်နှုန်းအဆင့် အမြင့်ဆုံးအပူချိန်ထက် ကျော်သော ရက်အရေအတွက် (TX90p)။ ကျန်းမာရေး သတိပေးချက် မဟုတ်ပါ။" },
  "Active Fire / Hotspots": { label: "မီးလောင်နေသော နေရာများ", summary: "NASA FIRMS VIIRS ဂြိုဟ်တု မီးတွေ့ရှိချက်များ (နောက်ဆုံး ၇ ရက်)။ တရားဝင် မီးလောင်မှု အရေအတွက် မဟုတ်ပါ။" },
  "Burned Area": { label: "မီးလောင်ပြီး ဧရိယာ", summary: "NASA MODIS MCD64A1 လစဉ် မီးလောင်ပြီး မြေ ရာခိုင်နှုန်း (၅ × ၅ pixel ဝင်းဒိုး)။" },
  "Vegetation indices": { label: "အပင် ညွှန်ကိန်းများ", summary: "NASA MODIS NDVI အပင်စိမ်းလန်းမှု။" },
  "Tree Cover": { label: "သစ်ပင် ဖုံးလွှမ်းမှု", summary: "NASA MODIS MOD44B သစ်ပင်အုပ်ဆိုင်း ရာခိုင်နှုန်း (နှစ်စဉ်)။ တရားဝင် သစ်တောသတ်မှတ်ချက် မဟုတ်ပါ။" },
  "Land Cover": { label: "မြေဖုံးလွှမ်းမှု", summary: "NASA MODIS MCD12Q1 မြေဖုံးအမျိုးအစားများ (နှစ်စဉ်)။" },
  "Land-surface temperature": { label: "မြေမျက်နှာပြင် အပူချိန်", summary: "NASA MODIS MOD11A2 နေ့ခင်း မြေမျက်နှာပြင် အပူချိန်။ လေထုအပူချိန် မဟုတ်ပါ။" },
  "Land-cover change": { label: "မြေဖုံးလွှမ်းမှု ပြောင်းလဲမှု", summary: "MCD12Q1 အမျိုးအစား ကွာခြားချက်။ အတည်ပြုထားသော မြေအသုံးပြောင်းလဲမှု မဟုတ်ပါ။" },
  "Aerosol Optical Depth": { label: "လေထုအမှုန် အလင်းပိတ်မှု (AOD)", summary: "NASA PACE OCI AOD (550 nm, ၈ ရက်, 0.1°)။ မြေပြင် PM2.5 မဟုတ်ပါ။" },
  "Built-up area": { label: "အဆောက်အအုံ ဧရိယာ", summary: "MODIS မြို့ပြ/အဆောက်အအုံ အမျိုးအစား pixel ရာခိုင်နှုန်း။" },
  "Settlement expansion": { label: "မြို့ရွာ တိုးချဲ့မှု", summary: "ပထမနှစ်မှ မြို့ပြ pixel ရာခိုင်နှုန်း ကွာခြားချက်။ ဆောက်လုပ်ရေးကို အတည်မပြုပါ။" },
  "Land-use change": { label: "မြေအသုံးချမှု ပြောင်းလဲမှု", summary: "စိုက်ခင်း ဖုံးလွှမ်းမှု ကွာခြားချက် (ညွှန်ပြချက်သာ)။" },
  "Urban Vegetation": { label: "မြို့ပြ အစိမ်းရောင်", summary: "မြို့ပြ pixel များပေါ်ရှိ NASA MODIS NDVI။" },
  "Urban Surface Temperature": { label: "မြို့ပြ မျက်နှာပြင် အပူချိန်", summary: "မြို့ပြ pixel များပေါ်ရှိ NASA MODIS နေ့ခင်း မျက်နှာပြင် အပူချိန်။ လေထုအပူချိန် မဟုတ်ပါ။" },
  "Surface-water extent": { label: "မျက်နှာပြင်ရေ ဖုံးလွှမ်းမှု", summary: "NASA MODIS ဖြင့် ရေအဖြစ် သတ်မှတ်ထားသော မိုးကင်း pixel ရာခိုင်နှုန်း (၂၀၀၀ ခုနှစ်မှ)။" },
  "Seasonal water changes": { label: "ရာသီအလိုက် ရေ ပြောင်းလဲမှု", summary: "လစဉ် NASA MODIS ရေ ရာခိုင်နှုန်း၊ ရာသီများ နှိုင်းယှဉ်ရန်။" },
  "River Discharge / Flow": { label: "မြစ်ရေ စီးဆင်းနှုန်း", summary: "အနီးဆုံး မြစ်အပိုင်း၏ NASA SWOT ခန့်မှန်း စီးဆင်းနှုန်း (ယာယီ၊ မကြာခဏ မရရှိပါ)။" },
  "River Water Surface Elevation": { label: "မြစ်ရေမျက်နှာပြင် အမြင့်", summary: "အနီးဆုံး မြစ်အပိုင်း၏ NASA SWOT ရေမျက်နှာပြင် အမြင့် (၂၀၂၃ မှ)။" },
  "River Width": { label: "မြစ် အကျယ်", summary: "အနီးဆုံး မြစ်အပိုင်း၏ NASA SWOT ရေပြင် အကျယ် (၂၀၂၃ မှ)။" },
  "River Surface Slope": { label: "မြစ်ရေမျက်နှာပြင် လျှောစောင်း", summary: "အနီးဆုံး မြစ်အပိုင်း၏ NASA SWOT ရေမျက်နှာပြင် လျှောစောင်း (၂၀၂၃ မှ)။" },
  "Surface Water Area": { label: "မျက်နှာပြင်ရေ ဧရိယာ", summary: "အမှတ်ပတ်လည် ဝင်းဒိုးရှိ NASA MODIS ရေဧရိယာ၊ အမြဲရှိရေနှင့် ရာသီရေ ခွဲခြားထားသည်။" },
  "Reservoir Surface Area": { label: "ရေလှောင်ကန် ရေမျက်နှာပြင် ဧရိယာ", summary: "အနီးဆုံး ရေလှောင်ကန်အပိုင်း၏ NASA SWOT ရေမျက်နှာပြင် ဧရိယာ။ ရေထုထည် မဟုတ်ပါ။" },
  "Solar radiation": { label: "နေရောင်ခြည် စွမ်းအင်", summary: "NASA POWER မြေပြင်သို့ရောက်သော နေရောင်ခြည် (ဒေတာ ၂–၃ လ နောက်ကျနိုင်သည်)။" },
  "Wind speed": { label: "လေတိုက်နှုန်း", summary: "NASA POWER ၁၀ မီတာ အမြင့် လေတိုက်နှုန်း။" },
  "Nighttime lights": { label: "ညအလင်းရောင်", summary: "NASA Black Marble လစဉ် ညအလင်း တောက်ပမှု။ လျှပ်စစ်သုံးစွဲမှုကို တိုက်ရိုက် မတိုင်းတာပါ။" },
  "Nighttime Brightness": { label: "ညအလင်း တောက်ပမှု", summary: "NASA Black Marble လစဉ် ညအလင်း တောက်ပမှု။ လျှပ်စစ်ရရှိမှုကို တိုက်ရိုက် မတိုင်းတာပါ။" },
  "Lit Area": { label: "အလင်းရောင်ရှိ ဧရိယာ", summary: "လစဉ် NASA Black Marble တောက်ပမှု 2 nW·cm⁻²·sr⁻¹ နှင့်အထက် ဧရိယာ။ လျှပ်စစ်ကွန်ရက် ချိတ်ဆက်မှု မဟုတ်ပါ။" },
};

const POWER = "NASA POWER ဂရစ် (0.5° ခန့်) အမှတ်တစ်ခု၏ ခန့်မှန်းချက်ဖြစ်ပြီး မြို့နယ် သို့မဟုတ် တိုင်း/ပြည်နယ် ပျမ်းမျှ မဟုတ်ပါ။ မြန်မာနိုင်ငံအတွက် ၂၀၀၈ ခုနှစ်တွင် ဒေတာ ရုတ်တရက် ပြောင်းလဲသဖြင့် ၂၀၀၉ နောက်ပိုင်းကိုသာ နှိုင်းယှဉ်ပါ။";
const BASELINE = "ယာယီ ၁၇ နှစ် အခြေခံကာလ (၂၀၀၉–၂၀၂၅) နှင့် နှိုင်းယှဉ်ထားပြီး စံ ၃၀ နှစ် ရာသီဥတု ပျမ်းမျှ မဟုတ်ပါ။ အတိတ်ကို ဖော်ပြခြင်းသာဖြစ်ပြီး ခန့်မှန်းချက် မဟုတ်ပါ။";
const WINDOW = "ကိုယ်စားပြုအမှတ် ပတ်လည် pixel ဝင်းဒိုးမှ တွက်ချက်ထားပြီး မြို့နယ် သို့မဟုတ် တိုင်း/ပြည်နယ် တစ်ခုလုံး၏ ပျမ်းမျှ မဟုတ်ပါ။";
const CLOUD = "မိုးတိမ်ဖုံးသော ကာလများကို သုညမဟုတ်ဘဲ ကွက်လပ်ထားသည်။";
const SWOT = "SWOT ဂြိုဟ်တု ဖြတ်သန်းချိန်တွင်သာ တိုင်းတာ၍ ဒေတာသည် ၂၀၂၃ ခုနှစ် ဇူလိုင်မှ စတင်ပြီး မမှန်မကန် ကြားကာလများ ရှိသည်။ ကွက်လပ်များကို ခန့်မှန်းဖြည့်ခြင်း မပြုပါ။ အချိန်နှင့်တပြေးညီ စောင့်ကြည့်ခြင်း မဟုတ်ပါ။";
const BM = "ဂြိုဟ်တုမှ မြင်ရသော အလင်းဖြစ်ပြီး လျှပ်စစ်သုံးစွဲမှု၊ ကွန်ရက်ချိတ်ဆက်မှု၊ လူဦးရေ သို့မဟုတ် စီးပွားရေးကို တိုက်ရိုက် မတိုင်းတာပါ။ မီးလောင်မှုနှင့် လှေများမှ အလင်းလည်း ပါဝင်နိုင်သည်။ အရည်အသွေးကောင်း (quality flag 0) pixel များကိုသာ သုံးသည်။";

/** Short Burmese limitation notes per dataset id (the full English text is shown beneath). */
export const LIMITATION_MY: Record<string, string> = {
  rainfall: POWER, "disaster-rainfall": `${POWER} မိုးရေချိန်တစ်ခုတည်းဖြင့် ရေကြီးမှုကို အတည်မပြုနိုင်ပါ။`, "water-rainfall": POWER,
  "air-temperature": POWER, "root-zone-wetness": `${POWER} မော်ဒယ် ခန့်မှန်းချက်ဖြစ်ပြီး လယ်ကွင်း တိုင်းတာမှု မဟုတ်ပါ။`,
  "solar-radiation": "NASA POWER အမှတ်တစ်ခု၏ ခန့်မှန်းချက်။ နေရောင်ခြည်စွမ်းအင် နေရာ အကဲဖြတ်ချက် မဟုတ်ပါ။ နောက်ဆုံးလများ မရရှိသေးနိုင်ပါ။",
  "wind-speed": "NASA POWER ၁၀ မီတာ အမြင့် လေတိုက်နှုန်း။ လေရဟတ်အမြင့် သို့မဟုတ် နေရာအလိုက် စွမ်းအင် အကဲဖြတ်ချက် မဟုတ်ပါ။",
  "extreme-rainfall-frequency": `${BASELINE} ဂရစ်ဒေတာသည် ဒေသတွင်း မိုးသည်းထန်မှုကို လျော့တွက်နိုင်သည်။ ရေကြီး ခန့်မှန်းချက် မဟုတ်ပါ။`,
  "hot-day-frequency": `${BASELINE} ကျန်းမာရေး အပူသတိပေးချက် မဟုတ်ပါ။`,
  "drought-indicators": `${BASELINE} ၁၇ နှစ်သာ ရှိသဖြင့် အလွန်ပြင်းထန်သော မိုးခေါင်အဆင့် (D3/D4) ကို ခွဲခြား၍ မရပါ။ တရားဝင် မိုးခေါင်ကြေညာချက် မဟုတ်ပါ။`,
  "flood-extent": `ခြောက်သွေ့ရာသီ (ဇန်နဝါရီ–ဧပြီ) ရေပြင်ထက် ပိုသော ရေကို ပြသည်။ ရေကြီးမှု ဖြစ်နိုင်သော်လည်း စပါးခင်း ရေသွင်းမှုလည်း ဖြစ်နိုင်သည်။ ${CLOUD} ${WINDOW} တရားဝင် ရေကြီးမြေပုံ မဟုတ်ပါ။`,
  "fire-detections": "ဂြိုဟ်တု မီးတွေ့ရှိချက်များသည် မီးအချို့ကို လွတ်သွားနိုင်ပြီး တရားဝင် အစီရင်ခံစာ မဟုတ်ပါ။ သုညဆိုသည်မှာ ဤ feed တွင် မတွေ့ခြင်းသာ ဖြစ်သည်။",
  "burned-area": `${WINDOW} ၀% ဆိုသည်မှာ ဝင်းဒိုးအတွင်း မီးလောင်ပြီး pixel မတွေ့ခြင်းသာ ဖြစ်ပြီး တိုင်း/ပြည်နယ်တွင် မီးမလောင်ဟု မဆိုလိုပါ။ မီးငယ်များကို လွတ်သွားနိုင်သည်။`,
  "agriculture-vegetation-index": `${WINDOW} ${CLOUD}`, "vegetation-index": `${WINDOW} ${CLOUD}`,
  "forest-cover": `${WINDOW} သစ်ပင်အုပ်ဆိုင်း ရာခိုင်နှုန်းသည် တရားဝင် သစ်တောသတ်မှတ်ချက် သို့မဟုတ် သစ်တောပြုန်းတီးမှု တိုင်းတာချက် မဟုတ်ပါ။`,
  "land-cover": `${WINDOW} မော်ဒယ် အမျိုးအစားခွဲခြားမှုဖြစ်၍ နှစ်စဉ် ကွာခြားချက်သည် အမှားလည်း ဖြစ်နိုင်သည်။`,
  "land-surface-temperature": `${WINDOW} မိုးကင်းချိန် မျက်နှာပြင် အပူချိန်ဖြစ်ပြီး လေထုအပူချိန် မဟုတ်ပါ။ ${CLOUD}`,
  "land-cover-change": `${WINDOW} အမျိုးအစား ကွာခြားချက်သည် အတည်ပြုထားသော မြေပြောင်းလဲမှု မဟုတ်ပါ။`,
  "aerosol-optical-depth": `လေထုတစ်ခုလုံး၏ မြူ၊ မီးခိုး၊ ဖုန်မှုန့်ကြောင့် နေရောင် လျော့နည်းမှုကို တိုင်းတာခြင်းဖြစ်ပြီး မြေပြင် PM2.5 သို့မဟုတ် လူ့ကျန်းမာရေး ထိတွေ့မှု မဟုတ်ပါ။ 0.1° (၁၁ ကီလိုမီတာခန့်) ဂရစ်ကွက်တစ်ကွက်။ ${CLOUD}`,
  "built-up-area": `${WINDOW} ၅၀၀ မီတာ pixel များသည် အသေးစား ရွာများကို လွတ်သွားနိုင်သည်။`,
  "settlement-expansion": `${WINDOW} အမျိုးအစားခွဲခြားမှု အမှားသည် တိုးချဲ့မှုကဲ့သို့ ထင်ရနိုင်သည်။`,
  "land-use-change": `${WINDOW} စိုက်ခင်း ဖုံးလွှမ်းမှု ညွှန်ပြချက်သာ ဖြစ်ပြီး အမှန်တကယ် မြေအသုံးချမှု မဟုတ်ပါ။`,
  "urban-vegetation": `${WINDOW} MODIS မြို့ပြ pixel မရှိသော နေရာတွင် တန်ဖိုး မပြပါ။`,
  "urban-surface-temperature": `${WINDOW} မျက်နှာပြင် အပူချိန်ဖြစ်ပြီး လေထုအပူချိန် မဟုတ်ပါ။ MODIS မြို့ပြ pixel မရှိသော နေရာတွင် တန်ဖိုး မပြပါ။`,
  "water-extent": `${WINDOW} ${CLOUD} ၅၀၀ မီတာ pixel များသည် မြစ်ကျဉ်းနှင့် ကန်ငယ်များကို လွတ်သွားနိုင်သည်။`,
  "seasonal-water-change": `${WINDOW} ${CLOUD} တစ်ကြိမ်လျှင် လ ၁၂ လအထိ။`,
  "surface-water-area": `${WINDOW} ${CLOUD} အမြဲရှိရေနှင့် ရာသီရေကို ခွဲခြားထားသည်။`,
  "river-discharge": `SWOT စီးဆင်းနှုန်းသည် ယာယီ စမ်းသပ်ခန့်မှန်းချက်ဖြစ်ပြီး ရေတိုင်း တိုင်းတာမှု မဟုတ်ပါ။ မြန်မာ မြစ်အပိုင်းအများစုအတွက် မရရှိသေးပါ။ ${SWOT}`,
  "river-water-surface-elevation": `မြစ်အပိုင်း ပျမ်းမျှ ရေမျက်နှာပြင် အမြင့် (EGM2008 geoid အပေါ်)၊ ဒေသတွင်း ရေတိုင်း မဟုတ်ပါ။ ${SWOT}`,
  "river-width": `ရေအဆင့်နှင့်အတူ ပြောင်းလဲသည်။ ${SWOT}`,
  "river-surface-slope": `တိုတောင်းသော သို့မဟုတ် လျှောစောင်းနည်းသော မြစ်အပိုင်းတွင် မတိကျနိုင်ပါ။ ${SWOT}`,
  "reservoir-surface-area": `ရေလှောင်ကန်ကြီးတစ်ခုသည် မြစ်အပိုင်း အများအပြား ပါဝင်နိုင်သဖြင့် အပိုင်းတစ်ခု၏ ဧရိယာသာ ဖြစ်နိုင်သည်။ ဧရိယာသည် ရေထုထည် သို့မဟုတ် အသုံးပြုနိုင်သော ရေပမာဏ မဟုတ်ပါ။ ${SWOT}`,
  "nighttime-lights": BM,
  "lit-area": `${BM} တန်ဖိုး 2 nW·cm⁻²·sr⁻¹ ကို မြန်မာ ဒေတာ စစ်ဆေးမှုဖြင့် ရွေးချယ်ထားပြီး (နိမ့်သော တန်ဖိုးများသည် ခြောက်သွေ့ရာသီ မြူကြောင့် တိုးလာသည်) NASA ၏ တရားဝင် သတ်မှတ်ချက် မဟုတ်ပါ။ 1 နှင့် 0.5 တန်ဖိုးများကိုလည်း ပြထားသည်။`,
  evapotranspiration: `${WINDOW} မော်ဒယ်တန်ဖိုးဖြစ်ပြီး လယ်ကွင်း တိုင်းတာမှု မဟုတ်ပါ။`,
};

/** Burmese rendering of the spatial-basis labels produced by the server (coordinates and product terms kept). */
export function spatialBasisMy(label: string) {
  return label
    .replace("Township Representative Point", "မြို့နယ် ကိုယ်စားပြု အမှတ်")
    .replace("Regional Reference Point", "တိုင်း/ပြည်နယ် ကိုယ်စားပြု အမှတ်")
    .replace("Full Township Area Average", "မြို့နယ် နယ်မြေတစ်ခုလုံး ပျမ်းမျှ")
    .replace("Full Region Area Average", "တိုင်း/ပြည်နယ် နယ်မြေတစ်ခုလုံး ပျမ်းမျှ")
    .replace("Full Township Area Total", "မြို့နယ် နယ်မြေတစ်ခုလုံး စုစုပေါင်း")
    .replace("Full Region Area Total", "တိုင်း/ပြည်နယ် နယ်မြေတစ်ခုလုံး စုစုပေါင်း")
    .replace(/(\d+) × \d+ pixel window \(about ([\d.]+) km × [\d.]+ km\)/, "$1 × $1 pixel ဝင်းဒိုး (ခန့်မှန်း $2 km × $2 km)")
    .replace(/([\d.]+)° grid cell \(about (\d+) km\)/, "$1° ဂရစ်ကွက် (ခန့်မှန်း $2 km)")
    .replace("SWOT river reach", "SWOT မြစ်အပိုင်း").replace("SWOT lake-on-river reach", "SWOT မြစ်ပေါ်ရေကန်အပိုင်း")
    .replace(/km from the /, "km အကွာ – ")
    .replace(/systematic sample of every (\d+)\w+ pixel in each direction/, "ဘက်တိုင်းတွင် pixel $1 ခုလျှင် ၁ ခု စနစ်တကျ နမူနာယူထားသည်")
    .replace("lit area", "အလင်းရောင်ရှိ ဧရိယာ");
}
