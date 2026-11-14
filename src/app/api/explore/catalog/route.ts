import { getConfig } from "@/features/earthlens-chat/server/env";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { DATASETS, TOPICS } from "@/features/explorer/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const datasets = DATASETS.map((dataset) => ({
    ...dataset,
    available: dataset.id === "fire-detections" ? Boolean(config.firmsMapKey) : dataset.available,
  }));
  return Response.json({
    topics: TOPICS,
    datasets,
    regions: REGIONS,
    townships: [],
    townshipCoverage: {
      available: false,
      reason: "No verified township records or boundaries are bundled. Available NASA observations use state/region representative points and are not township observations.",
    },
  }, { headers: { "cache-control": "no-store" } });
}
