"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { clearBasket, useBasket } from "@/lib/shop/cart-store";
import { lookupBasket, type BasketView } from "@/lib/shop/basket-actions";
import { placeOrder } from "@/lib/shop/checkout";
import { formatPence, postageAfterThreshold } from "@/lib/shop/money";
import type { Locale } from "@/lib/locale";

export type CheckoutStrings = {
  yourDetails: string;
  name: string;
  email: string;
  phone: string;
  optional: string;
  deliveryAddress: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  summary: string;
  subtotal: string;
  postage: string;
  total: string;
  consentLabel: string;
  placeOrder: string;
  placing: string;
  howPaying: string;
  howPayingBody: string;
  emptyBasket: string;
  browse: string;
};

/**
 * The checkout.
 *
 * Postage is shown live as the country changes, using the same band
 * table the server uses — but the figure that ends up on the order is
 * recalculated server-side. This is a preview, never the authority.
 */
export function CheckoutForm({
  locale,
  strings,
}: {
  locale: Locale;
  strings: CheckoutStrings;
}) {
  const router = useRouter();
  const basket = useBasket();
  const [pending, startTransition] = useTransition();

  // Tagged with the basket it was priced from; loading is derived from
  // that rather than held separately. See CartView for why.
  const [priced, setPriced] = useState<{ key: string; view: BasketView } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState<"GB" | "FR">(locale === "fr" ? "FR" : "GB");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(basket);

  useEffect(() => {
    let cancelled = false;
    lookupBasket(JSON.parse(key), locale).then((view) => {
      if (!cancelled) setPriced({ key, view });
    });
    return () => { cancelled = true; };
  }, [key, locale]);

  const loading = priced?.key !== key;
  const view = priced?.view ?? null;

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-[0.9rem] text-ink-dim">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />…
      </p>
    );
  }

  if (!view || view.lines.length === 0) {
    return (
      <div className="border border-dashed border-line bg-surface px-6 py-14 text-center">
        <p className="text-[0.9rem] text-ink-dim">{strings.emptyBasket}</p>
        <Link href="/shop" className="mt-2 inline-block text-[0.85rem] font-semibold text-blue-lift hover:underline">
          {strings.browse}
        </Link>
      </div>
    );
  }

  // Previewed with the same band table the server uses, so the figure
  // shown here is the figure charged. The server recalculates it anyway —
  // this is a preview, never the authority.
  const grams = view.lines.reduce((sum, l) => sum + l.weightGrams * l.qty, 0);
  const postagePreview = view.hasPhysical
    ? postageAfterThreshold(view.goodsPence, grams, country)
    : 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        lines: basket,
        name, email, phone: phone || undefined,
        locale,
        shipLine1: line1 || undefined,
        shipLine2: line2 || undefined,
        shipCity: city || undefined,
        shipPostcode: postcode || undefined,
        shipCountry: view!.hasPhysical ? country : undefined,
        digitalConsent: consent,
      });

      if (!result.ok) {
        setError(
          result.unavailable && result.unavailable.length > 0
            ? `${result.error} (${result.unavailable.join(", ")})`
            : result.error,
        );
        return;
      }

      // Only cleared once the order is safely stored. Clearing earlier
      // would lose the basket on any failure.
      clearBasket();
      router.push(`/${locale}/checkout/sent?ref=${result.reference}&t=${result.token}`);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="flex flex-col gap-7">
        <fieldset>
          <legend className="mb-3 font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">
            {strings.yourDetails}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label={strings.name} value={name} onChange={setName} required />
            <Text label={strings.email} value={email} onChange={setEmail} type="email" required />
            <Text label={`${strings.phone} (${strings.optional})`} value={phone} onChange={setPhone} />
          </div>
        </fieldset>

        {view.hasPhysical && (
          <fieldset>
            <legend className="mb-3 font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">
              {strings.deliveryAddress}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Text label={strings.line1} value={line1} onChange={setLine1} required />
              </div>
              <div className="sm:col-span-2">
                <Text label={`${strings.line2} (${strings.optional})`} value={line2} onChange={setLine2} />
              </div>
              <Text label={strings.city} value={city} onChange={setCity} required />
              <Text label={strings.postcode} value={postcode} onChange={setPostcode} required />
              <label className="block">
                <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
                  {strings.country}
                </span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as "GB" | "FR")}
                  className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="FR">France</option>
                </select>
              </label>
            </div>
          </fieldset>
        )}

        {view.hasDigital && (
          <label className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 size-4 shrink-0 accent-blue"
            />
            <span className="text-[0.85rem] leading-relaxed text-ink-dim">
              {strings.consentLabel}
            </span>
          </label>
        )}

        <div className="border border-line bg-surface-2 p-4">
          <h2 className="font-display text-[0.95rem] font-semibold text-navy">
            {strings.howPaying}
          </h2>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-dim">
            {strings.howPayingBody}
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 border border-red/40 bg-red-soft p-4 text-[0.85rem] text-red">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>

      <div className="border border-line bg-surface p-5 lg:sticky lg:top-6">
        <h2 className="mb-3 font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">
          {strings.summary}
        </h2>

        <ul className="mb-4 flex flex-col gap-2 border-b border-line-soft pb-4">
          {view.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3 text-[0.84rem]">
              <span className="min-w-0 text-ink-dim">
                {l.qty} × {l.name}
                {l.option && <span className="text-ink-faint"> · {l.option}</span>}
              </span>
              <span className="tabular shrink-0 font-mono text-ink">
                {formatPence(l.unitPricePence * l.qty, locale)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 text-[0.88rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">{strings.subtotal}</dt>
            <dd className="tabular font-mono text-ink">{formatPence(view.goodsPence, locale)}</dd>
          </div>
          {view.hasPhysical && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-dim">{strings.postage}</dt>
              <dd className="tabular font-mono text-ink">
                {postagePreview === 0 ? "—" : formatPence(postagePreview, locale)}
              </dd>
            </div>
          )}
          <div className="mt-1 flex justify-between gap-4 border-t border-line-soft pt-3">
            <dt className="font-semibold text-navy">{strings.total}</dt>
            <dd className="tabular font-mono text-lg font-medium text-blue-lift">
              {formatPence(view.goodsPence + postagePreview, locale)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={submit}
          disabled={pending || !view.allAvailable}
          className="mt-5 w-full bg-blue py-3 font-semibold text-white transition-colors hover:bg-navy-3 disabled:bg-surface-2 disabled:text-ink-faint"
        >
          {pending ? strings.placing : strings.placeOrder}
        </button>
      </div>
    </div>
  );
}

function Text({
  label, value, onChange, type = "text", required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink outline-none"
      />
    </label>
  );
}
