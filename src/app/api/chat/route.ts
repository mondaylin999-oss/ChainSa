import { handleChatPost } from "@/features/earthlens-chat/server/handler";

// Same handler as /api/earthlens-chat. Kept at /api/chat because the original EarthLens
// front end posts its chat panel here ({ message, sessionId, selectedRegionId, mode, history }).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleChatPost(request);
}
