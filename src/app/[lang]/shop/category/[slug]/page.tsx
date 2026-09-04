import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CtaBand } from "@/components/layout/CtaBand";
import { ShopSidebar } from "@/components/shop/ShopSidebar";
import { ProductCard } from "@/components/shop/ProductCard";
import { getCatalogue, getCategories } from "@/lib/shop/queries";
import { fill } from "@/lib/locale";
import { t as pick } from "@/lib/shop/schema";

export const dynamic = "force-dynamic";

/**
 * A category is a real URL rather than a query string, so a filtered
 * view can be linked, shared and indexed. Products live at /shop/[slug]
 * and categories at /shop/category/[slug], which keeps the two
 * namespaces from ever colliding over a shared word like "security".
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/shop/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [dict, locale, categories] = await Promise.all([
    getDictionary(),
    getLocale(),
    getCategories(),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: dict.meta.shopTitle };

  const name = pick(category, "name", locale);
  return {
    title: `${name} — ${dict.shop.menuTitle}`,
    description: dict.meta.shopDescription,
    alternates: await alternatesFor(`/shop/category/${slug}`),
  };
}

export default async function ShopCategoryPage({
  params,
}: PageProps<"/[lang]/shop/category/[slug]">) {
  const { slug } = await params;
  const [t, locale, categories] = await Promise.all([
    getDictionary(),
    getLocale(),
    getCategories(),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await getCatalogue(slug);

  return (
    <>
      <SiteHeader />

      <main id="main">
        <section className="border-b border-line bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <span className="eyebrow text-blue-lift">{t.shop.menuTitle}</span>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
              {pick(category, "name", locale)}
            </h1>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[15rem_1fr] lg:px-8">
          <ShopSidebar
            categories={categories}
            active={slug}
            locale={locale}
            title={t.shop.menuTitle}
            allLabel={t.shop.all}
          />

          <div>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-navy">
                {pick(category, "name", locale)}
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
