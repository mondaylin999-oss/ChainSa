import type { Lang } from "./types";

// chatTitle, chatWelcome, chatPlaceholder, send, sources and limitations are copied from the
// EarthLens demo dictionary. The other Myanmar strings are new — please have a native speaker review them.
export const UI_STRINGS = {
  en: {
    chatTitle: "EarthLens Assistant",
    chatWelcome:
      "Hi! Ask me about rainfall, temperature, wind or fires anywhere in Myanmar. I answer with NASA data and show how much of my answer the data supports.",
    chatPlaceholder: "Ask about environmental conditions…",
    send: "Send",
    close: "Close",
    context: "Context",
    liveData: "Live NASA data",
    sources: "NASA data sources",
    limitations: "Limitations & uncertainty",
    aiWritten: "AI-written",
    template: "template",
    numbersChecked: "numbers checked against NASA data",
    noData: "no NASA data",
    language: "Language",
    errorPrefix: "Sorry —",
    rateLimited: "Too many questions in a short time. Please wait a minute and try again.",
    suggestions: [
      "Is there a drought risk for rice farmers in Magway in the next 30 days?",
      "What is the flood risk in Ayeyarwady over the next month?",
      "How are conditions for crops in Mandalay right now?",
    ],
  },
  my: {
    chatTitle: "EarthLens လက်ထောက်",
    chatWelcome:
      "မင်္ဂလာပါ! မြန်မာနိုင်ငံ မည်သည့်နေရာ၏ မိုးရေချိန်၊ အပူချိန်၊ လေ သို့မဟုတ် မီးလောင်မှုအကြောင်း မေးနိုင်ပါသည်။ နာဆာ အချက်အလက်ဖြင့် ဖြေပြီး အထောက်အထား ရမှတ်ကိုပါ ပြပေးပါမည်။",
    chatPlaceholder: "ပတ်ဝန်းကျင် အခြေအနေအကြောင်း မေးပါ…",
    send: "ပို့မည်",
    close: "ပိတ်မည်",
    context: "နေရာ",
    liveData: "နာဆာ တိုက်ရိုက် အချက်အလက်",
    sources: "နာဆာ အချက်အလက် ရင်းမြစ်များ",
    limitations: "ကန့်သတ်ချက်များ",
    aiWritten: "AI ရေးသားချက်",
    template: "ပုံသေ ပုံစံ",
    numbersChecked: "ဂဏန်းများကို နာဆာ အချက်အလက်နှင့် စစ်ဆေးပြီး",
    noData: "နာဆာ အချက်အလက် မရရှိပါ",
    language: "ဘာသာစကား",
    errorPrefix: "တောင်းပန်ပါသည် —",
    rateLimited: "အချိန်တိုအတွင်း မေးခွန်းများလွန်းပါသည်။ တစ်မိနစ်ခန့် စောင့်ပြီး ထပ်မေးပါ။",
    suggestions: [
      "မကွေးတိုင်းဒေသကြီးရှိ စပါးတောင်သူများအတွက် လာမည့် ရက် ၃၀ အတွင်း မိုးခေါင်နိုင်ခြေ ရှိပါသလား။",
      "ဧရာဝတီတိုင်းဒေသကြီးတွင် လာမည့် တစ်လအတွင်း ရေကြီးနိုင်ခြေ မည်သို့ရှိပါသလဲ။",
      "မန္တလေးတိုင်းဒေသကြီးတွင် သီးနှံများအတွက် လက်ရှိ အခြေအနေ မည်သို့ရှိပါသလဲ။",
    ],
  },
} as const satisfies Record<Lang, Record<string, string | readonly string[]>>;

export type UiStrings = (typeof UI_STRINGS)["en"];

/** Myanmar script block U+1000–U+109F. If the message contains Myanmar letters, answer in Myanmar. */
export function detectLang(text: string, fallback: Lang = "en"): Lang {
  const mm = (text.match(/[က-႟]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (mm === 0 && latin === 0) return fallback;
  return mm >= latin * 0.3 ? "my" : "en";
}
