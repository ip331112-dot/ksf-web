import { z } from "zod";
import type { Locale } from "@/lib/locale";

/**
 * Shop types and input validation.
 *
 * The row types mirror migration 0003 rather than being generated: the
 * Supabase type generator cannot reach this project (its tooling is
 * authenticated elsewhere), so these are hand-kept and must be updated
 * alongside the SQL.
 */

export const PRODUCT_KINDS = ["physical", "digital"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "dispatched",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ShopCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_fr: string;
  icon: string;
  grp: number;
  sort_order: number;
  visible: boolean;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  option1: string | null;
  option2: string | null;
  sku: string | null;
  /** null means "use the product's price" — see 0003 chunk 4. */
  price_pence: number | null;
  stock: number;
  low_stock_at: number;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  path: string;
  alt_en: string | null;
  alt_fr: string | null;
  sort_order: number;
};

export type ProductSpec = {
  id: string;
  product_id: string;
  label_en: string;
  label_fr: string;
  value_en: string;
  value_fr: string;
  sort_order: number;
};

export type Product = {
  id: string;
  slug: string;
  category_id: string | null;
  kind: ProductKind;
  status: ProductStatus;
  name_en: string | null;
  summary_en: string | null;
  description_en: string | null;
  name_fr: string | null;
  summary_fr: string | null;
  description_fr: string | null;
  price_pence: number;
  compare_at_pence: number | null;
  weight_grams: number | null;
  file_path: string | null;
  file_bytes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** A product with everything a page needs, in one shape. */
export type FullProduct = Product & {
  category: ShopCategory | null;
  variants: ProductVariant[];
  images: ProductImage[];
  specs: ProductSpec[];
};

/**
 * Pick the field for a locale.
 *
 * There is no fallback to English on purpose. A published product is
 * guaranteed by a database constraint to have both languages, so a
 * missing French name here means something is wrong and an empty string
 * makes that visible rather than hiding it behind English text on a
 * French page.
 */
export function t<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  return (row[`${field}_${locale}`] as string | null) ?? "";
}

/** What a variant actually costs, resolving the null-means-inherit rule. */
export function variantPrice(product: Pick<Product, "price_pence">, variant: ProductVariant): number {
  return variant.price_pence ?? product.price_pence;
}

/** The lowest price across a product's variants — the "from" on a card. */
export function fromPrice(product: Product, variants: ProductVariant[]): number {
  if (variants.length === 0) return product.price_pence;
  return Math.min(...variants.map((v) => variantPrice(product, v)));
}

export type StockState = "in" | "low" | "out";

export function stockState(variant: ProductVariant): StockState {
  if (variant.stock <= 0) return "out";
  return variant.stock <= variant.low_stock_at ? "low" : "in";
}

/** A product is buyable if any variant is. Digital never runs out. */
export function anyInStock(kind: ProductKind, variants: ProductVariant[]): boolean {
  if (kind === "digital") return true;
  return variants.some((v) => v.stock > 0);
}

// ---------------------------------------------------------------------
// Admin input
// ---------------------------------------------------------------------

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only.");

/**
 * Draft rules, not publish rules.
 *
 * Almost everything is optional here so a half-finished product can be
 * saved and come back to. Completeness is checked at publish time by
 * `publishBlockers` below, and again by the database constraint — a form
 * that refuses to save until it is perfect is a form people work around.
 */
export const productDraftInput = z.object({
  id: z.uuid().optional(),
  slug,
  categoryId: z.uuid().nullable(),
  kind: z.enum(PRODUCT_KINDS),
  nameEn: z.string().trim().max(120).default(""),
  summaryEn: z.string().trim().max(400).default(""),
  descriptionEn: z.string().trim().max(8000).default(""),
  nameFr: z.string().trim().max(120).default(""),
  summaryFr: z.string().trim().max(400).default(""),
  descriptionFr: z.string().trim().max(8000).default(""),
  pricePence: z.coerce.number().int().min(0).max(10_000_00),
  compareAtPence: z.coerce.number().int().min(0).max(10_000_00).nullable(),
  weightGrams: z.coerce.number().int().min(0).max(100_000).nullable(),
});

export type ProductDraftInput = z.infer<typeof productDraftInput>;

export const variantInput = z.object({
  id: z.uuid().optional(),
  option1: z.string().trim().max(40).nullable(),
  option2: z.string().trim().max(40).nullable(),
  sku: z.string().trim().max(60).nullable(),
  pricePence: z.coerce.number().int().min(0).max(10_000_00).nullable(),
  stock: z.coerce.number().int().min(0).max(100_000),
  lowStockAt: z.coerce.number().int().min(0).max(1000),
});

export const categoryInput = z.object({
  id: z.uuid().optional(),
  slug,
  nameEn: z.string().trim().min(1).max(60),
  nameFr: z.string().trim().min(1).max(60),
  icon: z.string().trim().max(40),
  grp: z.coerce.number().int().min(1).max(9),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

/**
 * Why this product cannot go live yet, in the order a person would fix
 * them. Empty means publishable.
 *
 * This exists so the button can say what is missing instead of just
 * being greyed out. It mirrors the `products_publishable` constraint in
 * 0003 — if you change one, change the other.
 */
export function publishBlockers(
  p: Pick<
    Product,
    | "name_en" | "summary_en" | "description_en"
    | "name_fr" | "summary_fr" | "description_fr"
    | "category_id" | "kind" | "file_path"
  >,
): string[] {
  const missing: string[] = [];
  const blank = (v: string | null) => !v || v.trim().length === 0;

  if (blank(p.name_en)) missing.push("English name");
  if (blank(p.summary_en)) missing.push("English short description");
  if (blank(p.description_en)) missing.push("English full description");
  if (blank(p.name_fr)) missing.push("French name");
  if (blank(p.summary_fr)) missing.push("French short description");
  if (blank(p.description_fr)) missing.push("French full description");
  if (!p.category_id) missing.push("a category");
  if (p.kind === "digital" && !p.file_path) missing.push("the file to deliver");

  return missing;
}

/** How many of the six translated fields are filled, per language. */
export function languageProgress(
  p: Pick<Product, "name_en" | "summary_en" | "description_en" | "name_fr" | "summary_fr" | "description_fr">,
  locale: Locale,
): { done: number; total: number } {
  const fields =
    locale === "en"
      ? [p.name_en, p.summary_en, p.description_en]
      : [p.name_fr, p.summary_fr, p.description_fr];
  return {
    done: fields.filter((f) => f && f.trim().length > 0).length,
    total: fields.length,
  };
}
