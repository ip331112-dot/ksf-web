"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { NAV } from "@/content/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
        <KsfLogo />

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.925rem] font-medium text-ink-dim transition-colors hover:text-blue"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* The CTA never collapses — it stays a button on mobile */}
          <Link
            href="/tracks"
            className="inline-flex items-center bg-blue px-4 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-navy-3 sm:px-5"
          >
            Apply now
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center border border-line text-navy lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-line bg-surface lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-5 py-2">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-line-soft last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 font-medium text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
