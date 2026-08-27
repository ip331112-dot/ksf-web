import { z } from "zod";

/**
 * The four steps, one schema each.
 *
 * Split rather than one big object because the flow validates a step at a
 * time — you cannot tell someone their motivation is too short while they
 * are still on step 1. The union of these is what reaches the database,
 * and every bound matches the CHECK constraints in 0002_applications.sql.
 */

export const EXPERIENCE_LEVELS = [
  { value: "none", label: "None yet — starting from scratch" },
  { value: "some", label: "Some self-study or a home lab" },
  { value: "working", label: "Working in IT, but not in this area" },
  { value: "experienced", label: "Already working in this area" },
] as const;

export const stepAbout = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please give us your full name.")
    .max(120, "That name is too long for our records."),
  email: z
    .email("That does not look like an email address.")
    .max(200, "That email address is too long."),
  phone: z.string().trim().max(40, "That phone number is too long.").optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
});

export const stepExperience = z.object({
  experienceLevel: z.enum(
    EXPERIENCE_LEVELS.map((l) => l.value) as unknown as [string, ...string[]],
    { message: "Please choose the option closest to where you are." },
  ),
  occupation: z.string().trim().max(120, "Please keep this under 120 characters.").optional().or(z.literal("")),
  background: z.string().trim().max(2000, "Please keep this under 2000 characters.").optional().or(z.literal("")),
});

export const stepMotivation = z.object({
  motivation: z
    .string()
    .trim()
    .min(10, "Please tell us a little more — ten characters at least.")
    .max(2000, "Please keep this under 2000 characters."),
  goals: z.string().trim().max(2000, "Please keep this under 2000 characters.").optional().or(z.literal("")),
  weeklyHours: z
    .union([z.coerce.number().int().min(1, "At least one hour.").max(60, "Sixty hours is our maximum."), z.literal("")])
    .optional(),
});

export const stepReview = z.object({
  agreedTerms: z.literal(true, {
    message: "Please confirm you have read the terms.",
  }),
  /**
   * Only meaningful when payment is switched on: consenting to the
   * service starting immediately is what makes the 14-day distance
   * selling position defensible. Optional while applications are free.
   */
  agreedImmediateStart: z.boolean().optional(),
});

/** Everything the four steps collect, plus the anti-spam fields. */
export const applicationSchema = stepAbout
  .and(stepExperience)
  .and(stepMotivation)
  .and(stepReview)
  .and(
    z.object({
      courseSlug: z.string().trim().min(2).max(80),
      /** Honeypot — hidden from people, irresistible to naive bots. */
      company: z.string().max(0).optional().or(z.literal("")),
    }),
  );

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Field-level keys the form can highlight. */
export type ApplyErrors = Partial<Record<string, string>>;

export type ApplyResult =
  | { ok: true; reference: string; statusPath: string }
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

export const STEPS = [
  { n: 1, title: "About you", blurb: "How we reach you." },
  { n: 2, title: "Experience", blurb: "Where you are starting from." },
  { n: 3, title: "Motivation", blurb: "Why this track, and your time." },
  { n: 4, title: "Review", blurb: "Check and submit." },
] as const;

/** Which schema guards which step, for per-step validation in the form. */
export const STEP_SCHEMAS = [stepAbout, stepExperience, stepMotivation, stepReview] as const;
