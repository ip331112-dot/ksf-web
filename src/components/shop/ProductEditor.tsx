"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Check, Globe, ImagePlus, Loader2, Plus, Trash2, Upload, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { imageUrl } from "@/lib/shop/urls";
import { penceToInput, parsePounds, formatPence } from "@/lib/shop/money";
import type { FullProduct, ProductKind, ShopCategory } from "@/lib/shop/schema";
import {
  attachFile, attachImage, createUploadUrl, deleteImage,
  publishProduct, saveProduct, saveSpecs, saveVariants, setProductStatus,
} from "@/lib/shop/admin-actions";

/**
 * The whole product form.
 *
 * One screen rather than a wizard: staff adding their fifth adapter
 * should not be walked through five steps, and a draft is saved the
 * moment they press save regardless of how complete it is.
 *
 * Uploads never pass through the server — see `createUploadUrl` in
 * admin-actions.ts for why they cannot.
 */

type SpecRow = { id?: string; labelEn: string; labelFr: string; valueEn: string; valueFr: string };
type VariantRow = {
  id?: string;
  option1: string;
  option2: string;
  sku: string;
  price: string;
  stock: string;
  lowStockAt: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export function ProductEditor({
  product,
  categories,
}: {
  product: FullProduct | null;
  categories: ShopCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [id, setId] = useState(product?.id ?? null);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? "physical");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");

  const [nameEn, setNameEn] = useState(product?.name_en ?? "");
  const [summaryEn, setSummaryEn] = useState(product?.summary_en ?? "");
  const [descriptionEn, setDescriptionEn] = useState(product?.description_en ?? "");
  const [nameFr, setNameFr] = useState(product?.name_fr ?? "");
  const [summaryFr, setSummaryFr] = useState(product?.summary_fr ?? "");
  const [descriptionFr, setDescriptionFr] = useState(product?.description_fr ?? "");

  const [price, setPrice] = useState(penceToInput(product?.price_pence ?? 0));
  const [compareAt, setCompareAt] = useState(penceToInput(product?.compare_at_pence));
  const [weight, setWeight] = useState(product?.weight_grams?.toString() ?? "");

  const [images, setImages] = useState(product?.images ?? []);
  const [filePath, setFilePath] = useState(product?.file_path ?? null);
  const [fileBytes, setFileBytes] = useState(product?.file_bytes ?? null);

  const [specs, setSpecs] = useState<SpecRow[]>(
    (product?.specs ?? []).map((s) => ({
      id: s.id, labelEn: s.label_en, labelFr: s.label_fr,
      valueEn: s.value_en, valueFr: s.value_fr,
    })),
  );

  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.variants ?? []).map((v) => ({
      id: v.id,
      option1: v.option1 ?? "",
      option2: v.option2 ?? "",
      sku: v.sku ?? "",
      price: penceToInput(v.price_pence),
      stock: v.stock.toString(),
      lowStockAt: v.low_stock_at.toString(),
    })),
  );

  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [uploading, setUploading] = useState<null | "image" | "file">(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Live mirror of the database constraint, so the button can say what is
  // missing instead of just being grey.
  const missing: string[] = [];
  if (!nameEn.trim()) missing.push("English name");
  if (!summaryEn.trim()) missing.push("English short description");
  if (!descriptionEn.trim()) missing.push("English full description");
  if (!nameFr.trim()) missing.push("French name");
  if (!summaryFr.trim()) missing.push("French short description");
  if (!descriptionFr.trim()) missing.push("French full description");
  if (!categoryId) missing.push("a category");
  if (kind === "digital" && !filePath) missing.push("the file to deliver");

  const enDone = [nameEn, summaryEn, descriptionEn].filter((v) => v.trim()).length;
  const frDone = [nameFr, summaryFr, descriptionFr].filter((v) => v.trim()).length;

  function payload() {
    return {
      id: id ?? undefined,
      slug: slug || slugify(nameEn) || "untitled",
      categoryId: categoryId || null,
      kind,
      nameEn, summaryEn, descriptionEn,
      nameFr, summaryFr, descriptionFr,
      pricePence: parsePounds(price) ?? 0,
      compareAtPence: parsePounds(compareAt),
      weightGrams: weight.trim() === "" ? null : Number(weight),
    };
  }

  /** Save everything, in dependency order. Returns the id, or null. */
  async function persist(): Promise<string | null> {
    const saved = await saveProduct(payload());
    if (!saved.ok || !saved.data) {
      setMessage({ tone: "bad", text: saved.error ?? "Could not save." });
      return null;
    }
    const productId = saved.data.id;
    setId(productId);

    if (variants.length > 0) {
      const result = await saveVariants(
        productId,
        variants.map((v) => ({
          id: v.id,
          option1: v.option1 || null,
          option2: v.option2 || null,
          sku: v.sku || null,
          pricePence: v.price.trim() === "" ? null : (parsePounds(v.price) ?? 0),
          stock: Number(v.stock || 0),
          lowStockAt: Number(v.lowStockAt || 3),
        })),
      );
      if (!result.ok) {
        setMessage({ tone: "bad", text: result.error ?? "Could not save the options." });
        return null;
      }
    }

    const usable = specs.filter(
      (s) => s.labelEn.trim() && s.labelFr.trim() && s.valueEn.trim() && s.valueFr.trim(),
    );
    if (usable.length !== specs.length && specs.length > 0) {
      setMessage({
        tone: "bad",
        text: "Every specification needs a label and a value in both languages.",
      });
      return null;
    }
    const specResult = await saveSpecs(productId, usable);
    if (!specResult.ok) {
      setMessage({ tone: "bad", text: specResult.error ?? "Could not save the specifications." });
      return null;
    }

    return productId;
  }

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const productId = await persist();
      if (!productId) return;
      setMessage({ tone: "ok", text: "Saved." });
      if (!product) router.replace(`/en/admin/shop/${productId}`);
      else router.refresh();
    });
  }

  function onPublish() {
    setMessage(null);
    startTransition(async () => {
      const productId = await persist();
      if (!productId) return;
      const result = await publishProduct(productId);
      setMessage(
        result.ok
          ? { tone: "ok", text: "Published — it is live in the shop now." }
          : { tone: "bad", text: result.error ?? "Could not publish." },
      );
      router.refresh();
    });
  }

  function onUnpublish() {
    if (!id) return;
    startTransition(async () => {
      const result = await setProductStatus(id, "draft");
      setMessage(
        result.ok
          ? { tone: "ok", text: "Taken off the shop. It is a draft again." }
          : { tone: "bad", text: result.error ?? "Could not unpublish." },
      );
      router.refresh();
    });
  }

  /**
   * Upload straight to storage.
   *
   * The product has to exist first so the object has somewhere to live,
   * which is why an unsaved product is saved before the picker result is
   * used.
   */
  async function upload(file: File, target: "image" | "file") {
    setMessage(null);
    setUploading(target);
    try {
      let productId = id;
      if (!productId) {
        productId = await persist();
        if (!productId) return;
      }

      const signed = await createUploadUrl({
        productId,
        target,
        contentType: file.type,
        bytes: file.size,
        filename: file.name,
      });

      if (!signed.ok || !signed.data) {
        setMessage({ tone: "bad", text: signed.error ?? "Could not start the upload." });
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage
        .from(signed.data.bucket)
        .uploadToSignedUrl(signed.data.path, signed.data.token, file);

      if (error) {
        setMessage({ tone: "bad", text: `Upload failed: ${error.message}` });
        return;
      }

      if (target === "image") {
        const attached = await attachImage(productId, signed.data.path);
        if (!attached.ok) {
          setMessage({ tone: "bad", text: attached.error ?? "Could not attach the image." });
          return;
        }
        setImages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            product_id: productId,
            path: signed.data!.path,
            alt_en: null, alt_fr: null,
            sort_order: current.length,
          },
        ]);
        router.refresh();
      } else {
        const attached = await attachFile(productId, signed.data.path, file.size);
        if (!attached.ok) {
          setMessage({ tone: "bad", text: attached.error ?? "Could not attach the file." });
          return;
        }
        setFilePath(signed.data.path);
        setFileBytes(file.size);
      }

      setMessage({ tone: "ok", text: `${file.name} uploaded.` });
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* What is it ------------------------------------------------- */}
      <Section title="What is it">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            <div className="flex border border-field">
              {(["physical", "digital"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={
                    "px-3.5 py-2 text-[0.8rem] font-semibold transition-colors " +
                    (kind === k ? "bg-blue text-white" : "text-ink-dim hover:text-navy")
                  }
                >
                  {k === "physical" ? "Ships in a box" : "Download"}
                </button>
              ))}
            </div>
            <Hint>
              {kind === "physical"
                ? "Weight, stock and delivery apply."
                : "No postage. Delivered by a private link after payment."}
            </Hint>
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink"
            >
              <option value="">Choose one…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_en}</option>
              ))}
            </select>
          </Field>

          <Field label="Web address">
            <div className="flex items-center border border-field bg-surface-2">
              <span className="pl-3 font-mono text-[0.78rem] text-ink-faint">/shop/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                onBlur={() => { if (!slugTouched && nameEn) setSlug(slugify(nameEn)); }}
                placeholder={slugify(nameEn) || "long-range-adapter"}
                className="w-full bg-transparent px-1 py-2 font-mono text-[0.8rem] text-ink outline-none"
              />
            </div>
            <Hint>Filled in from the English name if you leave it.</Hint>
          </Field>
        </div>
      </Section>

      {/* Both languages --------------------------------------------- */}
      <Section title="Details, in both languages">
        <div className="grid gap-4 lg:grid-cols-2">
          <LangColumn label="English" done={enDone} total={3}>
            <Field label="Name">
              <Input value={nameEn} onChange={setNameEn} placeholder="Long-range USB adapter" />
            </Field>
            <Field label="Short description">
              <Area value={summaryEn} onChange={setSummaryEn} rows={2}
                placeholder="One line for the shop card." />
            </Field>
            <Field label="Full description">
              <Area value={descriptionEn} onChange={setDescriptionEn} rows={6}
                placeholder="What it is, who it suits, what is in the box." />
            </Field>
          </LangColumn>

          <LangColumn label="Français" done={frDone} total={3}>
            <Field label="Nom">
              <Input value={nameFr} onChange={setNameFr} placeholder="Adaptateur USB longue portée" />
            </Field>
            <Field label="Description courte">
              <Area value={summaryFr} onChange={setSummaryFr} rows={2} />
            </Field>
            <Field label="Description complète">
              <Area value={descriptionFr} onChange={setDescriptionFr} rows={6} />
            </Field>
          </LangColumn>
        </div>
      </Section>

      {/* Price ------------------------------------------------------ */}
      <Section title="Price">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price">
            <Input value={price} onChange={setPrice} placeholder="42.00" mono suffix="GBP" />
            <Hint>Zero means free — delivered without an invoice.</Hint>
          </Field>
          <Field label="Was (optional)">
            <Input value={compareAt} onChange={setCompareAt} placeholder="49.00" mono suffix="GBP" />
            <Hint>Shown struck through. Must be higher than the price.</Hint>
          </Field>
          {kind === "physical" && (
            <Field label="Weight">
              <Input value={weight} onChange={setWeight} placeholder="180" mono suffix="grams" />
              <Hint>Sets the postage band. Required for anything posted.</Hint>
            </Field>
          )}
        </div>
      </Section>

      {/* Options and stock ------------------------------------------ */}
      {kind === "physical" && (
        <Section
          title="Options and stock"
          aside={
            <button type="button" onClick={() =>
              setVariants((v) => [...v, { option1: "", option2: "", sku: "", price: "", stock: "0", lowStockAt: "3" }])
            } className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift hover:underline">
              <Plus size={13} aria-hidden="true" />Add a row
            </button>
          }
        >
          <p className="mb-3 max-w-prose text-[0.82rem] text-ink-dim">
            One row per thing you count separately. A mug needs one row with
            the options blank. A hoodie needs one row per size, because each
            sells out on its own.
          </p>

          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[42rem] border-collapse text-[0.85rem]">
              <thead>
                <tr className="bg-surface-2">
                  {["Option", "Second option", "Product code", "Price", "Stock", "Warn at", ""].map((h) => (
                    <th key={h} className="border-b border-line px-3 py-2 text-left font-mono text-[0.62rem] tracking-widest text-ink-faint uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id ?? i} className="border-b border-line-soft last:border-0">
                    <Cell><Bare value={v.option1} onChange={(x) => patch(setVariants, i, { option1: x })} placeholder="M" /></Cell>
                    <Cell><Bare value={v.option2} onChange={(x) => patch(setVariants, i, { option2: x })} placeholder="Charcoal" /></Cell>
                    <Cell><Bare value={v.sku} onChange={(x) => patch(setVariants, i, { sku: x })} placeholder="KSF-HD-M" mono /></Cell>
                    <Cell><Bare value={v.price} onChange={(x) => patch(setVariants, i, { price: x })} placeholder={price || "—"} mono /></Cell>
                    <Cell><Bare value={v.stock} onChange={(x) => patch(setVariants, i, { stock: x })} mono /></Cell>
                    <Cell><Bare value={v.lowStockAt} onChange={(x) => patch(setVariants, i, { lowStockAt: x })} mono /></Cell>
                    <Cell>
                      {variants.length > 1 && (
                        <button type="button" aria-label="Remove this row"
                          onClick={() => setVariants((rows) => rows.filter((_, x) => x !== i))}
                          className="text-ink-faint transition-colors hover:text-red">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Hint>Leave a row&apos;s price blank to use the product price above.</Hint>
        </Section>
      )}

      {/* Photos ----------------------------------------------------- */}
      <Section title="Photos">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
          {images.map((img, i) => (
            <div key={img.id} className={"group relative aspect-square border bg-surface-2 " + (i === 0 ? "border-blue" : "border-line")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- see admin/shop/page.tsx */}
              <img src={imageUrl(img.path)} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 bg-blue px-1.5 py-0.5 font-mono text-[0.55rem] tracking-widest text-white uppercase">
                  Main
                </span>
              )}
              <button
                type="button"
                aria-label="Remove this photo"
                onClick={() => startTransition(async () => {
                  const result = await deleteImage(img.id);
                  if (result.ok) setImages((c) => c.filter((x) => x.id !== img.id));
                  else setMessage({ tone: "bad", text: result.error ?? "Could not remove it." });
                })}
                className="absolute top-1 right-1 bg-ground/80 p-1 text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-red focus-visible:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => imageInput.current?.click()}
            disabled={uploading !== null}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 border border-dashed border-field text-blue-lift transition-colors hover:border-blue disabled:opacity-50"
          >
            {uploading === "image"
              ? <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              : <ImagePlus size={20} aria-hidden="true" />}
            <span className="font-mono text-[0.6rem] tracking-widest uppercase">
              {uploading === "image" ? "Uploading" : "Add"}
            </span>
          </button>
        </div>

        <input
          ref={imageInput} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image"); e.target.value = ""; }}
        />
        <Hint>The first photo is what the shop card shows. JPEG, PNG, WebP or AVIF, up to 8 MB.</Hint>
      </Section>

      {/* The file, for downloads ------------------------------------ */}
      {kind === "digital" && (
        <Section title="The file people receive">
          <div className={"flex items-center gap-3 border p-4 " + (filePath ? "border-line bg-surface" : "border-dashed border-field")}>
            {uploading === "file"
              ? <Loader2 size={20} className="shrink-0 animate-spin text-blue" aria-hidden="true" />
              : <Upload size={20} className={"shrink-0 " + (filePath ? "text-ok" : "text-blue")} aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.875rem] font-medium text-ink">
                {filePath ? filePath.split("/").pop() : "No file yet"}
              </p>
              <p className="text-[0.76rem] text-ink-faint">
                {fileBytes
                  ? `${(fileBytes / 1024 / 1024).toFixed(1)} MB · uploaded straight to storage`
                  : "Never leaves the private bucket. Buyers get a link that expires."}
              </p>
            </div>
            <button
              type="button" onClick={() => fileInput.current?.click()} disabled={uploading !== null}
              className="shrink-0 border border-line px-3.5 py-2 text-[0.8rem] font-semibold text-navy transition-colors hover:border-blue disabled:opacity-50"
            >
              {filePath ? "Replace" : "Choose a file"}
            </button>
          </div>
          <input
            ref={fileInput} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "file"); e.target.value = ""; }}
          />
        </Section>
      )}

      {/* Specs ------------------------------------------------------ */}
      <Section
        title="Specifications"
        aside={
          <button type="button" onClick={() =>
            setSpecs((s) => [...s, { labelEn: "", labelFr: "", valueEn: "", valueFr: "" }])
          } className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-blue-lift hover:underline">
            <Plus size={13} aria-hidden="true" />Add one
          </button>
        }
      >
        {specs.length === 0 ? (
          <p className="text-[0.85rem] text-ink-dim">
            Optional. A table on the product page — chipset, bands, connector.
            Leave it empty for mugs and shirts.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {specs.map((s, i) => (
              <div key={s.id ?? i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={s.labelEn} onChange={(x) => patch(setSpecs, i, { labelEn: x })} placeholder="Chipset" />
                  <Input value={s.labelFr} onChange={(x) => patch(setSpecs, i, { labelFr: x })} placeholder="Chipset (FR)" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={s.valueEn} onChange={(x) => patch(setSpecs, i, { valueEn: x })} placeholder="Realtek RTL8812AU" />
                  <Input value={s.valueFr} onChange={(x) => patch(setSpecs, i, { valueFr: x })} placeholder="Realtek RTL8812AU" />
                </div>
                <button type="button" aria-label="Remove this specification"
                  onClick={() => setSpecs((rows) => rows.filter((_, x) => x !== i))}
                  className="self-center px-2 text-ink-faint transition-colors hover:text-red">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Save bar --------------------------------------------------- */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-4">
        <div className="flex min-w-0 items-center gap-2">
          {message ? (
            <span className={"flex items-center gap-1.5 text-[0.82rem] " + (message.tone === "ok" ? "text-ok" : "text-red")}>
              {message.tone === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
              {message.text}
            </span>
          ) : missing.length > 0 ? (
            <span className="flex items-center gap-1.5 text-[0.82rem] text-warn">
              <Globe size={14} aria-hidden="true" />
              Still needed: {missing.join(", ")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[0.82rem] text-ok">
              <Check size={14} aria-hidden="true" />
              Ready to publish
              {price && ` · ${parsePounds(price) === 0 ? "Free" : formatPence(parsePounds(price) ?? 0)}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {product?.status === "published" && (
            <button type="button" onClick={onUnpublish} disabled={pending}
              className="border border-line px-4 py-2.5 text-[0.84rem] font-semibold text-navy transition-colors hover:border-blue disabled:opacity-50">
              Unpublish
            </button>
          )}
          <button type="button" onClick={onSave} disabled={pending}
            className="border border-line px-4 py-2.5 text-[0.84rem] font-semibold text-navy transition-colors hover:border-blue disabled:opacity-50">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button type="button" onClick={onPublish} disabled={pending || missing.length > 0}
            title={missing.length > 0 ? `Still needed: ${missing.join(", ")}` : undefined}
            className="bg-blue px-5 py-2.5 text-[0.84rem] font-semibold text-white transition-colors hover:bg-navy-3 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-faint">
            {product?.status === "published" ? "Save changes" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Patch one row of a list held in state. */
function patch<T>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  change: Partial<T>,
) {
  setter((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
}

// ---------------------------------------------------------------------
// Small presentational pieces, kept local — they are shaped by this form
// rather than being generally useful.
// ---------------------------------------------------------------------

function Section({
  title, children, aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">{title}</h2>
        <span className="h-px flex-1 bg-line-soft" />
        {aside}
      </div>
      {children}
    </section>
  );
}

function LangColumn({
  label, done, total, children,
}: {
  label: string;
  done: number;
  total: number;
  children: React.ReactNode;
}) {
  const complete = done === total;
  return (
    <div className="border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.7rem] tracking-[0.16em] text-ink-dim uppercase">{label}</span>
        <span className={"inline-flex items-center gap-1 font-mono text-[0.62rem] tracking-widest uppercase " + (complete ? "text-ok" : "text-warn")}>
          {complete ? <Check size={12} /> : <Globe size={12} />}
          {complete ? "Complete" : `${total - done} field${total - done === 1 ? "" : "s"} left`}
        </span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[0.66rem] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1.5 text-[0.74rem] text-ink-faint">{children}</p>
);

function Input({
  value, onChange, placeholder, mono, suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-center border border-field bg-surface-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={"w-full bg-transparent px-3 py-2 text-[0.875rem] text-ink outline-none placeholder:text-ink-faint " + (mono ? "font-mono tabular-nums" : "")}
      />
      {suffix && <span className="pr-3 font-mono text-[0.72rem] text-ink-faint">{suffix}</span>}
    </div>
  );
}

function Area({
  value, onChange, rows, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-y border border-field bg-surface-2 px-3 py-2 text-[0.875rem] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
    />
  );
}

const Cell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-2 py-1.5">{children}</td>
);

function Bare({
  value, onChange, placeholder, mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={"w-full min-w-[4.5rem] border border-field bg-surface-2 px-2 py-1.5 text-[0.82rem] text-ink outline-none placeholder:text-ink-faint " + (mono ? "font-mono tabular-nums" : "")}
    />
  );
}
