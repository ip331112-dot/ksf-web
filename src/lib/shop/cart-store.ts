"use client";

import { useSyncExternalStore } from "react";

/**
 * The basket, stored in localStorage.
 *
 * Written as an external store rather than state-copied-in-an-effect,
 * for the same reasons as applications/draft-store.ts: localStorage is
 * the source of truth, because surviving a refresh is the entire point.
 * useSyncExternalStore also gets hydration right for free — the server
 * snapshot is empty, the client re-reads after hydrating, and there is
 * no markup mismatch to suppress.
 *
 * WHAT IS STORED, AND WHAT IS NOT
 * Only variant ids and quantities. No prices, no names. Everything a
 * price depends on is re-read on the server at checkout, so a basket
 * edited in devtools to say a £249 bundle costs £2.49 buys nothing. The
 * names shown on the cart page come from a server component that looks
 * them up; the basket itself never claims to know them.
 */

const KEY = "ksf-basket";

export type BasketLine = { variantId: string; qty: number };

const listeners = new Set<() => void>();

export function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab adding to the basket should be reflected here too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function notify() {
  for (const l of listeners) l();
}

/**
 * The raw JSON string, not the parsed array.
 *
 * getSnapshot must return something stable between calls or React loops
 * forever. A string compares by value; a freshly parsed array would be a
 * new reference every time.
 */
export function getRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Private browsing or a blocked store. The shop still works, the
    // basket just will not survive a refresh.
    return null;
  }
}

/** Server render has no store, so the basket starts empty. */
export function getServerRaw(): string | null {
  return null;
}

export function parseBasket(raw: string | null): BasketLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((line): BasketLine[] => {
      if (typeof line !== "object" || line === null) return [];
      const { variantId, qty } = line as Partial<BasketLine>;
      if (typeof variantId !== "string" || variantId.length === 0) return [];
      const n = Math.trunc(Number(qty));
      // Anything unreadable is dropped rather than defaulted. A basket
      // is not worth throwing an error over, but a line with a nonsense
      // quantity should not silently become one of something.
      if (!Number.isFinite(n) || n < 1 || n > 99) return [];
      return [{ variantId, qty: n }];
    });
  } catch {
    return [];
  }
}

function write(lines: BasketLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  notify();
}

export function addToBasket(variantId: string, qty = 1) {
  const lines = parseBasket(getRaw());
  const existing = lines.find((l) => l.variantId === variantId);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    lines.push({ variantId, qty: Math.min(Math.max(qty, 1), 99) });
  }
  write(lines);
}

export function setQty(variantId: string, qty: number) {
  const lines = parseBasket(getRaw());
  const next =
    qty <= 0
      ? lines.filter((l) => l.variantId !== variantId)
      : lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(qty, 99) } : l));
  write(next);
}

export function removeFromBasket(variantId: string) {
  write(parseBasket(getRaw()).filter((l) => l.variantId !== variantId));
}

export function clearBasket() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  notify();
}

/** The basket, re-rendering whenever it changes in this tab or another. */
export function useBasket(): BasketLine[] {
  const raw = useSyncExternalStore(subscribe, getRaw, getServerRaw);
  return parseBasket(raw);
}

/** Total item count, for the header badge. */
export function useBasketCount(): number {
  return useBasket().reduce((sum, l) => sum + l.qty, 0);
}
