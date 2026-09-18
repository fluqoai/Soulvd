import { secretMatches } from "@/lib/meta/security";
import { dispatchOne } from "@/lib/meta/worker";
import { runStudioWorker } from "@/lib/studio/worker";
import { reconcileWallet } from "@/lib/billing/wallet-worker";
import { runCampaignWorker } from "@/lib/growth/worker";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (
    !secretMatches(
      request.headers.get("authorization"),
      process.env.META_WORKER_SECRET
        ? `Bearer ${process.env.META_WORKER_SECRET}`
        : undefined,
    )
  )
    return new Response("Forbidden", { status: 403 });
  try {
    const results = [];
    const [, result] = await Promise.all([
      runStudioWorker(),
      dispatchOne(),
      reconcileWallet(),
      runCampaignWorker(),
    ]);
    if (result) results.push(result);
    return Response.json(
      { processed: results.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response("Worker unavailable", { status: 503 });
  }
}
