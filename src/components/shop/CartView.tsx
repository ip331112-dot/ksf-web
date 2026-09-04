"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/i18n/Link";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { removeFromBasket, setQty, useBasket } from "@/lib/shop/cart-store";
import { formatPence } from "@/lib/shop/money";
import { lookupBasket, type BasketView } from "@/lib/shop/basket-actions";
import type { Locale } from "@/lib/locale";

export type CartStrings = {
  title: string;
  empty: string;
  emptyBody: string;
  browse: string;
  subtotal: string;
  postage: string;
  postageAtCheckout: string;
  total: string;
  checkout: string;
  remove: string;
  gone: string;
  soldOut: string;
  onlyLeft: string;
  download: string;
};

/**
 * The basket page.
 *
 * The basket itself holds only ids and quantities, so this asks the
 * server what those ids currently are. That means a product whose price
 * changed, or which sold out, or which was unpublished while it sat in
 * someone's basket, shows the truth here rather than at the checkout —
 * which is the last place anybody wants to discover it.
 */
export function CartView({
  locale,
  strings,
}: {
  locale: Locale;
  strings: CartStrings;
}) {
  const basket = useBasket();

  /**
   * The priced basket, tagged with the basket it was priced from.
   *
   * Loading is DERIVED from that tag rather than held in its own state.
   * The obvious version — setLoading(true) at the top of the effect —
   * calls setState synchronously during an effect, which cascades a
   * render and trips React's own lint rule. Comparing the tag says the
   * same thing with no extra state and no extra render.
   */
  const [priced, setPriced] = useState<{ key: string; view: BasketView } | null>(null);
  const key = JSON.stringify(basket);

  useEffect(() => {
    let cancelled = false;

    // Parsed from `key` rather than closing over `basket`, so the effect
    // depends only on the serialised form — the array is a new reference
    // on every render and would re-run this forever.
    lookupBasket(JSON.parse(key)).then((view) => {
      if (!cancelled) setPriced({ key, view });
    });

    return () => { cancelled = true; };
  }, [key]);

  const loading = priced?.key !== key;
  const view = priced?.view ?? null;

  if (basket.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
        <ShoppingBag size={26} className="text-ink-faint" aria-hidden="true" />
        <h2 className="font-display font-semibold text-navy">{strings.empty}</h2>
        <p className="max-w-md text-[0.875rem] text-ink-dim">{strings.emptyBody}</p>
        <Link href="/shop" className="mt-1 text-[0.85rem] font-semibold text-blue-lift hover:underline">
          {strings.browse}
        </Link>
      </div>
    );
  }

  if (loading || !view) {
    return (
      <p className="flex items-center gap-2 py-10 text-[0.9rem] text-ink-dim">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        …
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <ul className="border border-line bg-surface">
        {view.lines.map((l, i) => (
          <li
            key={l.variantId}
            className={"flex flex-wrap items-center gap-4 p-4 " + (i > 0 ? "border-t border-line-soft" : "")}
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/shop/${l.slug}`}
                className="font-display font-semibold text-navy hover:text-blue-lift"
              >
                {l.name}
              </Link>
              {l.option && (
                <span className="ml-2 font-mono text-[0.72rem] text-ink-faint">{l.option}</span>
              )}
              <p className="mt-0.5 font-mono text-[0.72rem] text-ink-faint">
                {l.kind === "digital" ? strings.download : formatPence(l.unitPricePence, locale)}
              </p>

              {!l.available && (
                <p className="mt-1 text-[0.78rem] text-red">
                  {l.stock === 0 ? strings.soldOut : strings.onlyLeft.replace("{count}", String(l.stock))}
                </p>
              )}
            </div>

            {l.kind === "digital" ? (
              <span className="font-mono text-[0.72rem] text-ink-faint">× 1</span>
            ) : (
              <div className="flex items-center border border-line">
                <button
                  type="button" aria-label="One fewer"
                  onClick={() => setQty(l.variantId, l.qty - 1)}
                  className="px-2.5 py-1.5 text-ink-dim transition-colors hover:text-navy"
                >
                  <Minus size={13} />
                </button>
                <span className="tabular min-w-8 px-1 text-center font-mono text-[0.85rem] text-ink">
                  {l.qty}
                </span>
                <button
                  type="button" aria-label="One more"
                  disabled={l.qty >= l.stock}
                  onClick={() => setQty(l.variantId, l.qty + 1)}
                  className="px-2.5 py-1.5 text-ink-dim transition-colors hover:text-navy disabled:opacity-35"
                >
                  <Plus size={13} />
                </button>
              </div>
            )}

            <span className="tabular w-20 text-right font-mono text-[0.9rem] text-blue-lift">
              {formatPence(l.unitPricePence * l.qty, locale)}
            </span>

            <button
              type="button"
              onClick={() => removeFromBasket(l.variantId)}
              aria-label={strings.remove}
              className="text-ink-faint transition-colors hover:text-red"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}

        {view.missing.length > 0 && (
          <li className="border-t border-line-soft bg-red-soft p-4 text-[0.82rem] text-red">
            {strings.gone}
            <button
              type="button"
              onClick={() => view.missing.forEach((id) => removeFromBasket(id))}
              className="ml-2 font-semibold underline"
            >
              {strings.remove}
            </button>
          </li>
        )}
      </ul>

      <div className="border border-line bg-surface p-5 lg:sticky lg:top-6">
        <dl className="flex flex-col gap-2 text-[0.9rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">{strings.subtotal}</dt>
            <dd className="tabular font-mono text-ink">{formatPence(view.goodsPence, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">{strings.postage}</dt>
            <dd className="text-[0.82rem] text-ink-faint">
              {view.hasPhysical ? strings.postageAtCheckout : "—"}
            </dd>
          </div>
          <div className="mt-1 flex justify-between gap-4 border-t border-line-soft pt-3">
            <dt className="font-semibold text-navy">{strings.total}</dt>
            <dd className="tabular font-mono text-lg font-medium text-blue-lift">
              {formatPence(view.goodsPence, locale)}
              {view.hasPhysical && <span className="text-[0.7rem] text-ink-faint"> +</span>}
            </dd>
          </div>
        </dl>

        <Link
          href="/checkout"
          aria-disabled={!view.allAvailable}
          className={
            "mt-5 block w-full py-3 text-center font-semibold transition-colors " +
            (view.allAvailable
              ? "bg-blue text-white hover:bg-navy-3"
              : "pointer-events-none bg-surface-2 text-ink-faint")
          }
        >
          {strings.checkout}
        </Link>
      </div>
    </div>
  );
}
