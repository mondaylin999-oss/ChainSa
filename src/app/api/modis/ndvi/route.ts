import { handleNdviGet } from "@/features/earthlens-site/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** NASA MODIS NDVI (vegetation greenness) for a Myanmar region or point. */
export async function GET(request: Request) {
  return handleNdviGet(request);
}
