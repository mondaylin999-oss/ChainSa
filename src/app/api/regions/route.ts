import { regionsResponse } from "@/features/earthlens-site/server/routes";

export const runtime = "nodejs";

/** Region catalogue + Natural Earth admin-1 boundaries for the map. */
export function GET() {
  return regionsResponse();
}
