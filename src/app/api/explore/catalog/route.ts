import { REGIONS } from "@/features/earthlens-chat/regions";
import { DATASETS, TOPICS } from "@/features/explorer/catalog";
import { PUBLIC_MODIS_DATASETS } from "@/features/explorer/server/modis-products";
import { BLACK_MARBLE_DATASETS } from "@/features/explorer/satellite-products";
import { blackMarbleState, earthEngineState, sourceStatuses } from "@/features/explorer/server/availability";

import townshipDirectory from "../../../../../public/townships.json";

export const runtime = "nodejs";
// Access checks may contact NASA and Earth Engine before returning the catalogue.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  // Availability reflects verified access (credentials actually accepted), not just non-empty settings.
  const { ee, token } = await sourceStatuses();
  const datasets = DATASETS.map((dataset) => {
    if (dataset.engine !== "earth-engine") return dataset;
    const state = BLACK_MARBLE_DATASETS.has(dataset.id) ? blackMarbleState(token, ee) : earthEngineState(ee, PUBLIC_MODIS_DATASETS.has(dataset.id));
    return { ...dataset, available: state.available, setupRequired: state.setupRequired, reason: state.reason ?? dataset.reason, access: state.access };
  });
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
