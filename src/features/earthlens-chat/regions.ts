// Myanmar states/regions — copied from the Myanmar EarthLens demo (names, Myanmar names,
// ISO codes and the single representative grid point used for NASA POWER queries).

export interface Region {
  id: string;
  iso: string;
  name: string;
  nameMy: string;
  type: "State" | "Region" | "Union Territory";
  lat: number;
  lon: number;
  coastal: boolean;
}

export const REGIONS: Region[] = [
  { id: "kachin", iso: "MM-11", name: "Kachin", nameMy: "ကချင်ပြည်နယ်", type: "State", lat: 25.79, lon: 97.3, coastal: false },
  { id: "kayah", iso: "MM-12", name: "Kayah", nameMy: "ကယားပြည်နယ်", type: "State", lat: 19.27, lon: 97.35, coastal: false },
  { id: "kayin", iso: "MM-13", name: "Kayin", nameMy: "ကရင်ပြည်နယ်", type: "State", lat: 17.4, lon: 97.65, coastal: false },
  { id: "chin", iso: "MM-14", name: "Chin", nameMy: "ချင်းပြည်နယ်", type: "State", lat: 21.93, lon: 93.37, coastal: false },
  { id: "mon", iso: "MM-15", name: "Mon", nameMy: "မွန်ပြည်နယ်", type: "State", lat: 16.3, lon: 97.81, coastal: true },
  { id: "rakhine", iso: "MM-16", name: "Rakhine", nameMy: "ရခိုင်ပြည်နယ်", type: "State", lat: 20.27, lon: 93.64, coastal: true },
  { id: "shan", iso: "MM-17", name: "Shan", nameMy: "ရှမ်းပြည်နယ်", type: "State", lat: 21.52, lon: 98.16, coastal: false },
  { id: "sagaing", iso: "MM-01", name: "Sagaing", nameMy: "စစ်ကိုင်းတိုင်းဒေသကြီး", type: "Region", lat: 23.7, lon: 95.18, coastal: false },
  { id: "bago", iso: "MM-02", name: "Bago", nameMy: "ပဲခူးတိုင်းဒေသကြီး", type: "Region", lat: 18.52, lon: 96.15, coastal: false },
  { id: "magway", iso: "MM-03", name: "Magway", nameMy: "မကွေးတိုင်းဒေသကြီး", type: "Region", lat: 19.65, lon: 94.88, coastal: false },
  { id: "mandalay", iso: "MM-04", name: "Mandalay", nameMy: "မန္တလေးတိုင်းဒေသကြီး", type: "Region", lat: 21.4, lon: 95.95, coastal: false },
  { id: "tanintharyi", iso: "MM-05", name: "Tanintharyi", nameMy: "တနင်္သာရီတိုင်းဒေသကြီး", type: "Region", lat: 13.61, lon: 98.77, coastal: true },
  { id: "yangon", iso: "MM-06", name: "Yangon", nameMy: "ရန်ကုန်တိုင်းဒေသကြီး", type: "Region", lat: 17.11, lon: 96.11, coastal: true },
  { id: "ayeyarwady", iso: "MM-07", name: "Ayeyarwady", nameMy: "ဧရာဝတီတိုင်းဒေသကြီး", type: "Region", lat: 16.75, lon: 95.11, coastal: true },
  { id: "naypyidaw", iso: "MM-18", name: "Naypyidaw", nameMy: "နေပြည်တော် ပြည်ထောင်စုနယ်မြေ", type: "Union Territory", lat: 19.75, lon: 96.13, coastal: false },
];

/** Same default as the demo. */
export const DEFAULT_REGION_ID = "ayeyarwady";

export function getRegion(id?: string | null): Region | undefined {
  return id ? REGIONS.find((r) => r.id === id) : undefined;
}

// Keyword lists copied from the demo's region detector (English, alternative names, Myanmar).
const REGION_KEYWORDS: Record<string, string[]> = {
  ayeyarwady: ["ayeyarwady", "irrawaddy", "ဧရာဝတီ"],
  yangon: ["yangon", "rangoon", "ရန်ကုန်"],
  mandalay: ["mandalay", "မန္တလေး"],
  naypyidaw: ["naypyidaw", "nay pyi taw", "naypyitaw", "နေပြည်တော်"],
  sagaing: ["sagaing", "စစ်ကိုင်း"],
  magway: ["magway", "magwe", "မကွေး"],
  bago: ["bago", "pegu", "ပဲခူး"],
  tanintharyi: ["tanintharyi", "tenasserim", "တနင်္သာရီ"],
  rakhine: ["rakhine", "arakan", "ရခိုင်"],
  // kachin must come before chin: "kachin state" contains "chin state" (bug in the demo order).
  kachin: ["kachin", "ကချင်"],
  chin: ["chin state", "ချင်း"],
  kayah: ["kayah", "karenni", "ကယား"],
  kayin: ["kayin", "karen", "ကရင်"],
  mon: ["mon state", "mawlamyine", "မွန်"],
  shan: ["shan", "taunggyi", "ရှမ်း"],
};

/** Returns the first region named in the text, or undefined. */
export function detectRegion(text: string): Region | undefined {
  const t = text.toLowerCase();
  for (const [id, words] of Object.entries(REGION_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return getRegion(id);
  }
  if (/\bchin\b/.test(t)) return getRegion("chin");
  if (/\bmon\b/.test(t)) return getRegion("mon");
  return undefined;
}
