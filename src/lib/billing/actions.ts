"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantUsage } from "@/lib/tenancy/context";

export async function dismissUsageWarning(resource: string) {
  const parsed = z
    .enum(["conversations", "numbers", "seats", "templates", "flows"])
    .safeParse(resource);
  if (!parsed.success) return false;
  const { context, usagePeriodStart } = await tenantUsage();
  const { error } = await createAdminClient()
    .from("usage_warning_dismissals")
    .upsert({
      tenant_id: context.tenantId,
      user_id: context.userId,
      period_start: usagePeriodStart,
      resource: parsed.data,
    });
  return !error;
}
