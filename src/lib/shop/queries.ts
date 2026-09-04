import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FullProduct,
  Product,
  ProductImage,
  ProductVariant,
  ShopCategory,
} from "./schema";

/**
 * Reads for the storefront and the admin.
 *
 * Storefront reads go through the session client, so row-level security
 * does the filtering: `public reads live products` in 0003 makes drafts
 * invisible at the API rather than merely absent from a `where` clause.
 * That means a mistake in a query here cannot leak an unpublished
 * product — the database refuses before the code gets a chance.
 *
 * Admin reads use the same client; RLS grants staff the wider view.
 */

export function isShopReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

// Re-exported so server callers have one import for shop data. The
// definition lives in urls.ts because Client Components need it too and
// this module is server-only.
export { imageUrl } from "./urls";

export async function getCategories(): Promise<ShopCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_categories")
    .select("*")
    .order("grp", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<ShopCategory[]>();

  if (error) {
    console.error("[shop] categories:", error.message);
    return [];
  }
  return data ?? [];
}

/** Categories including hidden ones. Admin only — RLS enforces that. */
export async function getAllCategories(): Promise<ShopCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_categories")
    .select("*")
    .order("grp", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<ShopCategory[]>();
  return data ?? [];
}

export type CatalogueEntry = Product & {
  variants: Pick<ProductVariant, "id" | "price_pence" | "stock" | "low_stock_at" | "option1">[];
  images: Pick<ProductImage, "path" | "alt_en" | "alt_fr">[];
  category: Pick<ShopCategory, "slug" | "name_en" | "name_fr"> | null;
};

/**
 * The catalogue, optionally filtered to one category.
 *
 * One round trip with nested selects rather than a query per product —
 * a grid of thirty cards should not be thirty-one requests.
 */
export async function getCatalogue(categorySlug?: string): Promise<CatalogueEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      `*,
       variants:product_variants(id, price_pence, stock, low_stock_at, option1),
       images:product_images(path, alt_en, alt_fr),
       category:shop_categories(slug, name_en, name_fr)`,
    )
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (categorySlug) {
    // Filtering on the joined table's column, which PostgREST spells
    // with the embedded resource's name rather than the FK column.
    query = query.eq("shop_categories.slug", categorySlug);
  }

  const { data, error } = await query.returns<CatalogueEntry[]>();

  if (error) {
    console.error("[shop] catalogue:", error.message);
    return [];
  }

  // A filter on an embedded resource still returns the parent row with a
  // null embed, so drop those rather than rendering a card with no
  // category under a category heading.
  const rows = data ?? [];
  return categorySlug ? rows.filter((r) => r.category) : rows;
}

export async function getProduct(slug: string): Promise<FullProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `*,
       category:shop_categories(*),
       variants:product_variants(*),
       images:product_images(*),
       specs:product_specs(*)`,
    )
    .eq("slug", slug)
    .maybeSingle<FullProduct>();

  if (error) {
    console.error("[shop] product:", error.message);
    return null;
  }
  if (!data) return null;

  return withSortedChildren(data);
}

/** Every product, any status. Admin list. */
export async function getAdminProducts(): Promise<CatalogueEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `*,
       variants:product_variants(id, price_pence, stock, low_stock_at, option1),
       images:product_images(path, alt_en, alt_fr),
       category:shop_categories(slug, name_en, name_fr)`,
    )
    .order("updated_at", { ascending: false })
    .returns<CatalogueEntry[]>();

  if (error) {
    console.error("[shop] admin products:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getAdminProduct(id: string): Promise<FullProduct | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `*,
       category:shop_categories(*),
       variants:product_variants(*),
       images:product_images(*),
       specs:product_specs(*)`,
    )
    .eq("id", id)
    .maybeSingle<FullProduct>();

  if (!data) return null;
  return withSortedChildren(data);
}

/**
 * PostgREST does not order embedded rows, so sizes would come back in
 * whatever order the planner produced — which is stable enough to look
 * deliberate and unstable enough to reorder a hoodie's sizes one day.
 */
function withSortedChildren(product: FullProduct): FullProduct {
  const bySort = <T extends { sort_order: number }>(rows: T[] | null) =>
    [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return {
    ...product,
    variants: bySort(product.variants),
    images: bySort(product.images),
    specs: bySort(product.specs),
  };
}

/**
 * Resolve basket lines to real variants, at the server's prices.
 *
 * The basket lives in the browser, so everything in it is a claim rather
 * than a fact. Nothing arriving from the client is trusted here: the
 * price is read from the database and the caller checks stock. A cart
 * asserting that a £249 bundle costs £2.49 buys nothing.
 *
 * Uses the service role because a checkout must be able to price a
 * product that has been unpublished since it went into the basket — the
 * anon key cannot see it, and silently dropping the line would be worse
 * than telling the buyer it is no longer available.
 */
export type PricedLine = {
  variantId: string;
  productId: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  option: string | null;
  kind: "physical" | "digital";
  unitPricePence: number;
  weightGrams: number;
  stock: number;
  published: boolean;
};

export async function priceLines(variantIds: string[]): Promise<PricedLine[]> {
  if (variantIds.length === 0) return [];

  // The embed is to-one, but PostgREST's generated types cannot know
  // that and infer an array. `.returns` states the real shape, which is
  // how the rest of this codebase handles the same problem.
  type Row = {
    id: string;
    option1: string | null;
    option2: string | null;
    price_pence: number | null;
    stock: number;
    product: {
      id: string;
      slug: string;
      kind: "physical" | "digital";
      status: string;
      price_pence: number;
      weight_grams: number | null;
      name_en: string | null;
      name_fr: string | null;
    } | null;
  };

  const { data, error } = await createAdminClient()
    .from("product_variants")
    .select(
      `id, option1, option2, price_pence, stock,
       product:products(id, slug, kind, status, price_pence, weight_grams,
                        name_en, name_fr)`,
    )
    .in("id", variantIds)
    .returns<Row[]>();

  if (error) {
    console.error("[shop] priceLines:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((r): r is Row & { product: NonNullable<Row["product"]> } => Boolean(r.product))
    .map((r) => ({
      variantId: r.id,
      productId: r.product.id,
      slug: r.product.slug,
      nameEn: r.product.name_en ?? "",
      nameFr: r.product.name_fr ?? "",
      option: [r.option1, r.option2].filter(Boolean).join(" · ") || null,
      kind: r.product.kind,
      unitPricePence: r.price_pence ?? r.product.price_pence,
      weightGrams: r.product.weight_grams ?? 0,
      stock: r.stock,
      published: r.product.status === "published",
    }));
}
