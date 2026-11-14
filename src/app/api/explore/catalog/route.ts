import { getConfig } from "@/features/earthlens-chat/server/env";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { DATASETS, TOPICS } from "@/features/explorer/catalog";

import townshipDirectory from "../../../../../public/townships.json";

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
    townships: townshipDirectory.townships,
    townshipCoverage: {
      available: true,
      observationsAvailable: false,
      reason: "MIMU township names and boundaries are available for map selection. NASA observations still use regional reference points, not township averages.",
    },
  }, { headers: { "cache-control": "no-store" } });
}
