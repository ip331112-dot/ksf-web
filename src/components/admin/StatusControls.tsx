"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Archive, Ban, MailCheck, Eye } from "lucide-react";
import { updateLeadStatus } from "@/lib/leads/admin-actions";
import type { LeadStatus } from "@/lib/leads/schema";

/**
 * Deliberately not offering "new". Moving an enquiry back to unread is a
 * thing people ask for and almost never use, and leaving it out keeps the
 * row to four decisions: I have seen it, I have answered it, I am done
 * with it, it is junk.
 */
const CHOICES: {
  status: LeadStatus;
  label: string;
  Icon: typeof Eye;
  active: string;
}[] = [
  { status: "read", label: "Read", Icon: Eye, active: "border-ink-dim bg-surface-2 text-ink" },
  { status: "replied", label: "Replied", Icon: MailCheck, active: "border-ok bg-ok-soft text-ok" },
  { status: "archived", label: "Archive", Icon: Archive, active: "border-ink-faint bg-surface-2 text-ink-faint" },
  { status: "spam", label: "Spam", Icon: Ban, active: "border-red bg-red-soft text-red" },
];

export function StatusControls({
  leadId,
  current,
}: {
  leadId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<LeadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(status: LeadStatus) {
    setError(null);
    setTarget(status);
    startTransition(async () => {
      const res = await updateLeadStatus(leadId, status);
      if (!res.ok) setError(res.error ?? "Could not save that.");
      setTarget(null);
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[0.6rem] tracking-widest text-ink-faint uppercase">
          Mark as
        </span>

        {CHOICES.map(({ status, label, Icon, active }) => {
          const isCurrent = current === status;
          const isBusy = pending && target === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => move(status)}
              disabled={pending || isCurrent}
              aria-pressed={isCurrent}
              className={
                "inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors " +
                (isCurrent
                  ? `${active} cursor-default`
                  : "border-line text-ink-dim hover:border-blue hover:text-blue-lift disabled:opacity-50")
              }
            >
              {isBusy ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : isCurrent ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Icon size={12} aria-hidden="true" />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[0.75rem] text-red">
          {error}
        </p>
      )}
    </div>
  );
}
