"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Mail, MailX } from "lucide-react";
import { markPaid, markDispatched, cancelOrder } from "@/lib/shop/order-actions";
import { formatPence, penceToInput, parsePounds } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/schema";

/**
 * The controls that move an order along.
 *
 * Marking paid asks for the amount actually received and the reference
 * seen on the statement. Neither is decoration: a short payment is a
 * conversation with the buyer, and without the reference there is
 * nothing to reconcile against months later.
 */
export function OrderPanel({
  orderId,
  status,
  totalPence,
  hasPhysical,
}: {
  orderId: string;
  status: OrderStatus;
  totalPence: number;
  hasPhysical: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState(penceToInput(totalPence));
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const [result, setResult] = useState<
    { tone: "ok" | "bad"; text: string; emailed?: boolean } | null
  >(null);

  const received = parsePounds(amount);
  const mismatch = received !== null && received !== totalPence;

  function run(fn: () => Promise<{ ok: boolean; error?: string; emailed?: boolean }>, done: string) {
    setResult(null);
    startTransition(async () => {
      const r = await fn();
      setResult(
        r.ok
          ? { tone: "ok", text: done, emailed: r.emailed }
          : { tone: "bad", text: r.error ?? "That did not work." },
      );
      if (r.ok) router.refresh();
    });
  }

  if (status === "cancelled" || status === "refunded") {
    return (
      <p className="border border-line bg-surface p-4 text-[0.88rem] text-ink-dim">
        This order is {status}. Nothing further to do here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "awaiting_payment" && (
        <div className="border border-line bg-surface p-5">
          <h2 className="font-display font-semibold text-navy">Mark as paid</h2>
          <p className="mt-1 text-[0.85rem] text-ink-dim">
            Do this once you can see the money in the bank. Stock comes down and
            any downloads are emailed immediately.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
                Amount received
              </span>
              <div className="flex items-center border border-field bg-surface-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="tabular w-full bg-transparent px-3 py-2 font-mono text-[0.875rem] text-ink outline-none"
                />
                <span className="pr-3 font-mono text-[0.72rem] text-ink-faint">GBP</span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
                Reference on the statement
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="KSF-ORD-2026-0042"
                className="w-full border border-field bg-surface-2 px-3 py-2 font-mono text-[0.82rem] text-ink outline-none"
              />
            </label>
          </div>

          {mismatch && (
            <p className="mt-3 flex items-start gap-2 border border-warn/40 bg-warn/5 p-3 text-[0.83rem] text-warn">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              That is not the {formatPence(totalPence)} invoiced. It will still be
              recorded — the difference is written to the audit trail so you can
              take it up with the buyer.
            </p>
          )}

          <button
            type="button"
            disabled={pending || received === null}
            onClick={() =>
              run(() => markPaid({ orderId, amountPence: received ?? 0, note }), "Marked paid.")
            }
            className="mt-4 bg-blue px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-3 disabled:bg-surface-2 disabled:text-ink-faint"
          >
            {pending ? "Working…" : "Mark as paid"}
          </button>
        </div>
      )}

      {status === "paid" && hasPhysical && (
        <div className="border border-line bg-surface p-5">
          <h2 className="font-display font-semibold text-navy">Mark as dispatched</h2>
          <p className="mt-1 text-[0.85rem] text-ink-dim">
            Once the parcel has gone. The buyer gets the tracking number by email.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
                Carrier
              </span>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Royal Mail"
                className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
                Tracking number
              </span>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="w-full border border-field bg-surface-2 px-3 py-2 font-mono text-[0.82rem] text-ink outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markDispatched({ orderId, carrier, tracking }), "Marked dispatched.")}
            className="mt-4 bg-blue px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-3 disabled:bg-surface-2"
          >
            {pending ? "Working…" : "Mark as dispatched"}
          </button>
        </div>
      )}

      {status === "paid" && !hasPhysical && (
        <p className="flex items-center gap-2 border border-ok/40 bg-ok-soft p-4 text-[0.88rem] text-ok">
          <Check size={15} aria-hidden="true" />
          Downloads only — nothing to post. This order is complete.
        </p>
      )}

      {status === "awaiting_payment" && (
        <div className="border border-line bg-surface p-5">
          {!confirmingCancel ? (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="text-[0.84rem] font-semibold text-ink-dim transition-colors hover:text-red"
            >
              Cancel this order
            </button>
          ) : (
            <div>
              <h2 className="font-display font-semibold text-navy">Cancel this order</h2>
              <p className="mt-1 text-[0.85rem] text-ink-dim">
                Only unpaid orders can be cancelled here. Say why — it goes on the
                permanent record.
              </p>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Buyer asked to cancel"
                className="mt-3 w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink outline-none"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending || reason.trim().length < 3}
                  onClick={() => run(() => cancelOrder(orderId, reason), "Order cancelled.")}
                  className="border border-red px-4 py-2 text-[0.84rem] font-semibold text-red transition-colors hover:bg-red-soft disabled:opacity-50"
                >
                  Cancel the order
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  className="border border-line px-4 py-2 text-[0.84rem] font-semibold text-navy"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div
          role="status"
          className={
            "flex flex-col gap-1 border p-4 text-[0.86rem] " +
            (result.tone === "ok" ? "border-ok/40 bg-ok-soft text-ok" : "border-red/40 bg-red-soft text-red")
          }
        >
          <span className="flex items-center gap-1.5">
            {result.tone === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
            {result.text}
          </span>

          {/* Whether the buyer was actually emailed, rather than assumed —
              staff need to know when to follow up by hand. */}
          {result.emailed !== undefined && (
            <span className="flex items-center gap-1.5 text-[0.82rem] text-ink-dim">
              {result.emailed ? <Mail size={13} /> : <MailX size={13} />}
              {result.emailed
                ? "The buyer has been emailed their downloads."
                : "Email is not configured, so the buyer was NOT emailed. Send their links by hand."}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
