import { redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { Plus, PackageOpen, ShieldAlert, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { getAdminProducts, imageUrl } from "@/lib/shop/queries";
import { formatPence } from "@/lib/shop/money";
import { fromPrice, languageProgress, type ProductStatus } from "@/lib/shop/schema";
import { SITE } from "@/content/site";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<ProductStatus, string> = {
  published: "border-ok text-ok bg-ok-soft",
  draft: "border-warn text-warn",
  archived: "border-line text-ink-faint",
};

export default async function AdminShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/admin/login");

  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <>
        <AdminHeader email={user.email} active="shop" />
        <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <div className="flex gap-3 border border-warn/40 bg-warn/5 p-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <div>
              <h1 className="font-display font-semibold text-navy">This account is not staff</h1>
              <p className="mt-1.5 max-w-prose text-[0.9rem] leading-relaxed text-ink-dim">
                You are signed in as {user.email}, but this address is not in the
                admin list. Ask an existing administrator to add you, or contact{" "}
                {SITE.email}.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const products = await getAdminProducts();

  const counts = {
    published: products.filter((p) => p.status === "published").length,
    draft: products.filter((p) => p.status === "draft").length,
    // Anything physical whose every variant is at or below its warning
    // level. Surfaced here because the alternative is finding out when
    // somebody orders it.
    low: products.filter(
      (p) =>
        p.kind === "physical" &&
        p.status === "published" &&
        p.variants.length > 0 &&
        p.variants.every((v) => v.stock <= v.low_stock_at),
    ).length,
  };

  return (
    <>
      <AdminHeader email={user.email} active="shop" />

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy">Shop</h1>
            <p className="mt-1 text-[0.9rem] text-ink-dim">
              Everything in the catalogue, most recently changed first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stat label="Live" value={counts.published} tone="ok" />
            <Stat label="Drafts" value={counts.draft} tone="warn" />
            <Stat label="Low stock" value={counts.low} tone="red" />
            <Link
              href="/admin/shop/categories"
              className="border border-line px-4 py-2.5 text-[0.85rem] font-semibold text-navy transition-colors hover:border-blue"
            >
              Categories
            </Link>
            <Link
              href="/admin/shop/new"
              className="inline-flex items-center gap-1.5 bg-blue px-4 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-3"
            >
              <Plus size={15} aria-hidden="true" />
              New product
            </Link>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
            <PackageOpen size={26} className="text-ink-faint" aria-hidden="true" />
            <h2 className="font-display font-semibold text-navy">Nothing in the shop yet</h2>
            <p className="max-w-md text-[0.875rem] text-ink-dim">
              Add your first product — a wireless adapter, a hoodie, a book or a
              download. Nothing appears on the site until you publish it.
            </p>
            <Link
              href="/admin/shop/new"
              className="mt-1 text-[0.85rem] font-semibold text-blue-lift hover:underline"
            >
              Add a product
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {products.map((p) => {
              const price = fromPrice(p, p.variants as never);
              const en = languageProgress(p, "en");
              const fr = languageProgress(p, "fr");
              const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              const lowest = Math.min(...p.variants.map((v) => v.low_stock_at), 3);
              const cover = p.images[0];

              return (
                <li key={p.id} className="border border-line bg-surface">
                  <Link
                    href={`/admin/shop/${p.id}`}
                    className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-2"
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center border border-line-soft bg-surface-2">
                      {cover ? (
                        /* Supabase storage is not in images.remotePatterns, and a
                           56px admin thumbnail is not worth an optimiser round trip. */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl(cover.path)}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <CategoryIcon
                          name={p.category ? iconFor(p.category.slug) : "bag"}
                          size={20}
                          className="text-ink-faint"
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-semibold text-navy">
                        {p.name_en || <em className="text-ink-faint">Untitled draft</em>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.68rem] text-ink-faint">
                        <span>{p.category ? p.category.name_en : "No category"}</span>
                        <span>/{p.slug}</span>
                        <span>{p.kind === "digital" ? "Download" : "Ships"}</span>
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2">
                      {(en.done < en.total || fr.done < fr.total) && (
                        <span className="border border-warn/50 px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-warn uppercase">
                          EN {en.done}/{en.total} · FR {fr.done}/{fr.total}
                        </span>
                      )}

                      {p.kind === "physical" && (
                        <span
                          className={
                            "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase " +
                            (stock === 0
                              ? "border-red text-red bg-red-soft"
                              : stock <= lowest
                                ? "border-warn text-warn"
                                : "border-line text-ink-dim")
                          }
                        >
                          {stock <= lowest && stock > 0 && (
                            <AlertTriangle size={10} aria-hidden="true" />
                          )}
                          {stock === 0 ? "Sold out" : `${stock} in stock`}
                        </span>
                      )}

                      <span className="tabular font-mono text-[0.85rem] text-blue-lift">
                        {price === 0 ? "Free" : formatPence(price)}
                      </span>

                      <span
                        className={`border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

/** Best-guess icon for a category we only know by slug, for the fallback tile. */
function iconFor(slug: string): string {
  const map: Record<string, string> = {
    "hardware-bundles": "gift",
    "wireless-adapters": "wifi",
    "pentesting-tools": "mask",
    security: "lock",
    accessories: "mug",
    clothing: "tie",
    books: "book",
  };
  return map[slug] ?? "bag";
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "red";
}) {
  const tones = {
    ok: "border-ok text-ok",
    warn: value > 0 ? "border-warn text-warn" : "border-line text-ink-faint",
    red: value > 0 ? "border-red text-red" : "border-line text-ink-faint",
  };
  return (
    <div className={`border bg-surface px-3.5 py-2 ${tones[tone]}`}>
      <span className="block font-display text-lg font-extrabold tabular-nums">{value}</span>
      <span className="font-mono text-[0.58rem] tracking-widest text-ink-faint uppercase">
        {label}
      </span>
    </div>
  );
}
