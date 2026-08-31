import { Link } from "@/components/i18n/Link";
import { ArrowRight } from "lucide-react";
import { PRICE_GBP } from "@/content/tracks";

/**
 * Pre-footer call to action. Appears on every page except the apply flow
 * and the applicant status page, where it would pull people out of a task.
 */
export function CtaBand() {
  return (
    <section className="bg-navy-grad">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Ready to start? Apply to a track today.
          </h2>
          <p className="mt-3 text-white/70">
            £{PRICE_GBP} a month, mentored preparation, and a real answer from a real
            person. Not accepted? You are refunded in full, automatically.
          </p>
        </div>
        <Link
          href="/tracks"
          className="inline-flex shrink-0 items-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-lift"
        >
          Browse tracks
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
