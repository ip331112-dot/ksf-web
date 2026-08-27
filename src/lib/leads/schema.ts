import { z } from "zod";

/**
 * One schema, validated twice: in the browser for a fast, kind error
 * message, and again inside the server action because anything that
 * arrived over the wire is a claim, not a fact.
 *
 * Bounds mirror the CHECK constraints on `public.leads` exactly. If you
 * change one, change the migration too — a mismatch turns a friendly
 * field error into a 500.
 */
export const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please give us your name.")
    .max(120, "That name is too long for our records."),

  email: z
    .email("That does not look like an email address.")
    .max(200, "That email address is too long."),

  phone: z
    .string()
    .trim()
    .max(40, "That phone number is too long.")
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
    .min(10, "Please tell us a little more — ten characters at least.")
    .max(4000, "Please keep this under 4000 characters."),

  /** Which page the enquiry came from. Set by the form, not the visitor. */
  sourcePath: z.string().trim().max(200).optional().or(z.literal("")),

  /**
   * Honeypot. Hidden from people, irresistible to naive bots. A non-empty
   * value means we drop the submission and still return success, so the
   * bot learns nothing.
   */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

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
