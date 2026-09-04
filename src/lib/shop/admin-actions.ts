"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  categoryInput,
  productDraftInput,
  publishBlockers,
  variantInput,
  type ProductKind,
} from "./schema";

/**
 * Staff actions for the shop.
 *
 * A Server Action is a POST endpoint. Rendering a page behind a login is
 * not a boundary, so every action here authorises independently — the
 * same reasoning as applications/admin-actions.ts, and the same helper
 * shape so the two read alike.
 */

export type Result<T = undefined> = {
  ok: boolean;
  error?: string;
  data?: T;
};

async function requireAdmin(): Promise<{ email: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { email: null, error: "Your session has expired. Sign in again." };

  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { email: null, error: "This account is not staff." };
  return { email: user.email ?? null, error: null };
}

function refresh(id?: string) {
  revalidatePath("/[lang]/admin/shop", "page");
  if (id) revalidatePath(`/[lang]/admin/shop/${id}`, "page");
  revalidatePath("/[lang]/shop", "page");
}

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

/**
 * Create or update a draft.
 *
 * Deliberately permissive: almost every field may be blank, so a product
 * can be started and finished later. Completeness is a publish concern,
 * not a save concern.
 */
export async function saveProduct(raw: unknown): Promise<Result<{ id: string }>> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = productDraftInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That input is not valid." };
  }
  const p = parsed.data;

  const row = {
    slug: p.slug,
    category_id: p.categoryId,
    kind: p.kind,
    name_en: p.nameEn || null,
    summary_en: p.summaryEn || null,
    description_en: p.descriptionEn || null,
    name_fr: p.nameFr || null,
    summary_fr: p.summaryFr || null,
    description_fr: p.descriptionFr || null,
    price_pence: p.pricePence,
    compare_at_pence: p.compareAtPence,
    weight_grams: p.weightGrams,
  };

  const supabase = await createClient();

  if (p.id) {
    const { error } = await supabase.from("products").update(row).eq("id", p.id);
    if (error) return { ok: false, error: friendly(error.message) };
    refresh(p.id);
    return { ok: true, data: { id: p.id } };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: friendly(error.message) };

  // Every product gets one variant immediately, so a mug and a hoodie
  // share a code path. Options stay null until someone adds sizes.
  const { error: vError } = await supabase
    .from("product_variants")
    .insert({ product_id: data.id, option1: null, option2: null, stock: 0 });

  if (vError) console.error("[shop] default variant:", vError.message);

  refresh(data.id);
  return { ok: true, data: { id: data.id } };
}

/**
 * Turn a database error into something a person can act on.
 *
 * Postgres constraint names are precise and useless to the person
 * looking at the form. Anything unrecognised is passed through rather
 * than swallowed — a mystery error that says "something went wrong" is
 * worse than a technical one.
 */
function friendly(message: string): string {
  if (message.includes("products_slug_key")) {
    return "That web address is already used by another product.";
  }
  if (message.includes("product_variants_sku_key")) {
    return "That product code is already used.";
  }
  if (message.includes("products_publishable")) {
    return "Both languages must be complete before this can be published.";
  }
  if (message.includes("product_variants_combo_idx")) {
    return "That combination of options already exists on this product.";
  }
  if (message.includes("compare_at_pence")) {
    return "The 'was' price has to be higher than the price.";
  }
  return message;
}

export async function publishProduct(id: string): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "That product id is not valid." };

  const supabase = await createClient();

  // Read it back and explain what is missing, rather than letting the
  // database constraint fire and reporting its name.
  const { data: product } = await supabase
    .from("products")
    .select("name_en, summary_en, description_en, name_fr, summary_fr, description_fr, category_id, kind, file_path")
    .eq("id", id)
    .maybeSingle<{
      name_en: string | null; summary_en: string | null; description_en: string | null;
      name_fr: string | null; summary_fr: string | null; description_fr: string | null;
      category_id: string | null; kind: ProductKind; file_path: string | null;
    }>();

  if (!product) return { ok: false, error: "That product no longer exists." };

  const missing = publishBlockers(product);
  if (missing.length > 0) {
    return { ok: false, error: `Still needed: ${missing.join(", ")}.` };
  }

  const { error } = await supabase.from("products").update({ status: "published" }).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };

  refresh(id);
  return { ok: true };
}

export async function setProductStatus(
  id: string,
  status: "draft" | "archived",
): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };

  refresh(id);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 200 * 1024 * 1024;

/**
 * Mint a one-time URL the browser can upload straight to.
 *
 * THIS IS THE WHOLE REASON UPLOADS WORK. A Server Action caps its
 * request body at 1 MB by default, and Vercel caps a serverless request
 * at about 4.5 MB with no way to raise it. A 40 MB ebook or a 6 MB
 * product photo therefore cannot be sent to the server at all. So the
 * file never touches it: this returns a signed URL, the browser PUTs to
 * storage directly, and `attachImage` / `attachFile` records the path
 * afterwards.
 *
 * The signed URL is single-use and scoped to one path, so handing it to
 * the browser grants nothing beyond writing that one object.
 */
export async function createUploadUrl(input: {
  productId: string;
  target: "image" | "file";
  contentType: string;
  bytes: number;
  filename: string;
}): Promise<Result<{ path: string; token: string; bucket: string }>> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  if (!z.uuid().safeParse(input.productId).success) {
    return { ok: false, error: "That product id is not valid." };
  }

  const isImage = input.target === "image";

  if (isImage && !IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Images must be JPEG, PNG, WebP or AVIF." };
  }
  if (isImage && input.bytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "That image is over 8 MB. Resize it and try again." };
  }
  if (!isImage && input.bytes > MAX_FILE_BYTES) {
    return { ok: false, error: "That file is over 200 MB." };
  }

  const bucket = isImage ? "shop-images" : "shop-files";

  // The stored name is generated, never the uploaded one: a filename
  // arrives from a browser and can carry path separators, control
  // characters or another product's id. Only the extension is kept.
  const ext = (input.filename.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${input.productId}/${randomUUID()}${ext ? `.${ext}` : ""}`;

  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUploadUrl(path);

  if (error) return { ok: false, error: `Could not start the upload: ${error.message}` };

  return { ok: true, data: { path: data.path, token: data.token, bucket } };
}

export async function attachImage(productId: string, path: string): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, path, sort_order: count ?? 0 });

  if (error) return { ok: false, error: error.message };

  refresh(productId);
  return { ok: true };
}

export async function attachFile(
  productId: string,
  path: string,
  bytes: number,
): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ file_path: path, file_bytes: bytes })
    .eq("id", productId);

  if (error) return { ok: false, error: error.message };

  refresh(productId);
  return { ok: true };
}

/**
 * Remove an image, from the table and from storage.
 *
 * Storage is cleared first. If the row delete then failed we would show
 * a broken image, which is visible and fixable; the other order leaves
 * an orphaned object nobody ever notices and the bucket grows forever.
 */
export async function deleteImage(imageId: string): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();
  const { data: image } = await supabase
    .from("product_images")
    .select("id, path, product_id")
    .eq("id", imageId)
    .maybeSingle<{ id: string; path: string; product_id: string }>();

  if (!image) return { ok: false, error: "That image no longer exists." };

  const { error: storageError } = await createAdminClient()
    .storage.from("shop-images")
    .remove([image.path]);

  if (storageError) console.error("[shop] image remove:", storageError.message);

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };

  refresh(image.product_id);
  return { ok: true };
}

/** Reorder a gallery. The first image is what the shop card shows. */
export async function reorderImages(productId: string, orderedIds: string[]): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
  }

  refresh(productId);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------

/**
 * Replace a product's variants with the given set.
 *
 * Rows carrying an id are updated; new ones are inserted; anything left
 * out is deleted. Deleting matters: `order_items.variant_id` is
 * `on delete set null`, so an old order keeps its frozen name and price
 * even after the size it referred to is gone.
 */
export async function saveVariants(productId: string, raw: unknown[]): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = z.array(variantInput).max(60).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Those options are not valid." };
  }
  if (parsed.data.length === 0) {
    return { ok: false, error: "A product needs at least one row to be sellable." };
  }

  const supabase = await createClient();
  const keep = parsed.data.filter((v) => v.id).map((v) => v.id!);

  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .returns<{ id: string }[]>();

  const toDelete = (existing ?? []).map((v) => v.id).filter((id) => !keep.includes(id));
  if (toDelete.length > 0) {
    const { error } = await supabase.from("product_variants").delete().in("id", toDelete);
    if (error) return { ok: false, error: friendly(error.message) };
  }

  for (const [index, v] of parsed.data.entries()) {
    const row = {
      product_id: productId,
      option1: v.option1 || null,
      option2: v.option2 || null,
      sku: v.sku || null,
      price_pence: v.pricePence,
      stock: v.stock,
      low_stock_at: v.lowStockAt,
      sort_order: index,
    };

    const { error } = v.id
      ? await supabase.from("product_variants").update(row).eq("id", v.id)
      : await supabase.from("product_variants").insert(row);

    if (error) return { ok: false, error: friendly(error.message) };
  }

  refresh(productId);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------

const specInput = z.object({
  id: z.uuid().optional(),
  labelEn: z.string().trim().min(1).max(80),
  labelFr: z.string().trim().min(1).max(80),
  valueEn: z.string().trim().min(1).max(200),
  valueFr: z.string().trim().min(1).max(200),
});

export async function saveSpecs(productId: string, raw: unknown[]): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = z.array(specInput).max(40).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Every specification needs a label and a value in both languages." };
  }

  const supabase = await createClient();

  // Specs are few, unordered by nature and have no foreign keys pointing
  // at them, so a clean replace is simpler and safer than diffing.
  const { error: clearError } = await supabase
    .from("product_specs")
    .delete()
    .eq("product_id", productId);
  if (clearError) return { ok: false, error: clearError.message };

  if (parsed.data.length > 0) {
    const { error } = await supabase.from("product_specs").insert(
      parsed.data.map((s, index) => ({
        product_id: productId,
        label_en: s.labelEn, label_fr: s.labelFr,
        value_en: s.valueEn, value_fr: s.valueFr,
        sort_order: index,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  refresh(productId);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function saveCategory(raw: unknown): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = categoryInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That category is not valid." };
  }
  const c = parsed.data;

  const row = {
    slug: c.slug,
    name_en: c.nameEn,
    name_fr: c.nameFr,
    icon: c.icon,
    grp: c.grp,
    sort_order: c.sortOrder,
  };

  const supabase = await createClient();
  const { error } = c.id
    ? await supabase.from("shop_categories").update(row).eq("id", c.id)
    : await supabase.from("shop_categories").insert(row);

  if (error) {
    return {
      ok: false,
      error: error.message.includes("shop_categories_slug_key")
        ? "That web address is already used by another category."
        : error.message,
    };
  }

  revalidatePath("/[lang]/admin/shop/categories", "page");
  revalidatePath("/[lang]/shop", "page");
  return { ok: true };
}

/**
 * Hide a category rather than deleting it.
 *
 * `products.category_id` is `on delete restrict`, so a category holding
 * products cannot be removed anyway — and should not be, since that
 * would orphan them. Hiding takes it out of the menu and leaves the
 * products reachable by their own address.
 */
export async function setCategoryVisible(id: string, visible: boolean): Promise<Result> {
  const { error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = await createClient();
  const { error } = await supabase.from("shop_categories").update({ visible }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[lang]/admin/shop/categories", "page");
  revalidatePath("/[lang]/shop", "page");
  return { ok: true };
}
