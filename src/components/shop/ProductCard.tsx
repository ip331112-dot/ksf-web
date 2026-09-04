import { Link } from "@/components/i18n/Link";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { formatPence } from "@/lib/shop/money";
import { imageUrl } from "@/lib/shop/urls";
import { fill, type Locale } from "@/lib/locale";
import { anyInStock, fromPrice, t, type Product, type ProductVariant } from "@/lib/shop/schema";

export type CardStrings = {
  inStock: string;
  lowStock: string;
  outOfStock: string;
  download: string;
  free: string;
  from: string;
};

type CardProduct = Product & {
  variants: Pick<ProductVariant, "id" | "price_pence" | "stock" | "low_stock_at" | "option1">[];
  images: { path: string; alt_en: string | null; alt_fr: string | null }[];
  category: { slug: string; name_en: string; name_fr: string } | null;
};

/**
 * One product in the grid.
 *
 * Matches the track cards already on the site — square corners, single
 * border, accent on hover — because a shop that looks like a different
 * website bolted on is worse than one that looks plain.
 *
 * Stock state is on the card rather than only on the product page: with
 * physical goods the honest answer to "can I buy this" is sometimes no,
 * and the worst place to discover that is at checkout.
 */
export function ProductCard({
  product,
  locale,
  strings,
}: {
  product: CardProduct;
  locale: Locale;
  strings: CardStrings;
}) {
  const price = fromPrice(product, product.variants as ProductVariant[]);
  const cover = product.images[0];
  const available = anyInStock(product.kind, product.variants as ProductVariant[]);

  // "From £38" only when the sizes genuinely differ in price — otherwise
  // it reads as a hedge on a single-price item.
  const prices = product.variants.map((v) => v.price_pence ?? product.price_pence);
  const varies = prices.length > 1 && new Set(prices).size > 1;

  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const lowAt = Math.min(...product.variants.map((v) => v.low_stock_at), 3);

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex h-full flex-col border border-line bg-surface p-5 transition-colors hover:border-blue"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-[0.62rem] text-ink-faint">
          {product.category ? t(product.category, "name", locale) : ""}
        </span>
      </div>

      <div className="mt-3.5 flex aspect-4/3 items-center justify-center border border-line-soft bg-surface-2">
        {cover ? (
          /* Supabase storage is not in images.remotePatterns; adding it would
             route every product photo through the optimiser for no gain on an
             upload that was already sized on the way in. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(cover.path)}
            alt={(locale === "fr" ? cover.alt_fr : cover.alt_en) ?? ""}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <CategoryIcon
            name={product.category?.slug ?? "bag"}
            size={34}
            className="text-blue opacity-45"
          />
        )}
      </div>

      <h3 className="mt-3.5 font-display text-[1rem] font-semibold text-navy">
        {t(product, "name", locale)}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[0.85rem] leading-relaxed text-ink-dim">
        {t(product, "summary", locale)}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
        <span className="tabular font-mono text-[0.92rem] font-medium text-blue-lift">
          {price === 0
            ? strings.free
            : varies
              ? fill(strings.from, { price: formatPence(price, locale) })
              : formatPence(price, locale)}
        </span>

        <span
          className={
            "border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase " +
            (product.kind === "digital"
              ? "border-blue text-blue-lift bg-blue-soft"
              : !available
                ? "border-line text-ink-faint"
                : stock <= lowAt
                  ? "border-warn text-warn"
                  : "border-ok text-ok bg-ok-soft")
          }
        >
          {product.kind === "digital"
            ? strings.download
            : !available
              ? strings.outOfStock
              : stock <= lowAt
                ? fill(strings.lowStock, { count: stock })
                : strings.inStock}
        </span>
      </div>
    </Link>
  );
}
