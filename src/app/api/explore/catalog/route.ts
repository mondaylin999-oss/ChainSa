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
      observationsAvailable: true,
      reason: "MIMU township boundaries support selection. NASA POWER uses a point inside the selected township, or the regional reference point when no township is selected. Values are not area averages; nearby selections may share a NASA grid cell.",
    },
  }, { headers: { "cache-control": "no-store" } });
}
