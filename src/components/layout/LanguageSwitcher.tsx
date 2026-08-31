"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, localeFromPath, type Locale } from "@/lib/locale";
import { rememberLocale } from "@/lib/i18n/remember";

/**
 * Switches language while staying on the same page.
 *
 * This is the part bilingual sites usually get wrong: clicking "Français"
 * on a track page and landing on the French homepage means losing your
 * place, and it happens because the switcher links to "/" plus a locale
 * rather than swapping the segment of the path you are already on.
 *
 * The choice is written to a cookie the proxy reads, so the next visit,
 * and any unprefixed link they follow, opens in the language they picked
 * rather than the one their browser guessed for them.
 */
export function LanguageSwitcher({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = localeFromPath(pathname);

  function swap(next: Locale) {
    if (next === current) return;

    // Replace only the first segment, so /en/tracks/cisco-ccna becomes
    // /fr/tracks/cisco-ccna rather than /fr.
    const segments = pathname.split("/");
    segments[1] = next;
    const target = segments.join("/") || `/${next}`;

    rememberLocale(next);

    startTransition(() => {
      router.push(target);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={label}>
      <Languages
        size={14}
        className={tone === "dark" ? "text-white/50" : "text-ink-faint"}
        aria-hidden="true"
      />
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => swap(locale)}
            disabled={pending || active}
            aria-current={active ? "true" : undefined}
            className={
              "px-1.5 py-1 font-mono text-[0.7rem] tracking-wider uppercase transition-colors " +
              (active
                ? tone === "dark"
                  ? "font-semibold text-white"
                  : "font-semibold text-navy"
                : tone === "dark"
                  ? "text-white/55 hover:text-white"
                  : "text-ink-faint hover:text-blue-lift")
            }
          >
            <span className="sr-only">{LOCALE_NAMES[locale]}</span>
            <span aria-hidden="true">{locale}</span>
          </button>
        );
      })}
    </div>
  );
}
