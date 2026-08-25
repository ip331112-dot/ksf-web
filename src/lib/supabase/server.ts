import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the caller's session cookies.
 *
 * Note what this deliberately is NOT: it uses the publishable key, not the
 * service role. Every query it makes is still subject to row-level
 * security, so a bug in a page cannot read data the signed-in user is not
 * entitled to. Admin access comes from the `admins` table and the policies
 * that check it, never from an elevated key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
