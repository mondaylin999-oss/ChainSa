import "server-only";
import type { Fact, Lang } from "../types";
import type { Assessment } from "./climate/assessment";

/**
 * Rule-based decision support. Each recommendation is triggered by a documented indicator and
 * carries its reason and uncertainty. The wording is deliberately general (no crop-specific
 * thresholds) until agricultural experts review it — see answerFormat.decisionSupportStatus.
 */

export interface Recommendation {
  id: string;
  text: string;
  reason: string;
  uncertainty: string;
}

type T = Record<Lang, string>;
const fv = (facts: Fact[], id: string) => facts.find((f) => f.id === id);
const num = (f?: Fact) => (f ? f.value.toFixed(f.decimals) : "?");

const U_POINT: T = {
  en: "Values come from one NASA POWER grid point and modelled soil wetness; conditions in individual fields can differ.",
  my: "တန်ဖိုးများသည် NASA POWER ဂရစ်အမှတ် တစ်ခုနှင့် မော်ဒယ်ဖြင့် တွက်ထားသော မြေစိုစွတ်မှုမှ ဖြစ်၍ လယ်ကွင်းတစ်ခုချင်းစီ၏ အခြေအနေ ကွာခြားနိုင်ပါသည်။",
};
const U_NO_FORECAST: T = {
  en: "No validated 30-day forecast is available, so this is based on recent observations and past years only.",
  my: "အတည်ပြုထားသော ရက် ၃၀ ခန့်မှန်းချက် မရှိသေးသဖြင့် မကြာသေးမီ တိုင်းတာချက်များနှင့် ယခင်နှစ်များအပေါ်သာ အခြေခံထားပါသည်။",
};

export function buildRecommendations(a: Assessment, lang: Lang): Recommendation[] {
  const recs: Recommendation[] = [];
  const f = a.facts;
  const L = (t: T) => t[lang];

  if (a.drought === "warning" || a.drought === "watch") {
    const soil = fv(f, "soil_pct");
    const r90 = fv(f, "rain_90d_pct");
    const why: string[] = [];
    if (soil) why.push(lang === "my" ? `မြေဆီလွှာ စိုစွတ်မှု အဆင့် ${num(soil)} (ရာခိုင်နှုန်းအဆင့်)` : `root-zone soil wetness ranks at the ${num(soil)}th percentile for this date`);
    if (r90 && a.triggers.drought.includes("rain_90d_pct")) why.push(lang === "my" ? `ပြီးခဲ့သော ရက် ၉၀ မိုးရေချိန် အဆင့် ${num(r90)}` : `last-90-day rainfall ranks at the ${num(r90)}th percentile`);
    recs.push({
      id: "drought_water",
      text: L({
        en: "Plan for possible water shortage: check how much irrigation water is available, give priority to crops at sensitive growth stages, and avoid unnecessary water use.",
        my: "ရေရှားပါးနိုင်မှုအတွက် ကြိုတင်စီစဉ်ပါ - ရရှိနိုင်သော ဆည်မြောင်းရေပမာဏကို စစ်ဆေးပြီး ရေလိုအပ်ချက် အရေးကြီးသော ကြီးထွားမှုအဆင့်ရှိ သီးနှံများကို ဦးစားပေးကာ မလိုအပ်သော ရေသုံးစွဲမှုကို ရှောင်ကြဉ်ပါ။",
      }),
      reason: (lang === "my" ? "အကြောင်းရင်း - " : "Reason: ") + (why.join(lang === "my" ? "၊ " : "; ") || L({ en: "drought indicator is raised", my: "မိုးခေါင်မှု ညွှန်ကိန်း မြင့်တက်နေသည်" })) + (lang === "my" ? "။" : "."),
      uncertainty: `${L(U_POINT)} ${L(U_NO_FORECAST)}`,
    });
    if (a.drySeasonAhead)
      recs.push({
        id: "drought_dry_season",
        text: L({
          en: "Do not rely on rain to restore soil moisture in the coming weeks; plan irrigation or drought-tolerant options with local extension officers.",
          my: "လာမည့် ရက်သတ္တပတ်များတွင် မိုးရေဖြင့် မြေစိုစွတ်မှု ပြန်လည်ရရှိမည်ဟု အားမကိုးပါနှင့်။ ဒေသ စိုက်ပျိုးရေး အရာရှိများနှင့် ဆည်မြောင်းရေ သို့မဟုတ် မိုးခေါင်ဒဏ်ခံနိုင်သော ရွေးချယ်မှုများကို စီစဉ်ပါ။",
        }),
        reason: L({
          en: `Reason: in past years this 30-day period was usually dry here (typical total ${num(fv(f, "hist_rain_p50"))} mm).`,
          my: `အကြောင်းရင်း - ယခင်နှစ်များတွင် ဤရက် ၃၀ ကာလသည် ဤနေရာ၌ ပုံမှန်အားဖြင့် ခြောက်သွေ့ခဲ့သည် (ပုံမှန် စုစုပေါင်း ${num(fv(f, "hist_rain_p50"))} mm)။`,
        }),
        uncertainty: L({ en: "This is a historical pattern, not a forecast; an unusual rain event is still possible.", my: "၎င်းသည် ယခင်နှစ်များ၏ ပုံစံသာ ဖြစ်ပြီး ခန့်မှန်းချက် မဟုတ်ပါ။ ပုံမှန်မဟုတ်သော မိုးရွာမှု ဖြစ်နိုင်ပါသေးသည်။" }),
      });
  }

  if (a.wet === "watch") {
    recs.push({
      id: "wet_drainage",
      text: L({
        en: "Check field drainage, keep stored seed, fertiliser and harvested grain off the ground and dry, and follow river-level and flood warnings from DMH and the Irrigation Department.",
        my: "လယ်ကွင်း ရေနုတ်မြောင်းများကို စစ်ဆေးပါ၊ သိုလှောင်ထားသော မျိုးစေ့၊ မြေသြဇာနှင့် ရိတ်သိမ်းပြီး စပါးကို မြေပြင်မှ မြှင့်ထားပြီး ခြောက်သွေ့အောင် ထားပါ၊ DMH နှင့် ဆည်မြောင်းဦးစီးဌာန၏ မြစ်ရေမျက်နှာပြင်နှင့် ရေကြီးမှု သတိပေးချက်များကို လိုက်နာပါ။",
      }),
      reason: L({
        en: "Reason: recent rainfall and/or soil wetness are unusually high for this date, or a very heavy rain day occurred in the last 7 days.",
        my: "အကြောင်းရင်း - မကြာသေးမီက မိုးရေချိန် နှင့်/သို့မဟုတ် မြေစိုစွတ်မှုသည် ဤရက်အတွက် ပုံမှန်ထက် အလွန်မြင့်နေခြင်း သို့မဟုတ် ပြီးခဲ့သော ၇ ရက်အတွင်း အလွန်ပြင်းထန်သော မိုးရက် ရှိခဲ့ခြင်း။",
      }),
      uncertainty: L({
        en: "This indicator uses rainfall and soil wetness only; river levels and flood forecasts are not included yet.",
        my: "ဤညွှန်ကိန်းသည် မိုးရေချိန်နှင့် မြေစိုစွတ်မှုကိုသာ အသုံးပြုပြီး မြစ်ရေမျက်နှာပြင်နှင့် ရေကြီးမှု ခန့်မှန်းချက်များ မပါဝင်သေးပါ။",
      }),
    });
  }

  const heavyYears = fv(f, "hist_heavy_years");
  const years = fv(f, "hist_years");
  if (heavyYears && years && heavyYears.value / years.value >= 0.3 && !a.drySeasonAhead) {
    recs.push({
      id: "heavy_rain_season",
      text: L({
        en: "Keep drainage channels clear and avoid leaving harvested crops in low-lying fields during this period.",
        my: "ဤကာလအတွင်း ရေနုတ်မြောင်းများကို ရှင်းလင်းထားပြီး ရိတ်သိမ်းပြီး သီးနှံများကို နိမ့်သော လယ်ကွက်များတွင် မထားခဲ့ပါနှင့်။",
      }),
      reason: L({
        en: `Reason: at least one very heavy rain day happened in these 30 calendar days in ${num(heavyYears)} of ${num(years)} past years.`,
        my: `အကြောင်းရင်း - ယခင်နှစ် ${num(years)} နှစ်အနက် ${num(heavyYears)} နှစ်တွင် ဤရက် ၃၀ အတွင်း အလွန်ပြင်းထန်သော မိုးရက် အနည်းဆုံး တစ်ရက် ရှိခဲ့သည်။`,
      }),
      uncertainty: L({ en: "Historical frequency only — not a forecast for this year.", my: "ယခင်နှစ်များ၏ ကြိမ်နှုန်းသာ ဖြစ်ပြီး ယခုနှစ်အတွက် ခန့်မှန်းချက် မဟုတ်ပါ။" }),
    });
  }

  if (a.heat === "unusual") {
    recs.push({
      id: "heat",
      text: L({
        en: "Plan field work for cooler hours and watch crops and livestock for heat stress; make sure animals have water and shade.",
        my: "လယ်ယာလုပ်ငန်းများကို အေးသောအချိန်တွင် စီစဉ်ပြီး သီးနှံနှင့် မွေးမြူရေး တိရစ္ဆာန်များ အပူဒဏ်ခံရမှုကို စောင့်ကြည့်ပါ၊ တိရစ္ဆာန်များအတွက် ရေနှင့် အရိပ် ရှိစေပါ။",
      }),
      reason: L({
        en: `Reason: the hottest day of the last 7 days ranks at the ${num(fv(f, "tmax_7d_pct"))}th percentile for this season.`,
        my: `အကြောင်းရင်း - ပြီးခဲ့သော ၇ ရက်အတွင်း အပူဆုံးနေ့သည် ဤရာသီအတွက် အဆင့် ${num(fv(f, "tmax_7d_pct"))} တွင် ရှိသည်။`,
      }),
      uncertainty: L(U_POINT),
    });
  }

  if (!recs.length) {
    recs.push({
      id: "no_signal",
      text: L({
        en: "No unusual drought, wet or heat signal in the NASA data: continue normal farm planning.",
        my: "NASA အချက်အလက်တွင် ပုံမှန်မဟုတ်သော မိုးခေါင်မှု၊ စိုစွတ်မှု သို့မဟုတ် အပူ အချက်ပြမှု မတွေ့ရပါ - ပုံမှန် လယ်ယာ စီမံကိန်းအတိုင်း ဆက်လုပ်ပါ။",
      }),
      reason: L({
        en: a.available ? "Reason: rainfall, soil wetness and temperature rank within the usual range for this date." : "Reason: long-term comparison data was not available.",
        my: a.available ? "အကြောင်းရင်း - မိုးရေချိန်၊ မြေစိုစွတ်မှုနှင့် အပူချိန်တို့သည် ဤရက်အတွက် ပုံမှန်အတိုင်းအတာအတွင်း ရှိသည်။" : "အကြောင်းရင်း - ရေရှည် နှိုင်းယှဉ် အချက်အလက် မရရှိပါ။",
      }),
      uncertainty: `${L(U_POINT)} ${L(U_NO_FORECAST)}`,
    });
  }

  recs.push({
    id: "official_forecast",
    text: L({
      en: "Before planting, harvesting or irrigation decisions, check the official DMH weather forecasts and warnings.",
      my: "စိုက်ပျိုးခြင်း၊ ရိတ်သိမ်းခြင်း သို့မဟုတ် ရေသွင်းခြင်း ဆုံးဖြတ်ချက်များ မချမီ DMH ၏ တရားဝင် မိုးလေဝသ ခန့်မှန်းချက်နှင့် သတိပေးချက်များကို စစ်ဆေးပါ။",
    }),
    reason: L({ en: "Reason: EarthLens shows past NASA observations; DMH issues the official forecasts for Myanmar.", my: "အကြောင်းရင်း - EarthLens သည် ယခင် NASA တိုင်းတာချက်များကို ပြသပြီး DMH သည် မြန်မာနိုင်ငံအတွက် တရားဝင် ခန့်မှန်းချက်များကို ထုတ်ပြန်သည်။" }),
    uncertainty: "",
  });
  return recs;
}
