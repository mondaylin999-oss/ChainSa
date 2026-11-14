/**
 * ANSWER FORMAT — edit this file to change how the chatbot answers.
 *
 * Every answer has the same six sections in English and Myanmar:
 *   1 Current Conditions   — built by the server from NASA POWER values (dates + units)
 *   2 30-Day Outlook       — built by the server: validated forecast (none yet) + clearly labelled historical pattern
 *   3 Potential Impacts    — written by the AI (numbers checked) or by the template when no AI is available
 *   4 Decision Support     — rule-based recommendations, each with its reason and uncertainty
 *   5 Data Sources         — datasets, links, data dates, model and validation information
 *   6 Important Disclaimer — the fixed disclaimer text below
 *
 * Sections 1, 2, 4, 5 and 6 are never written by the AI, so historical data can never be
 * presented as a forecast and no percentages can be invented there.
 */

import type { Lang } from "../types";

export type SectionId = "current" | "outlook" | "impacts" | "decision" | "sources" | "disclaimer";

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
  /** Added under the disclaimer while no validated forecasting model is used. */
  noModelNote: Record<Lang, string>;
  /** Shown above the recommendations until agricultural experts have reviewed the rules. */
  decisionSupportStatus: Record<Lang, string> | null;
  /** Extra rules appended to the AI instructions. */
  extraRules: string[];
}

// Myanmar headings and notes are new translations — please have a native speaker review them.
// The two disclaimer texts are exactly as specified by the project owner.
export const answerFormat: AnswerFormat = {
  sections: [
    { id: "current", heading: { en: "Current Conditions", my: "လက်ရှိ အခြေအနေ" } },
    { id: "outlook", heading: { en: "30-Day Future Outlook", my: "လာမည့် ရက် ၃၀ အလားအလာ" } },
    { id: "impacts", heading: { en: "Potential Impacts", my: "ဖြစ်နိုင်သော သက်ရောက်မှုများ" } },
    { id: "decision", heading: { en: "Decision Support", my: "ဆုံးဖြတ်ချက်ချရန် အထောက်အကူ" } },
    { id: "sources", heading: { en: "Data Sources", my: "အချက်အလက် ရင်းမြစ်များ" } },
    { id: "disclaimer", heading: { en: "Important Disclaimer", my: "အရေးကြီး သတိပေးချက်" } },
  ],
  numberHeadings: true,
  aiMaxWords: 160,
  showUnits: true,
  showDates: true,
  showSourceLinks: true,
  disclaimer: {
    en: "This is an estimate based on NASA Earth observation data and the forecasting model used. Actual conditions may differ, and the results are not guaranteed.",
    my: "ဤခန့်မှန်းချက်သည် NASA မှ ရရှိသော ကမ္ဘာမြေလေ့လာရေးအချက်အလက်များနှင့် အသုံးပြုထားသော ခန့်မှန်းမော်ဒယ်အပေါ် အခြေခံထားသည့် ခန့်မှန်းသုံးသပ်ချက်သာ ဖြစ်ပါသည်။ ရလဒ်များသည် အမှန်တကယ်ဖြစ်ပေါ်မည့် အခြေအနေကို အာမမခံပါ။",
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
