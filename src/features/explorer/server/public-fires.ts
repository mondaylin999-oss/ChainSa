import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { parseFirmsCsv, pointInGeometry, type FireDetection } from "@/features/earthlens-chat/server/nasa/firms";
import type { Region } from "@/features/earthlens-chat/regions";
import { selectionBoundary } from "./earth-engine";

export const PUBLIC_FIRE_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv";
const cache = new TtlCache<FireDetection[]>(15 * 60 * 1000, 1);
export function clearPublicFireCacheForTests() { cache.clear(); }

/** Public, trailing-seven-day NOAA-20 feed; a successful empty selection is valid. */
export async function fetchPublicFires(region: Region, townshipId?: string, fetchImpl: typeof fetch = fetch) {
  let all = cache.get("noaa20");
  if (!all) {
    const response = await fetchImpl(PUBLIC_FIRE_URL, { signal: AbortSignal.timeout(25000), cache: "no-store" });
    if (!response.ok) throw new Error("NASA's public fire feed could not be retrieved. Please try again later.");
    const csv = await response.text();
    if (!csv.trimStart().startsWith("latitude,")) throw new Error("NASA's fire feed did not return observation records.");
    all = parseFirmsCsv(csv);
    if (!all.length) throw new Error("NASA's regional fire feed is empty. Coverage cannot currently be confirmed.");
    const latest = all.map(d => d.date).sort().at(-1)!;
    if (Date.now() - Date.parse(`${latest}T23:59:59Z`) > 2 * 86400000) throw new Error("NASA's public fire feed is out of date. Recent fire counts are temporarily unavailable.");
    cache.set("noaa20", all);
  }
  const geometry = await selectionBoundary(region, townshipId);
  const detections = all.filter(d => geometry ? pointInGeometry(d.lon, d.lat, geometry) : Math.abs(d.lon-region.lon) <= 0.1 && Math.abs(d.lat-region.lat) <= 0.1);
  return { detections, coverage: geometry ? "NOAA-20 VIIRS detections inside the selected boundary." : "NOAA-20 VIIRS detections within 0.1° of the regional reference point; a full boundary is not bundled.", latestFeedDate: all.map(d => d.date).sort().at(-1)! };
}
