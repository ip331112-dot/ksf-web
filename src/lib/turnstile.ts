import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome =
  | { ok: true }
  | { ok: false; reason: "missing-token" | "rejected" | "unreachable" };

/** Whether Cloudflare Turnstile is configured on this deployment. */
export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

/**
 * Verify a Turnstile token with Cloudflare.
 *
 * When the keys are absent this returns ok in development so the form can
 * be worked on locally, but NOT in production — shipping without a
 * challenge would quietly leave the enquiry table open to bots, and a
 * silent downgrade is exactly the kind of thing nobody notices until the
 * spam arrives.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<TurnstileOutcome> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, reason: "unreachable" }
      : { ok: true };
  }

  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Cloudflare is usually fast; a hung request must not hold the form.
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
