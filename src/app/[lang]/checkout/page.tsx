import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.checkoutTitle, robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
        <h1 className="mb-8 font-display text-3xl font-extrabold text-navy">{t.checkout.title}</h1>
        <CheckoutForm locale={locale} strings={t.checkout} />
      </main>
      <SiteFooter />
    </>
  );
}
