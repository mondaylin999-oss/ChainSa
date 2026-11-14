import { siteStatus } from "@/features/earthlens-site/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which data services are configured — never the keys themselves. */
export function GET() {
  return Response.json(siteStatus(), { headers: { "cache-control": "no-store" } });
}
