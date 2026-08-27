"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, type LeadStatus } from "./schema";

/**
 * Only async functions may be exported from a `"use server"` module —
 * every export becomes a callable endpoint. The status list and the
 * result type therefore live in ./schema, not here.
 */
const input = z.object({
  leadId: z.uuid("That is not a valid enquiry id."),
  status: z.enum(LEAD_STATUSES),
});

type StatusResult = { ok: boolean; error?: string };

/**
 * Move one enquiry to a new status.
 *
 * Three layers of authorisation, deliberately: a session check, an
 * explicit `admins` lookup, and the RLS policy itself. Rendering the
 * buttons only on an admin page is not a security boundary — a Server
 * Action is a POST endpoint that anyone can call directly, without ever
 * loading the page that shows the control.
 *
 * The update runs through the session-bound client, not the service role,
 * so the `admins update lead status` policy is the thing that actually
 * decides. An elevated key here would silently bypass the protection the
 * schema was designed around.
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<StatusResult> {
  const parsed = input.safeParse({ leadId, status });
  if (!parsed.success) {
    return { ok: false, error: "That change was not understood." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };

  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "This account is not staff." };

  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.leadId);

  if (error) {
    console.error("[admin] Status update failed:", error.message);
    return { ok: false, error: "Could not save that. Please try again." };
  }

  // Re-renders the queue in the same response, so the badge and the three
  // counters move together rather than drifting apart.
  revalidatePath("/admin");
  return { ok: true };
}
