"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, PlayCircle } from "lucide-react";
import { recordDecision, startReview } from "@/lib/applications/admin-actions";
import {
  DECISIONS,
  DECISION_LABELS,
  type Decision,
} from "@/lib/applications/decisions";

const TONE: Record<Decision, string> = {
  accepted: "border-ok text-ok hover:bg-ok-soft",
  waitlisted: "border-warn text-warn hover:bg-warn/10",
  declined: "border-red text-red hover:bg-red-soft",
};

export function DecisionPanel({
  applicationId,
  status,
  applicantName,
  existingFeedback,
}: {
  applicationId: string;
  status: string;
  applicantName: string;
  existingFeedback: string | null;
}) {
  const [choice, setChoice] = useState<Decision | null>(null);
  const [feedback, setFeedback] = useState(existingFeedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const decided = ["accepted", "waitlisted", "declined", "withdrawn"].includes(status);

  function begin() {
    setError(null);
    startTransition(async () => {
      const res = await startReview(applicationId);
      if (!res.ok) setError(res.error ?? "Could not start the review.");
    });
  }

  function submit() {
    if (!choice) return;
    setError(null);
    startTransition(async () => {
      const res = await recordDecision(applicationId, choice, feedback);
      if (!res.ok) {
        setError(res.error ?? "Could not record that decision.");
        return;
      }
      setEmailed(Boolean(res.emailed));
      setDone(DECISION_LABELS[choice]);
    });
  }

  if (done) {
    return (
      <div className="border-2 border-ok bg-ok-soft p-5">
        <div className="flex items-center gap-2">
          <Check size={17} className="text-ok" aria-hidden="true" />
          <p className="font-display font-semibold text-navy">Decision recorded</p>
        </div>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-dim">
          {applicantName} is marked <strong>{done.toLowerCase()}</strong> and your
          feedback is saved against the application. It is visible on their
          status page now.
        </p>
        <p
          className={
            "mt-3 border-t pt-3 text-[0.8rem] " +
            (emailed
              ? "border-ok/30 text-ink-dim"
              : "border-red/40 font-medium text-red")
          }
        >
          {emailed
            ? `We have emailed ${applicantName} the decision and your feedback.`
            : "The email did NOT go out — nothing was sent to them. Tell them yourself, and check the server log for the reason."}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-surface p-5">
      <h2 className="font-display font-semibold text-navy">
        {decided ? "Revise the decision" : "Decision"}
      </h2>

      {status === "submitted" && (
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-line px-4 py-2.5 text-[0.85rem] font-semibold text-ink-dim transition-colors hover:border-blue hover:text-blue-lift disabled:opacity-50"
        >
          <PlayCircle size={15} aria-hidden="true" />
          Mark as in review
        </button>
      )}

      <p className="mt-4 text-[0.8rem] text-ink-dim">
        Every outcome gets written feedback — that is the promise the site
        makes, not only for the people you accept.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setChoice(d)}
            aria-pressed={choice === d}
            className={
              "border px-2 py-2 text-[0.8rem] font-semibold transition-colors " +
              (choice === d
                ? `${TONE[d]} bg-surface-2`
                : "border-line text-ink-dim hover:border-blue hover:text-blue-lift")
            }
          >
            {DECISION_LABELS[d]}
          </button>
        ))}
      </div>

      <label
        htmlFor="feedback"
        className="mt-4 block text-[0.8rem] font-semibold text-navy"
      >
        Feedback for {applicantName}
      </label>
      <textarea
        id="feedback"
        rows={9}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What you saw in their application, and what you would suggest next — in your own words."
        className="mt-1.5 w-full resize-y border border-field bg-surface px-3 py-2.5 text-[0.85rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
      />
      <p className="mt-1 text-right font-mono text-[0.65rem] text-ink-faint">
        {feedback.trim().length} characters
      </p>

      {error && (
        <p role="alert" className="mt-3 border border-red/40 bg-red/5 px-3 py-2 text-[0.8rem] text-navy">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !choice || feedback.trim().length < 10}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-blue px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-lift disabled:cursor-not-allowed disabled:bg-ink-faint"
      >
        {pending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {choice ? `Send ${DECISION_LABELS[choice].toLowerCase()} decision` : "Choose an outcome"}
      </button>

      <p className="mt-2 text-[0.72rem] text-ink-faint">
        Recorded against the application, shown on their status page, and
        emailed to them with your feedback.
      </p>
    </div>
  );
}
