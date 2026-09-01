import { Link } from "@/components/i18n/Link";
import { ArrowRight } from "lucide-react";
import { PRICE_GBP } from "@/content/tracks";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { fill } from "@/lib/locale";

/**
 * Pre-footer call to action. Appears on every page except the apply flow
 * and the applicant status page, where it would pull people out of a task.
 */
export async function CtaBand() {
  const t = await getDictionary();

  return (
    <section className="bg-navy-grad">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            {t.cta.title}
          </h2>
          <p className="mt-3 text-white/70">
            {fill(t.cta.body, { price: PRICE_GBP })}
          </p>
        </div>
        <Link
          href="/tracks"
          className="inline-flex shrink-0 items-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-lift"
        >
          {t.home.browseTracks}
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
