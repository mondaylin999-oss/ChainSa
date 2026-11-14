import { handleChatPost } from "@/features/earthlens-chat/server/handler";

// Node.js runtime: in-memory rate limiting and caching need a long-lived process.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleChatPost(request);
}
