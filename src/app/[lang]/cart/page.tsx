import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CartView } from "@/components/shop/CartView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  // No canonical or hreflang: a basket is personal, has no shareable
  // content and has no business in an index.
  return { title: t.meta.cartTitle, robots: { index: false, follow: false } };
}

export default async function CartPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
        <h1 className="mb-8 font-display text-3xl font-extrabold text-navy">{t.cart.title}</h1>
        <CartView locale={locale} strings={t.cart} />
      </main>
      <SiteFooter />
    </>
  );
}
