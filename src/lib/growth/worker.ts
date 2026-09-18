import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOne } from "@/lib/meta/worker";
export async function runCampaignWorker() {
  const db = createAdminClient();
  // Bounded throughput. A slow 15s provider call still fits the shared 60s endpoint.
  // Durable admission and fair scheduling live in Postgres, never in this loop.
  const deadline = Date.now() + 25_000;
  for (let i = 0; i < 10 && Date.now() < deadline; i++) {
    const results = await Promise.all(
      Array.from({ length: 2 }, async () => {
        const { data, error } = await db.rpc("soulvd_campaign_tick");
        if (error) throw new Error("CAMPAIGN_WORKER_UNAVAILABLE");
        if (data?.allowed && data.id) await dispatchOne(data.id);
        return Boolean(data);
      }),
    );
    if (results.every((r) => !r)) break;
  }
}
