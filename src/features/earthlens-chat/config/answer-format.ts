/**
 * ANSWER FORMAT — edit this file to change how the chatbot answers.
 *
 * Every environmental answer has the same eight sections in English and Myanmar:
 *   1 Direct Answer                 — first sentence written by the AI (numbers checked), or a rule-based template
 *   2 Current NASA Data             — built by the server from NASA POWER/FIRMS values (dates, units, datasets)
 *   3 Historical Data Comparison    — built by the server: percentile ranks vs the same dates since 1981
 *   4 Next 30-Day Outlook           — built by the server: validated forecast (none yet) + clearly labelled historical pattern
 *   5 Potential Risks and Impacts   — written by the AI (numbers checked) or by the template
 *   6 Decision Support              — rule-based recommendations, each with its reason and uncertainty
 *   7 Data Sources and Forecast Model — datasets, links, data dates, model and validation information
 *   8 Disclaimer                    — the fixed disclaimer text below, always appended by the server
 *
 * Sections 2, 3, 4, 6, 7 and 8 are never written by the AI, so historical data can never be
 * presented as a forecast and no percentages can be invented there.
 * Questions that are not about the environment get a short answer plus `generalDisclaimer`.
 */

import type { Lang } from "../types";

export type SectionId = "direct" | "current" | "history" | "outlook" | "impacts" | "decision" | "sources" | "disclaimer";

export interface AnswerFormat {
  /** Section order and headings. Numbers are added automatically when `numberHeadings` is true. */
  sections: { id: SectionId; heading: Record<Lang, string> }[];
  numberHeadings: boolean;
  /** Word limit for the AI-written part (section 3). */
  aiMaxWords: number;
  showUnits: boolean;
  showDates: boolean;
  showSourceLinks: boolean;
  /** Exact disclaimer text (required wording — do not shorten). */
  disclaimer: Record<Lang, string>;
  /** Disclaimer for questions that are not about the environment (no NASA data used). */
  generalDisclaimer: Record<Lang, string>;
  /** Added under the disclaimer while no validated forecasting model is used. */
  noModelNote: Record<Lang, string>;
  /** Shown above the recommendations until agricultural experts have reviewed the rules. */
  decisionSupportStatus: Record<Lang, string> | null;
  /** Extra rules appended to the AI instructions. */
  extraRules: string[];
}

// Myanmar headings and notes are new translations — please have a native speaker review them.
// The two NASA disclaimer texts are exactly as specified in the project brief (Nov 2026).
export const answerFormat: AnswerFormat = {
  sections: [
    { id: "direct", heading: { en: "Direct Answer", my: "တိုက်ရိုက် အဖြေ" } },
    { id: "current", heading: { en: "Current NASA Data", my: "လက်ရှိ NASA အချက်အလက်" } },
    { id: "history", heading: { en: "Historical Data Comparison", my: "ယခင်မှတ်တမ်းများနှင့် နှိုင်းယှဉ်ချက်" } },
    { id: "outlook", heading: { en: "Next 30-Day Outlook", my: "လာမည့် ရက် ၃၀ အလားအလာ" } },
    { id: "impacts", heading: { en: "Potential Risks and Impacts", my: "ဖြစ်နိုင်သော အန္တရာယ်နှင့် သက်ရောက်မှုများ" } },
    { id: "decision", heading: { en: "Decision Support and Recommendations", my: "ဆုံးဖြတ်ချက်ချရန် အထောက်အကူနှင့် အကြံပြုချက်များ" } },
    { id: "sources", heading: { en: "Data Sources and Forecast Model", my: "အချက်အလက် ရင်းမြစ်များနှင့် ခန့်မှန်းမော်ဒယ်" } },
    { id: "disclaimer", heading: { en: "Disclaimer", my: "သတိပေးချက်" } },
  ],
  numberHeadings: true,
  aiMaxWords: 160,
  showUnits: true,
  showDates: true,
  showSourceLinks: true,
  disclaimer: {
    en: "The analysis and forecasts provided are based on NASA Earth observation data, relevant historical records, and the forecasting models used. They represent estimated future possibilities and do not guarantee actual future conditions.",
    my: "ဤအဖြေတွင် ဖော်ပြထားသော ခန့်မှန်းသုံးသပ်ချက်များသည် NASA မှ ရရှိသော ကမ္ဘာမြေလေ့လာရေးအချက်အလက်များ၊ သက်ဆိုင်ရာ အတိတ်မှတ်တမ်းများနှင့် အသုံးပြုထားသော ခန့်မှန်းမော်ဒယ်များအပေါ် အခြေခံထားခြင်းဖြစ်ပါသည်။ ၎င်းတို့သည် ဖြစ်နိုင်ခြေကို ခန့်မှန်းသုံးသပ်ထားခြင်းသာဖြစ်ပြီး အမှန်တကယ် ဖြစ်ပေါ်လာမည်ဟု အာမခံခြင်း မဟုတ်ပါ။",
  },
  // Not specified by the project brief — please review. Used when no NASA data was involved.
  generalDisclaimer: {
    en: "This is a general answer from the EarthLens Assistant. It does not use NASA Earth observation data and may contain mistakes; please check important information with a reliable source.",
    my: "ဤအဖြေသည် EarthLens လက်ထောက်၏ ယေဘုယျ အဖြေသာ ဖြစ်ပါသည်။ NASA ကမ္ဘာမြေလေ့လာရေး အချက်အလက်ကို အသုံးမပြုထားဘဲ အမှားပါနိုင်သဖြင့် အရေးကြီးသော အချက်များကို ယုံကြည်ရသော ရင်းမြစ်ဖြင့် စစ်ဆေးပါ။",
  },
  noModelNote: {
    en: "Note: no forecasting model was used in this answer yet; the outlook section shows past patterns only.",
    my: "မှတ်ချက် - ဤအဖြေတွင် ခန့်မှန်းမော်ဒယ် အသုံးမပြုရသေးပါ။ အလားအလာ အပိုင်းတွင် ယခင်နှစ်များ၏ ပုံစံများကိုသာ ဖော်ပြထားပါသည်။",
  },
  decisionSupportStatus: {
    en: "General guidance based on the indicators above — pending review by agricultural experts.",
    my: "အထက်ပါ ညွှန်ကိန်းများအပေါ် အခြေခံသော ယေဘုယျ လမ်းညွှန်ချက် ဖြစ်ပါသည် — စိုက်ပျိုးရေး ကျွမ်းကျင်သူများ၏ စိစစ်ချက် စောင့်ဆိုင်းဆဲ။",
  },
  extraRules: [],
};
