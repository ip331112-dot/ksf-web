import { redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CategoryEditor } from "@/components/shop/CategoryEditor";
import { getAllCategories } from "@/lib/shop/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/admin/login");

  const categories = await getAllCategories();

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

        <h1 className="mt-3 font-display text-2xl font-extrabold text-navy">Categories</h1>
        <p className="mt-1 mb-7 max-w-prose text-[0.9rem] text-ink-dim">
          The menu down the side of the shop. Hiding a category takes it out of
          that menu without touching the products in it — which is what you want,
          because a category holding products cannot be deleted.
        </p>

        <CategoryEditor categories={categories} />
      </main>
    </>
  );
}
