/**
 * Storage URLs.
 *
 * Separate from queries.ts, which is `server-only`: the product editor
 * renders uploaded photos in the browser and needs this, and importing
 * it from the server module would drag the service-role client into a
 * Client Component bundle — which is exactly what `server-only` exists
 * to make impossible.
 */

/**
 * Public URL for an object in the shop-images bucket.
 *
 * shop-images is public, so this needs no signing. shop-files
 * deliberately has no equivalent: those objects are private and reached
 * only through /api/download, which mints a short-lived signed URL after
 * checking a grant.
 */
export function imageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/shop-images/${path}`;
}
