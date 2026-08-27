"use client";

import { EMPTY_DRAFT, type ApplyDraft } from "./schema";

/**
 * The in-progress application, stored in localStorage.
 *
 * Written as an external store rather than state-copied-in-an-effect.
 * The obvious version — read localStorage in useEffect, setDraft — causes
 * a cascading render on every mount and trips React's own lint rule. More
 * importantly it is a lie about ownership: localStorage is the source of
 * truth here, because it is what survives the refresh this whole feature
 * exists to survive.
 *
 * useSyncExternalStore also gets hydration right for free: the server
 * snapshot is empty, the client re-reads after hydrating, and there is no
 * markup mismatch to suppress.
 */

const keyFor = (slug: string) => `ksf-apply-draft:${slug}`;

const listeners = new Set<() => void>();

export function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab editing the same draft should be reflected here too.
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
 * The raw JSON string, not the parsed object.
 *
 * getSnapshot must return something stable between calls or React loops
 * forever. A string compares by value; a freshly parsed object would be a
 * new reference every time.
 */
export function getRaw(slug: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(slug));
  } catch {
    // Private browsing or a blocked store. The form still works, it just
    // will not survive a refresh.
    return null;
  }
}

/** Server render has no store, so the draft starts empty. */
export function getServerRaw(): string | null {
  return null;
}

export function parseDraft(raw: string | null): ApplyDraft {
  if (!raw) return EMPTY_DRAFT;
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function writeDraft(slug: string, draft: ApplyDraft) {
  try {
    window.localStorage.setItem(keyFor(slug), JSON.stringify(draft));
  } catch {}
  notify();
}

export function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(keyFor(slug));
  } catch {}
  notify();
}
