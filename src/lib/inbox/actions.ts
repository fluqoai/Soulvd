"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { tenantContext } from "@/lib/tenancy/context";
export async function readConversation(tenant: string, message: string) {
  if (!z.uuid().safeParse(message).success) return false;
  const context = await tenantContext();
  if (!context || context.tenantId !== tenant) return false;
  const db = await createClient();
  const { error } = await db.rpc("soulvd_read_inbox", {
    p_tenant: tenant,
    p_message: message,
  });
  return !error;
}
