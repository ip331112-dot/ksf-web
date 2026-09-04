import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { isEmailConfigured } from "@/lib/email/shop";
import { fill } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.checkoutTitle, robots: { index: false, follow: false } };
}

/**
 * After the order is placed.
 *
 * The reference and the status link arrive as query parameters rather
 * than being looked up: the order was just created by the action that
 * redirected here, and re-reading it would mean either another token
 * round trip or exposing an order by reference alone.
 *
 * If email is not configured this page is the ONLY place the link
 * exists, so it says so plainly instead of implying an email is coming.
 * The same honesty the apply flow already applies.
 */
export default async function CheckoutSentPage({
  searchParams,
}: PageProps<"/[lang]/checkout/sent">) {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const params = await searchParams;

  const reference = typeof params.ref === "string" ? params.ref : "";
  const token = typeof params.t === "string" ? params.t : "";

  // Landing here directly, with no order behind it, is a wrong turn
  // rather than an error page.
  if (!reference || !token) redirect(`/${locale}/shop`);

  const emailed = isEmailConfigured();

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={26} className="mt-1 shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h1 className="font-display text-3xl font-extrabold text-navy">
              {t.checkout.sentTitle}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-dim">
              {emailed
                ? fill(t.checkout.sentBody, { reference })
                : fill(t.checkout.sentNotEmailed, { reference })}
            </p>
          </div>
        </div>

        {!emailed && (
          <p className="mt-6 flex items-start gap-2 border border-warn/40 bg-warn/5 p-4 text-[0.88rem] text-ink-dim">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            {t.checkout.keepLink}
          </p>
        )}

        <div className="mt-8 border border-line bg-surface p-6">
          <p className="font-mono text-[0.7rem] tracking-[0.16em] text-ink-faint uppercase">
            {t.order.title.replace("{reference}", "")}
          </p>
          <p className="mt-1 font-mono text-xl text-navy">{reference}</p>

          <Link
            href={`/orders/${token}`}
            className="mt-5 inline-block bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-3"
          >
            {t.checkout.yourOrder}
          </Link>

          <p className="mt-4 text-[0.82rem] text-ink-faint">{t.checkout.keepLink}</p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
