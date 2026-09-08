import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { ChevronLeft, Truck, Download } from "lucide-react";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { AddToBasket } from "@/components/shop/AddToBasket";
import { getProduct } from "@/lib/shop/queries";
import { imageUrl } from "@/lib/shop/urls";
import { formatPence } from "@/lib/shop/money";
import { anyInStock, fromPrice, t as pick } from "@/lib/shop/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale, dict] = await Promise.all([
    getProduct(slug),
    getLocale(),
    getDictionary(),
  ]);

  if (!product || product.status !== "published") {
    return { title: dict.meta.shopTitle };
  }

  return {
    title: pick(product, "name", locale),
    description: pick(product, "summary", locale),
    alternates: await alternatesFor(`/shop/${slug}`),
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/shop/[slug]">) {
  const { slug } = await params;
  const [product, locale, t] = await Promise.all([
    getProduct(slug),
    getLocale(),
    getDictionary(),
  ]);

  // A draft is a 404 to the public, not a 403: telling a visitor that a
  // product exists but is hidden leaks the catalogue before launch.
  if (!product || product.status !== "published") notFound();

  const price = fromPrice(product, product.variants);
  const available = anyInStock(product.kind, product.variants);
  const cover = product.images[0];
  const rest = product.images.slice(1);

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-[0.85rem] text-ink-dim transition-colors hover:text-navy"
        >
          <ChevronLeft size={15} aria-hidden="true" />
          {t.shop.backToShop}
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Photos ------------------------------------------------- */}
          <div>
            <div className="img-atmos flex aspect-4/3 items-center justify-center border border-line bg-surface-2">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- see ProductCard
                <img
                  src={imageUrl(cover.path)}
                  alt={(locale === "fr" ? cover.alt_fr : cover.alt_en) ?? ""}
                  className="size-full object-cover"
                />
              ) : (
                <CategoryIcon
                  name={product.category?.icon ?? "bag"}
                  size={64}
                  className="text-blue opacity-40"
                />
              )}
            </div>

            {rest.length > 0 && (
              <ul className="mt-3 grid grid-cols-4 gap-3">
                {rest.map((img) => (
                  <li key={img.id} className="img-atmos aspect-square border border-line bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- see ProductCard */}
                    <img
                      src={imageUrl(img.path)}
                      alt={(locale === "fr" ? img.alt_fr : img.alt_en) ?? ""}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail ------------------------------------------------- */}
          <div>
            {product.category && (
              <Link
                href={`/shop/category/${product.category.slug}`}
                className="eyebrow inline-flex items-center gap-2 text-blue-lift hover:underline"
              >
                <CategoryIcon name={product.category.icon} size={14} />
                {pick(product.category, "name", locale)}
              </Link>
            )}

            <h1 className="mt-3 font-display text-3xl font-extrabold text-navy sm:text-4xl">
              {pick(product, "name", locale)}
            </h1>

            <p className="mt-4 text-lg text-ink-dim">{pick(product, "summary", locale)}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="tabular font-mono text-2xl font-medium text-blue-lift">
                {price === 0 ? t.shop.free : formatPence(price, locale)}
              </span>
              {product.compare_at_pence && (
                <span className="tabular font-mono text-[0.9rem] text-ink-faint line-through">
                  {formatPence(product.compare_at_pence, locale)}
                </span>
              )}
              <span
                className={
                  "border px-2.5 py-1 font-mono text-[0.65rem] tracking-widest uppercase " +
                  (product.kind === "digital"
                    ? "border-blue text-blue-lift bg-blue-soft"
                    : available
                      ? "border-ok text-ok bg-ok-soft"
                      : "border-line text-ink-faint")
                }
              >
                {product.kind === "digital"
                  ? t.shop.download
                  : available
                    ? t.shop.inStock
                    : t.shop.outOfStock}
              </span>
            </div>

            {/* Sizes, where there are any. Each is counted separately, so
                one can be sold out while the others are not — which is
                why the basket holds a variant rather than a product. */}
            <AddToBasket
              locale={locale}
              strings={{
                addToBasket: t.shop.addToBasket,
                soldOut: t.shop.soldOut,
                chooseOption: t.shop.chooseOption,
                inBasket: t.cart.inBasket,
                viewBasket: t.cart.viewBasket,
              }}
              variants={product.variants.map((v) => ({
                id: v.id,
                label: [v.option1, v.option2].filter(Boolean).join(" · ") || null,
                pricePence: v.price_pence ?? product.price_pence,
                stock: v.stock,
                digital: product.kind === "digital",
              }))}
            />

            <div className="mt-8 flex items-start gap-3 border border-line bg-surface p-4">
              {product.kind === "digital" ? (
                <Download size={18} className="mt-0.5 shrink-0 text-blue-lift" aria-hidden="true" />
              ) : (
                <Truck size={18} className="mt-0.5 shrink-0 text-blue-lift" aria-hidden="true" />
              )}
              <div>
                <h2 className="font-display text-[0.95rem] font-semibold text-navy">
                  {product.kind === "digital" ? t.shop.download : t.shop.delivery}
                </h2>
                <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-dim">
                  {product.kind === "digital" ? t.shop.instantBody : t.shop.deliveryBody}
                </p>
              </div>
            </div>

            <div className="mt-7 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-ink-dim">
              {pick(product, "description", locale)}
            </div>

            {product.specs.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-mono text-[0.68rem] tracking-[0.16em] text-ink-faint uppercase">
                  {t.shop.specifications}
                </h2>
                <dl className="border border-line">
                  {product.specs.map((s, i) => (
                    <div
                      key={s.id}
                      className={
                        "grid grid-cols-[10rem_1fr] gap-4 px-4 py-2.5 text-[0.875rem] " +
                        (i > 0 ? "border-t border-line-soft" : "")
                      }
                    >
                      <dt className="font-mono text-[0.78rem] text-ink-faint">
                        {pick(s, "label", locale)}
                      </dt>
                      <dd className="text-ink-dim">{pick(s, "value", locale)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
