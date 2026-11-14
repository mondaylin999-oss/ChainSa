/**
 * Questions for the AI on/off comparison: 10 English, 10 Myanmar, covering the main topics and some
 * harder phrasings (towns instead of states, informal wording, mixed language, follow-ups).
 * `selectedRegionId` simulates a region chosen on the map.
 */
export interface CompareQuestion {
  id: string;
  lang: "en" | "my";
  topic: string;
  message: string;
  selectedRegionId?: string;
}

export const QUESTIONS: CompareQuestion[] = [
  { id: "en-01", lang: "en", topic: "drought", message: "Is there a drought risk for rice farmers in Magway in the next 30 days?" },
  { id: "en-02", lang: "en", topic: "flood", message: "What is the flood risk in Ayeyarwady over the next month?" },
  { id: "en-03", lang: "en", topic: "crops", message: "How are conditions for crops in Mandalay right now?" },
  { id: "en-04", lang: "en", topic: "water", message: "Should we change irrigation water distribution from the reservoir in Sagaing?" },
  { id: "en-05", lang: "en", topic: "electricity", message: "Could hydropower electricity supply in Shan be affected by recent rainfall?" },
  { id: "en-06", lang: "en", topic: "heat", message: "Is it unusually hot in Bago this week?" },
  { id: "en-07", lang: "en", topic: "vegetation", message: "How green is the vegetation around Naypyidaw compared with past years?" },
  { id: "en-08", lang: "en", topic: "town (map region)", message: "My paddy near Pyay is turning yellow, is the weather the reason?", selectedRegionId: "bago" },
  { id: "en-09", lang: "en", topic: "informal", message: "rain ok for planting beans next week??", selectedRegionId: "magway" },
  { id: "en-10", lang: "en", topic: "emergency", message: "Do we need to evacuate because of flooding in Yangon?" },

  { id: "my-01", lang: "my", topic: "drought", message: "မကွေးတိုင်းဒေသကြီးရှိ စပါးတောင်သူများအတွက် လာမည့် ရက် ၃၀ အတွင်း မိုးခေါင်နိုင်ခြေ ရှိပါသလား။" },
  { id: "my-02", lang: "my", topic: "flood", message: "ဧရာဝတီတိုင်းဒေသကြီးတွင် လာမည့် တစ်လအတွင်း ရေကြီးနိုင်ခြေ မည်သို့ရှိပါသလဲ။" },
  { id: "my-03", lang: "my", topic: "crops", message: "မန္တလေးတိုင်းဒေသကြီးတွင် သီးနှံများအတွက် လက်ရှိ အခြေအနေ မည်သို့ရှိပါသလဲ။" },
  { id: "my-04", lang: "my", topic: "water", message: "စစ်ကိုင်းတိုင်းဒေသကြီးမှာ ဆည်ရေ ဖြန့်ဝေမှုကို ပြောင်းသင့်ပါသလား။" },
  { id: "my-05", lang: "my", topic: "electricity", message: "ရှမ်းပြည်နယ်မှာ မိုးရေချိန်ကြောင့် ရေအားလျှပ်စစ် ဓာတ်အားထုတ်လုပ်မှု ထိခိုက်နိုင်ပါသလား။" },
  { id: "my-06", lang: "my", topic: "heat", message: "ပဲခူးတိုင်းဒေသကြီးမှာ ဒီအပတ် ပုံမှန်ထက် ပိုပူနေပါသလား။" },
  { id: "my-07", lang: "my", topic: "vegetation", message: "နေပြည်တော်ပတ်ဝန်းကျင်က အပင်တွေ ယခင်နှစ်တွေနဲ့ယှဉ်ရင် ဘယ်လောက် စိမ်းလန်းပါသလဲ။" },
  { id: "my-08", lang: "my", topic: "town (map region)", message: "ပြည်မြို့နားက စပါးခင်းတွေ ဝါလာနေတယ်၊ ရာသီဥတုကြောင့်လား။", selectedRegionId: "bago" },
  { id: "my-09", lang: "my", topic: "mixed language", message: "Magway မှာ ပဲစိုက်ဖို့ rain ok လား", selectedRegionId: "magway" },
  { id: "my-10", lang: "my", topic: "emergency", message: "ရန်ကုန်မှာ ရေကြီးလို့ ရွှေ့ပြောင်းဖို့ လိုပါသလား။" },
];
