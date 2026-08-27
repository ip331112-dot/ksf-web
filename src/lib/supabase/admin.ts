import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. This key bypasses row-level security entirely, so
 * it must never reach the browser and must never be used in a page or
 * component — only inside a server action that has already validated its
 * input.
 *
 * `public.leads` has RLS enabled with zero policies, which makes this the
 * only way to write an enquiry. That is deliberate: the table is
 * unreachable from the anon key no matter what a caller sends.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Whether the enquiry pipeline can actually store anything. The contact
 * and service forms read this to decide between a live form and an honest
 * "not connected yet" notice — better to say so than to accept a
 * customer's message and drop it.
 */
export function isLeadPipelineReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
