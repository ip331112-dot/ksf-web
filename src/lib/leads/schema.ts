import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { fill } from "@/lib/locale";

/**
 * One schema, validated twice: in the browser for a fast, kind error
 * message, and again inside the server action because anything that
 * arrived over the wire is a claim, not a fact.
 *
 * Bounds mirror the CHECK constraints on `public.leads` exactly. If you
 * change one, change the migration too — a mismatch turns a friendly
 * field error into a 500.
 */
export function enquirySchema(t: Dictionary) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t.errors.nameShort)
      .max(120, t.errors.nameLong),

    email: z
      .email(t.errors.emailInvalid)
      .max(200, t.errors.emailLong),

    phone: z
      .string()
      .trim()
      .max(40, t.errors.phoneLong)
      .optional()
      .or(z.literal("")),

    service: z
      .string()
      .trim()
      .max(60)
      .optional()
      .or(z.literal("")),

    message: z
      .string()
      .trim()
      .min(10, t.errors.messageShort)
      .max(4000, fill(t.errors.textLong, { max: 4000 })),

    /** Which page the enquiry came from. Set by the form, not the visitor. */
    sourcePath: z.string().trim().max(200).optional().or(z.literal("")),

    /**
     * Honeypot. Hidden from people, irresistible to naive bots. A
     * non-empty value means we drop the submission and still return
     * success, so the bot learns nothing.
     */
    company: z.string().max(0).optional().or(z.literal("")),
  });
}

export type EnquiryInput = z.infer<ReturnType<typeof enquirySchema>>;

/**
 * The statuses a lead can hold, matching the CHECK constraint on
 * public.leads exactly.
 *
 * These live here rather than beside the admin action because a
 * `"use server"` module may only export async functions — everything it
 * exports becomes a callable endpoint, so a plain constant is a build
 * error. Shared values belong in a plain module like this one.
 */
export const LEAD_STATUSES = ["new", "read", "replied", "archived", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Field-level errors keyed by input name, plus a form-level message. */
export type EnquiryState = {
  ok: boolean;
  /** Shown above the form. Never reveals whether storage succeeded. */
  message?: string;
  errors?: Partial<Record<keyof EnquiryInput | "turnstile", string>>;
  /**
   * What the visitor typed, echoed back so a failed submission does not
   * empty the form. React resets an uncontrolled form once the action
   * resolves, and losing someone's message while telling them to send it
   * again is the rudest possible outcome.
   */
  values?: Partial<Record<"name" | "email" | "phone" | "service" | "message", string>>;
};

export const EMPTY_STATE: EnquiryState = { ok: false };
