import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { fill } from "@/lib/locale";

/**
 * The step schemas only ever read error messages, so they ask for that
 * section alone. The apply form is a Client Component and receives a
 * narrowed dictionary as props — requiring the whole thing here would
 * force it to ship sections it never renders.
 */
type Errors = Pick<Dictionary, "errors">;

/**
 * The four steps, one schema each.
 *
 * Split rather than one big object because the flow validates a step at a
 * time — you cannot tell someone their motivation is too short while they
 * are still on step 1. The union of these is what reaches the database,
 * and every bound matches the CHECK constraints in 0002_applications.sql.
 *
 * Each is a factory taking the dictionary, so the message an applicant
 * reads is in the language they are applying in. The same factories run
 * twice: in the browser for a fast answer, and again inside the server
 * action, because what arrived over the wire is a claim, not a fact.
 */

/**
 * The stored values. Labels are deliberately absent — they live in the
 * dictionaries under `apply.levels`, keyed by these exact strings, so a
 * value written to the database never carries a language with it.
 */
export const EXPERIENCE_LEVELS = [
  "none",
  "some",
  "working",
  "experienced",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** The label for a stored value, in the reader's language. */
export function experienceLabel(t: Dictionary, value: string): string {
  return value in t.apply.levels
    ? t.apply.levels[value as ExperienceLevel]
    : value;
}

export const stepAbout = (t: Errors) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t.errors.nameRequired)
      .max(120, t.errors.nameLong),
    email: z.email(t.errors.emailInvalid).max(200, t.errors.emailLong),
    phone: z
      .string()
      .trim()
      .max(40, t.errors.phoneLong)
      .optional()
      .or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
  });

export const stepExperience = (t: Errors) =>
  z.object({
    experienceLevel: z.enum(
      EXPERIENCE_LEVELS as unknown as [string, ...string[]],
      { message: t.errors.levelRequired },
    ),
    occupation: z
      .string()
      .trim()
      .max(120, fill(t.errors.textLong, { max: 120 }))
      .optional()
      .or(z.literal("")),
    background: z
      .string()
      .trim()
      .max(2000, fill(t.errors.textLong, { max: 2000 }))
      .optional()
      .or(z.literal("")),
  });

export const stepMotivation = (t: Errors) =>
  z.object({
    motivation: z
      .string()
      .trim()
      .min(10, t.errors.motivationShort)
      .max(2000, fill(t.errors.textLong, { max: 2000 })),
    goals: z
      .string()
      .trim()
      .max(2000, fill(t.errors.textLong, { max: 2000 }))
      .optional()
      .or(z.literal("")),
    weeklyHours: z
      .union([
        z.coerce
          .number()
          .int()
          .min(1, t.errors.hoursMin)
          .max(60, t.errors.hoursMax),
        z.literal(""),
      ])
      .optional(),
  });

export const stepReview = (t: Errors) =>
  z.object({
    agreedTerms: z.literal(true, { message: t.errors.termsRequired }),
    /**
     * Only meaningful when payment is switched on: consenting to the
     * service starting immediately is what makes the 14-day distance
     * selling position defensible. Optional while applications are free.
     */
    agreedImmediateStart: z.boolean().optional(),
  });

/** Everything the four steps collect, plus the anti-spam fields. */
export const applicationSchema = (t: Errors) =>
  stepAbout(t)
    .and(stepExperience(t))
    .and(stepMotivation(t))
    .and(stepReview(t))
    .and(
      z.object({
        courseSlug: z.string().trim().min(2).max(80),
        /**
         * The language the applicant filled the form in.
         *
         * Server Actions cannot read `next/root-params`, so it travels
         * with the submission. Without it every validation message would
         * come back in English regardless of the page they are on.
         */
        locale: z.string().trim().max(5).optional(),
        /**
         * Honeypot. Accepted permissively here on purpose — the action
         * checks it BEFORE validating, so a filled one is silently
         * discarded rather than surfacing as a visible field error that
         * tells a bot it was caught.
         */
        company: z.string().optional(),
        /** Cloudflare Turnstile token, read from the widget on step 4. */
        turnstileToken: z.string().optional(),
      }),
    );

export type ApplicationInput = z.infer<ReturnType<typeof applicationSchema>>;

/** Field-level keys the form can highlight. */
export type ApplyErrors = Partial<Record<string, string>>;

export type ApplyResult =
  | {
      ok: true;
      reference: string;
      statusPath: string;
      /**
       * Whether the confirmation email actually went out. The success
       * page uses this to decide between "check your inbox" and "save
       * this link, it is your only copy" — telling someone to check an
       * inbox nothing was sent to is how status links get lost.
       */
      emailed?: boolean;
    }
  | { ok: false; message: string; errors?: ApplyErrors; step?: number };

/** The shape held in localStorage between steps. */
export type ApplyDraft = {
  name: string;
  email: string;
  phone: string;
  country: string;
  experienceLevel: string;
  occupation: string;
  background: string;
  motivation: string;
  goals: string;
  weeklyHours: string;
  agreedTerms: boolean;
  agreedImmediateStart: boolean;
};

export const EMPTY_DRAFT: ApplyDraft = {
  name: "",
  email: "",
  phone: "",
  country: "",
  experienceLevel: "",
  occupation: "",
  background: "",
  motivation: "",
  goals: "",
  weeklyHours: "",
  agreedTerms: false,
  agreedImmediateStart: false,
};

/**
 * The four steps, as dictionary keys rather than words. `apply.steps`
 * holds a title and a blurb for each.
 */
export const STEPS = [
  { n: 1, key: "about" },
  { n: 2, key: "experience" },
  { n: 3, key: "motivation" },
  { n: 4, key: "review" },
] as const;

/** Which schema guards which step, for per-step validation in the form. */
export const stepSchemas = (t: Errors) =>
  [stepAbout(t), stepExperience(t), stepMotivation(t), stepReview(t)] as const;
