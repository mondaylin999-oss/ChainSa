import { handleAnalyzePost } from "@/features/earthlens-site/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAnalyzePost(request);
}
