import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { ShopSidebar } from "@/components/shop/ShopSidebar";
import { ProductCard } from "@/components/shop/ProductCard";
import { getCatalogue, getCategories, isShopReady } from "@/lib/shop/queries";
import { fill } from "@/lib/locale";
import { SITE } from "@/content/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.shopTitle,
    description: t.meta.shopDescription,
    alternates: await alternatesFor("/shop"),
  };
}

export default async function ShopPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  // Without Supabase configured the shop cannot list anything. Saying so
  // is better than an empty grid that looks like a shop with no stock —
  // the same honesty the enquiry forms already apply.
  if (!isShopReady()) {
    return (
      <>
        <SiteHeader />
        <main id="main" className="mx-auto max-w-3xl px-5 py-24 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold text-navy">
            {t.shop.notLiveTitle}
          </h1>
          <p className="mt-4 text-lg text-ink-dim">
            {fill(t.shop.notLiveBody, { email: SITE.email })}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const [categories, products] = await Promise.all([getCategories(), getCatalogue()]);

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">{t.shop.eyebrow}</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
              {t.shop.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">{t.shop.intro}</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[15rem_1fr] lg:px-8">
          <ShopSidebar
            categories={categories}
            active={null}
            locale={locale}
            title={t.shop.menuTitle}
            allLabel={t.shop.all}
          />

          <div>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-navy">
                {t.shop.allProducts}
              </h2>
              <span className="font-mono text-[0.74rem] text-ink-faint">
                {fill(t.shop.itemCount, { count: products.length })}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
                <PackageOpen size={26} className="text-ink-faint" aria-hidden="true" />
                <h3 className="font-display font-semibold text-navy">{t.shop.empty}</h3>
                <p className="max-w-md text-[0.875rem] text-ink-dim">{t.shop.emptyBody}</p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} locale={locale} strings={t.shop} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}
