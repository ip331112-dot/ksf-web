import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome =
  | { ok: true }
  | { ok: false; reason: "missing-token" | "rejected" | "unreachable" | "not-configured" };

/** Whether Cloudflare Turnstile is configured on this deployment. */
export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

/**
 * Verify a Turnstile token with Cloudflare.
 *
 * Behaviour when TURNSTILE_SECRET_KEY is absent:
 *
 *   development             allowed, so the form can be worked on locally
 *   production              REFUSED, unless ENQUIRIES_WITHOUT_TURNSTILE=true
 *
 * The production refusal is deliberate — shipping without a challenge
 * leaves the enquiry table open to bots, and a silent downgrade is the
 * kind of thing nobody notices until the spam arrives.
 *
 * But an unexplained total outage is its own failure, and this one cost a
 * confused afternoon: every submission failing with a generic "we could
 * not send that", no clue why. So the refusal now logs exactly what is
 * wrong and how to resolve it, and there is a documented escape hatch for
 * launching before the Cloudflare account exists. Set it knowingly.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<TurnstileOutcome> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV !== "production") return { ok: true };

    if (process.env.ENQUIRIES_WITHOUT_TURNSTILE === "true") {
      console.warn(
        "[turnstile] Running WITHOUT bot protection: TURNSTILE_SECRET_KEY is " +
          "unset and ENQUIRIES_WITHOUT_TURNSTILE=true. The honeypot and rate " +
          "limit are still active. Add Turnstile keys and remove this flag.",
      );
      return { ok: true };
    }

    console.error(
      "[turnstile] Enquiry REFUSED: TURNSTILE_SECRET_KEY is not set and this " +
        "is a production build, so every submission will fail. Either add " +
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or set " +
        "ENQUIRIES_WITHOUT_TURNSTILE=true to accept enquiries without a " +
        "challenge.",
    );
    return { ok: false, reason: "not-configured" };
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
