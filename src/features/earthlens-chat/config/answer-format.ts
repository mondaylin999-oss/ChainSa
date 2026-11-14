/**
 * ANSWER FORMAT — edit this file to change how the chatbot answers.
 *
 * Every environmental answer starts with an Executive Summary, followed by six numbered detailed sections:
 *   Executive Summary              — 2–4 sentences: direct answer (AI, numbers checked, or template) + key findings,
 *                                    main impact and main option, all taken from the sections below
 *   Detailed Analysis
 *   1 Current NASA Data            — compact table: latest value · typical past value · calculated difference
 *   2 Historical Comparison        — one or two sentences: how the latest values rank against past years
 *   3 Next 30-Day Outlook          — validated forecast (none yet) + one clearly labelled historical-pattern sentence
 *   4 Evidence-Based Action Cards  — rule-based cards built from NASA facts, each with a confidence level
 *   5 Data Sources                 — datasets, observation dates, links, forecast model
 *   6 Disclaimer                   — the fixed disclaimer text below, always the last text, added by the server
 *
 * Only the first sentence of the summary is written by the AI, so it cannot invent evidence, cards, forecasts or percentages.
 * Questions that are not about the environment get a short answer plus `generalDisclaimer`.
 */

import type { Lang } from "../types";

export type SectionId = "summary" | "current" | "history" | "outlook" | "actions" | "sources" | "disclaimer";

export interface AnswerFormat {
  /** Section order and headings. Numbers are added automatically when `numberHeadings` is true. */
  sections: { id: SectionId; heading: Record<Lang, string> }[];
  numberHeadings: boolean;
  /** Word limit for the AI-written part (section 3). */
  aiMaxWords: number;
  showUnits: boolean;
  showDates: boolean;
  showSourceLinks: boolean;
  /** Heading shown between the Executive Summary and the numbered detailed sections. */
  detailedHeading: Record<Lang, string>;
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
    { id: "summary", heading: { en: "Executive Summary", my: "အကျဉ်းချုပ်အဖြေ" } },
    { id: "current", heading: { en: "Current NASA Data", my: "လက်ရှိ NASA အချက်အလက်" } },
    { id: "history", heading: { en: "Historical Comparison", my: "ယခင်မှတ်တမ်းများနှင့် နှိုင်းယှဉ်ချက်" } },
    { id: "outlook", heading: { en: "Next 30-Day Outlook", my: "လာမည့် ရက် ၃၀ အလားအလာ" } },
    { id: "actions", heading: { en: "Evidence-Based Action Cards", my: "အထောက်အထားအခြေပြု လုပ်ဆောင်ချက် ကတ်များ" } },
    { id: "sources", heading: { en: "Data Sources", my: "အချက်အလက် ရင်းမြစ်များ" } },
    { id: "disclaimer", heading: { en: "Disclaimer", my: "သတိပေးချက်" } },
  ],
  numberHeadings: true,
  detailedHeading: { en: "Detailed Analysis", my: "အသေးစိတ်အချက်အလက်" },
  aiMaxWords: 60,
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
