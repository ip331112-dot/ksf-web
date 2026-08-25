"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Used only for the admin sign-in form — everything that
 * reads data does so on the server. The publishable key is safe here by
 * design; row-level security is what protects the data, not the key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
