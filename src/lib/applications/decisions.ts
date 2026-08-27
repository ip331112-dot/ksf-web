/**
 * Decision vocabulary, shared between the server action and the panel.
 *
 * Lives here rather than beside the action because a `"use server"`
 * module may only export async functions — the same trap that broke the
 * enquiry status controls.
 */
export const DECISIONS = ["accepted", "waitlisted", "declined"] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABELS: Record<Decision, string> = {
  accepted: "Accept",
  waitlisted: "Waitlist",
  declined: "Decline",
};

/** Status pill styling, covering every value the enum can hold. */
export const STATUS_STYLES: Record<string, string> = {
  payment_pending: "border-warn text-warn bg-warn/10",
  submitted: "border-blue text-blue bg-blue-soft",
  in_review: "border-navy-2 text-navy bg-surface-2",
  accepted: "border-ok text-ok bg-ok-soft",
  waitlisted: "border-warn text-warn bg-warn/10",
  declined: "border-red text-red bg-red-soft",
  withdrawn: "border-line text-ink-faint",
};

export const STATUS_LABELS: Record<string, string> = {
  payment_pending: "awaiting payment",
  submitted: "submitted",
  in_review: "in review",
  accepted: "accepted",
  waitlisted: "waitlisted",
  declined: "declined",
  withdrawn: "withdrawn",
};

/** Decided applications are done; the queue stops chasing them. */
export const OPEN_STATUSES = ["payment_pending", "submitted", "in_review"];
