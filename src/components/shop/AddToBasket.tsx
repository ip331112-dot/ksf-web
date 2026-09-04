"use client";

import { useState } from "react";
import { Link } from "@/components/i18n/Link";
import { Check, ShoppingBag } from "lucide-react";
import { addToBasket, useBasket } from "@/lib/shop/cart-store";
import { formatPence } from "@/lib/shop/money";
import type { Locale } from "@/lib/locale";

export type BuyStrings = {
  addToBasket: string;
  soldOut: string;
  chooseOption: string;
  inBasket: string;
  viewBasket: string;
};

export type BuyableVariant = {
  id: string;
  label: string | null;
  pricePence: number;
  stock: number;
  digital: boolean;
};

/**
 * Choosing a size and adding it to the basket.
 *
 * The variant, not the product, is what goes in — a hoodie in M and the
 * same hoodie in L are different things with different stock, and the
 * basket has to say which one.
 *
 * A sold-out variant stays visible rather than being hidden. Someone
 * looking for a small needs to learn that it exists and is gone, not be
 * left wondering whether the shop stocks smalls at all.
 */
export function AddToBasket({
  variants,
  locale,
  strings,
}: {
  variants: BuyableVariant[];
  locale: Locale;
  strings: BuyStrings;
}) {
  const basket = useBasket();
  const hasOptions = variants.some((v) => v.label);

  const firstAvailable = variants.find((v) => v.digital || v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? "");
  const [justAdded, setJustAdded] = useState(false);

  if (variants.length === 0) return null;

  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const buyable = selected && (selected.digital || selected.stock > 0);
  const inBasket = basket.find((l) => l.variantId === selected?.id)?.qty ?? 0;

  return (
    <div className="mt-8">
      {hasOptions && (
        <div className="mb-5">
          <h2 className="mb-2 font-mono text-[0.68rem] tracking-[0.16em] text-ink-faint uppercase">
            {strings.chooseOption}
          </h2>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = !v.digital && v.stock <= 0;
              const active = v.id === selected?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => { setSelectedId(v.id); setJustAdded(false); }}
                  className={
                    "border px-3.5 py-2 text-[0.875rem] transition-colors " +
                    (out
                      ? "cursor-not-allowed border-line text-ink-faint line-through"
                      : active
                        ? "border-blue bg-blue-soft font-semibold text-navy"
                        : "border-field text-ink hover:border-blue")
                  }
                >
                  {v.label}
                  {out && (
                    <span className="ml-2 font-mono text-[0.6rem] tracking-widest uppercase no-underline">
                      {strings.soldOut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!buyable}
          onClick={() => {
            if (!selected) return;
            addToBasket(selected.id);
            setJustAdded(true);
          }}
          className="inline-flex items-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-3 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint"
        >
          {justAdded ? <Check size={17} aria-hidden="true" /> : <ShoppingBag size={17} aria-hidden="true" />}
          {buyable ? strings.addToBasket : strings.soldOut}
        </button>

        {selected && buyable && (
          <span className="tabular font-mono text-[0.95rem] text-blue-lift">
            {selected.pricePence === 0 ? "" : formatPence(selected.pricePence, locale)}
          </span>
        )}

        {inBasket > 0 && (
          <Link href="/cart" className="text-[0.85rem] font-semibold text-blue-lift hover:underline">
            {strings.inBasket.replace("{count}", String(inBasket))} · {strings.viewBasket}
          </Link>
        )}
      </div>
    </div>
  );
}
