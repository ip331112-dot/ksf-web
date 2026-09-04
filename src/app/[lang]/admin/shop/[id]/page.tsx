import { notFound, redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductEditor } from "@/components/shop/ProductEditor";
import { getAdminProduct, getAllCategories } from "@/lib/shop/queries";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "border-ok text-ok bg-ok-soft",
  draft: "border-warn text-warn",
  archived: "border-line text-ink-faint",
};

export default async function EditProductPage({
  params,
}: PageProps<"/[lang]/admin/shop/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/admin/login");

  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getAllCategories(),
  ]);

  if (!product) notFound();

  return (
    <>
      <AdminHeader email={user.email} active="shop" />

      <main id="main" className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <Link
          href="/admin/shop"
          className="inline-flex items-center gap-1 text-[0.82rem] text-ink-dim transition-colors hover:text-navy"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          All products
        </Link>

        <div className="mt-3 mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-2xl font-extrabold text-navy">
            {product.name_en || "Untitled draft"}
          </h1>
          <span
            className={`border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase ${STATUS_STYLES[product.status]}`}
          >
            {product.status}
          </span>
          {product.status === "published" && (
            <Link
              href={`/shop/${product.slug}`}
              className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-blue-lift hover:underline"
            >
              View in the shop
              <ExternalLink size={12} aria-hidden="true" />
            </Link>
          )}
        </div>

        <ProductEditor product={product} categories={categories} />
      </main>
    </>
  );
}
