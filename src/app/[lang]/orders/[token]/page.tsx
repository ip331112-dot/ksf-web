import type { Metadata } from "next";
import { Link } from "@/components/i18n/Link";
import { Download, Lock, Package, Truck } from "lucide-react";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { orderByToken, grantsForOrder } from "@/lib/shop/orders";
import { formatPence } from "@/lib/shop/money";
import { fill } from "@/lib/locale";
import { SITE } from "@/content/site";
import type { OrderStatus } from "@/lib/shop/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  // Never indexed: the URL is the credential.
  return { title: t.meta.orderTitle, robots: { index: false, follow: false, nocache: true } };
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  awaiting_payment: "border-warn text-warn",
  paid: "border-ok text-ok bg-ok-soft",
  dispatched: "border-ok text-ok bg-ok-soft",
  cancelled: "border-line text-ink-faint",
  refunded: "border-line text-ink-faint",
};

export default async function OrderPage({ params }: PageProps<"/[lang]/orders/[token]">) {
  const { token } = await params;
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  const order = await orderByToken(token);

  // An expired or unknown token gets the same page as a mistyped one, so
  // this cannot be used to discover whether an order exists.
  if (!order) {
    return (
      <>
        <SiteHeader />
        <main id="main" className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold text-navy">{t.order.notFound}</h1>
          <p className="mt-4 text-lg text-ink-dim">
            {fill(t.order.notFoundBody, { email: SITE.email })}
          </p>
          <Link href="/shop" className="mt-6 inline-block font-semibold text-blue-lift hover:underline">
            {t.cart.browse}
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const grants = await grantsForOrder(order.id);
  const digital = order.items.filter((i) => i.kind === "digital");
  const physical = order.items.filter((i) => i.kind === "physical");
  const unlocked = order.status === "paid" || order.status === "dispatched";

  const statusBody =
    order.status === "awaiting_payment"
      ? fill(t.order.awaitingBody, { reference: order.reference })
      : order.status === "dispatched"
        ? t.order.dispatchedBody
        : order.status === "paid"
          ? t.order.paidBody
          : "";

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">
          {fill(t.order.title, { reference: order.reference })}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`border px-2.5 py-1 font-mono text-[0.65rem] tracking-widest uppercase ${STATUS_STYLE[order.status]}`}
          >
            {t.order[order.status]}
          </span>
          <span className="font-mono text-[0.75rem] text-ink-faint">
            {t.order.placed}{" "}
            {new Date(order.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
              dateStyle: "long",
            })}
          </span>
        </div>

        {statusBody && (
          <p className="mt-4 max-w-prose text-[0.95rem] leading-relaxed text-ink-dim">
            {statusBody}
          </p>
        )}

        {/* Downloads ------------------------------------------------ */}
        {digital.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[0.68rem] tracking-[0.18em] text-ink-faint uppercase">
              {t.order.downloads}
            </h2>

            {!unlocked ? (
              <p className="flex items-center gap-2.5 border border-line bg-surface p-4 text-[0.88rem] text-ink-dim">
                <Lock size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                {t.order.downloadsLocked}
              </p>
            ) : (
              <ul className="border border-line bg-surface">
                {digital.map((item, i) => {
                  // Expiry was decided in grantsForOrder — reading the
                  // clock during render is impure and React refuses it.
                  const grant = grants.get(item.id);
                  const left = grant?.downloadsLeft ?? null;
                  const expired = grant?.expired ?? false;

                  return (
                    <li
                      key={item.id}
                      className={"flex flex-wrap items-center gap-3 p-4 " + (i > 0 ? "border-t border-line-soft" : "")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-semibold text-navy">
                          {item.name_snapshot}
                        </span>
                        {left !== null && !expired && (
                          <span className="font-mono text-[0.7rem] text-ink-faint">
                            {fill(t.order.downloadsLeft, { count: left })}
                          </span>
                        )}
                        {expired && (
                          <span className="font-mono text-[0.7rem] text-warn">{t.order.expired}</span>
                        )}
                      </span>

                      {/* The order token authorises this, so the link is
                          built from the URL rather than from a stored
                          per-file token — only hashes of those exist. */}
                      <a
                        href={`/api/download/${token}?item=${item.id}`}
                        className="inline-flex shrink-0 items-center gap-2 bg-blue px-4 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-3"
                      >
                        <Download size={15} aria-hidden="true" />
                        {t.order.download}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Delivery ------------------------------------------------- */}
        {physical.length > 0 && order.ship_line1 && (
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[0.68rem] tracking-[0.18em] text-ink-faint uppercase">
              {t.order.deliveryTo}
            </h2>
            <div className="flex items-start gap-3 border border-line bg-surface p-4">
              {order.status === "dispatched" ? (
                <Truck size={17} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
              ) : (
                <Package size={17} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden="true" />
              )}
              <address className="text-[0.88rem] leading-relaxed text-ink-dim not-italic">
                {order.name}
                <br />
                {order.ship_line1}
                {order.ship_line2 && <><br />{order.ship_line2}</>}
                <br />
                {order.ship_city} {order.ship_postcode}
                <br />
                {order.ship_country}
                {order.tracking && (
                  <>
                    <br />
                    <span className="mt-2 inline-block font-mono text-[0.78rem] text-navy">
                      {t.order.tracking}: {order.carrier ? `${order.carrier} · ` : ""}
                      {order.tracking}
                    </span>
                  </>
                )}
              </address>
            </div>
          </section>
        )}

        {/* Lines ---------------------------------------------------- */}
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-[0.68rem] tracking-[0.18em] text-ink-faint uppercase">
            {t.order.items}
          </h2>
          <ul className="border border-line bg-surface">
            {order.items.map((item, i) => (
              <li
                key={item.id}
                className={"flex justify-between gap-4 p-4 text-[0.9rem] " + (i > 0 ? "border-t border-line-soft" : "")}
              >
                <span className="text-ink-dim">
                  {item.qty} × {item.name_snapshot}
                  {item.option_snapshot && (
                    <span className="font-mono text-[0.72rem] text-ink-faint"> · {item.option_snapshot}</span>
                  )}
                </span>
                <span className="tabular shrink-0 font-mono text-ink">
                  {formatPence(item.unit_price_pence * item.qty, locale)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-2 text-[0.9rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-dim">{t.order.subtotal}</dt>
              <dd className="tabular font-mono text-ink">{formatPence(order.goods_pence, locale)}</dd>
            </div>
            {order.postage_pence > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-dim">{t.order.postage}</dt>
                <dd className="tabular font-mono text-ink">{formatPence(order.postage_pence, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-line-soft pt-3">
              <dt className="font-semibold text-navy">{t.order.total}</dt>
              <dd className="tabular font-mono text-lg font-medium text-blue-lift">
                {formatPence(order.total_pence, locale)}
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
