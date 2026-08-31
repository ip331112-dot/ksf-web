"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@/components/i18n/Link";

/**
 * The mobile menu, split out of SiteHeader.
 *
 * SiteHeader itself is a Server Component so it can read the dictionary
 * directly; only this toggle actually needs state, so only this crosses
 * into the browser bundle. Labels arrive already translated.
 */
export function MobileNav({
  items,
  openLabel,
  closeLabel,
}: {
  items: { href: string; label: string; staff?: boolean }[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? closeLabel : openLabel}
        className="inline-flex h-10 w-10 items-center justify-center border border-line text-navy lg:hidden"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="absolute inset-x-0 top-full border-t border-line bg-surface lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-5 py-2">
            {items.map((item) => (
              <li
                key={item.href}
                className="border-b border-line-soft last:border-0"
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    item.staff
                      ? "block py-3.5 text-[0.9rem] font-medium text-ink-faint"
                      : "block py-3.5 font-medium text-ink"
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
