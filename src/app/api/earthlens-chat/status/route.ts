import { chatStatus } from "@/features/earthlens-chat/server/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shows which providers are configured — never the keys themselves. */
export async function GET() {
  return Response.json(chatStatus(), { headers: { "cache-control": "no-store" } });
}
