import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/lib/locale";

/**
 * Locale routing and admin session refresh.
 *
 * Replaces middleware.ts — Next 16 deprecates that convention in favour
 * of `proxy`, and locale routing is the natural moment to migrate rather
 * than keep ignoring the build warning.
 *
 * Two jobs, in order:
 *   1. Every path gets a locale prefix. /tracks becomes /en/tracks or
 *      /fr/tracks depending on what the visitor has chosen or what their
 *      browser asks for.
 *   2. /admin requests refresh the Supabase session and bounce signed-out
 *      visitors to the login page — unchanged behaviour, now locale-aware.
 */

/**
 * Pick a language for someone who has not chosen one.
 *
 * A stored choice always wins over the browser header: someone who
 * clicked "English" on a French laptop meant it, and having the site
 * argue with them on the next page load is maddening.
 *
 * The Accept-Language parse is deliberately small rather than pulling in
 * a negotiation library for two locales. It reads the q-weighted list,
 * highest first, and takes the first base language we support.
 */
function detectLocale(request: NextRequest): Locale {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (chosen && isLocale(chosen)) return chosen;

  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .filter((x) => x.tag && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

async function refreshAdminSession(request: NextRequest, locale: Locale) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates against the auth server; getSession() would
  // trust a cookie the client could have tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const loginPath = `/${locale}/admin/login`;

  if (pathname.startsWith(`/${locale}/admin`) && pathname !== loginPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === loginPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/admin`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const current = LOCALES.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  // No locale in the path: send them to one. A redirect rather than a
  // rewrite, so the address bar shows the language they are reading —
  // which is what makes a link shareable in the right tongue.
  if (!current) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

    const redirect = NextResponse.redirect(url);
    // Remember a detected language too, so the detection runs once
    // rather than on every cold path.
    if (!request.cookies.get(LOCALE_COOKIE)) {
      redirect.cookies.set(LOCALE_COOKIE, locale, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
        path: "/",
      });
    }
    return redirect;
  }

  /**
   * The staff area is English only, and lives at one address.
   *
   * It sits under [lang] because the app needs a single root layout, not
   * because it is translated. Serving it at /fr/admin would put
   * `<html lang="fr-FR">` around English text, which tells a screen
   * reader to read English with French phonetics — so the URL is
   * corrected rather than the claim being left false.
   */
  if (pathname.startsWith(`/${current}/admin`)) {
    if (current !== DEFAULT_LOCALE) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(`/${current}/admin`, `/${DEFAULT_LOCALE}/admin`);
      return NextResponse.redirect(url);
    }
    return refreshAdminSession(request, current);
  }

  return NextResponse.next({ request });
}

export const config = {
  /**
   * Everything except Next internals, the SEO files and anything with a
   * file extension. robots.txt and sitemap.xml must never gain a locale
   * prefix — crawlers look for them at the root.
   */
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};
