"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Eye, EyeOff, Plus, X } from "lucide-react";
import { CategoryIcon, CATEGORY_ICONS, type CategoryIconName } from "@/components/shop/CategoryIcon";
import { saveCategory, setCategoryVisible } from "@/lib/shop/admin-actions";
import type { ShopCategory } from "@/lib/shop/schema";

/**
 * Managing the shop menu.
 *
 * The whole promise of this build is that stocking the shop never needs
 * a deploy, and that has to include the menu — otherwise adding one
 * category is the single thing that sends you back to a developer.
 *
 * Groups are numbered rather than named because the number is what draws
 * the break in the rail. Group 1 is the gear above the divider, group 2
 * everything below it; a third would simply add another break.
 */

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

type Draft = {
  id?: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  icon: CategoryIconName;
  grp: number;
  sortOrder: number;
};

const blank = (grp: number, sortOrder: number): Draft => ({
  slug: "", nameEn: "", nameFr: "", icon: "bag", grp, sortOrder,
});

export function CategoryEditor({ categories }: { categories: ShopCategory[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const groups = categories.reduce<Map<number, ShopCategory[]>>((acc, c) => {
    const list = acc.get(c.grp) ?? [];
    list.push(c);
    acc.set(c.grp, list);
    return acc;
  }, new Map());

  function save() {
    if (!editing) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveCategory({
        ...editing,
        slug: editing.slug || slugify(editing.nameEn),
      });
      if (result.ok) {
        setEditing(null);
        setMessage({ tone: "ok", text: "Saved." });
        router.refresh();
      } else {
        setMessage({ tone: "bad", text: result.error ?? "Could not save." });
      }
    });
  }

  function toggle(c: ShopCategory) {
    startTransition(async () => {
      const result = await setCategoryVisible(c.id, !c.visible);
      if (!result.ok) setMessage({ tone: "bad", text: result.error ?? "Could not change it." });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      {/* The menu as it stands ------------------------------------- */}
      <div>
        {[...groups.entries()].map(([grp, items]) => (
          <div key={grp} className="mb-6">
            <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint uppercase">
              Group {grp}
            </p>
            <ul className="border border-line bg-surface">
              {items.map((c, i) => (
                <li
                  key={c.id}
                  className={
                    "flex flex-wrap items-center gap-3 px-4 py-3 " +
                    (i > 0 ? "border-t border-line-soft " : "") +
                    (c.visible ? "" : "opacity-55")
                  }
                >
                  <CategoryIcon name={c.icon} size={19} className="shrink-0 text-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-navy">{c.name_en}</span>
                    <span className="block truncate font-mono text-[0.68rem] text-ink-faint">
                      {c.name_fr} · /{c.slug}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    disabled={pending}
                    title={c.visible ? "Hide from the menu" : "Show in the menu"}
                    className="p-1.5 text-ink-faint transition-colors hover:text-navy disabled:opacity-50"
                  >
                    {c.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    <span className="sr-only">
                      {c.visible ? "Hide from the menu" : "Show in the menu"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: c.id, slug: c.slug, nameEn: c.name_en, nameFr: c.name_fr,
                        icon: (c.icon as CategoryIconName) ?? "bag",
                        grp: c.grp, sortOrder: c.sort_order,
                      })
                    }
                    className="border border-line px-3 py-1.5 text-[0.8rem] font-semibold text-navy transition-colors hover:border-blue"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setEditing(blank(groups.size > 0 ? Math.max(...groups.keys()) : 1, categories.length))}
          className="inline-flex items-center gap-1.5 border border-line px-4 py-2.5 text-[0.85rem] font-semibold text-navy transition-colors hover:border-blue"
        >
          <Plus size={14} aria-hidden="true" />
          Add a category
        </button>

        {message && (
          <p
            role="status"
            className={"mt-4 flex items-center gap-1.5 text-[0.85rem] " + (message.tone === "ok" ? "text-ok" : "text-red")}
          >
            {message.tone === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
            {message.text}
          </p>
        )}
      </div>

      {/* The form --------------------------------------------------- */}
      {editing && (
        <div className="border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display font-semibold text-navy">
              {editing.id ? "Edit category" : "New category"}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Close"
              className="text-ink-faint transition-colors hover:text-navy"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <Labelled label="Name (English)">
              <input
                value={editing.nameEn}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                placeholder="Wireless Adapters"
                className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink outline-none"
              />
            </Labelled>

            <Labelled label="Nom (Français)">
              <input
                value={editing.nameFr}
                onChange={(e) => setEditing({ ...editing, nameFr: e.target.value })}
                placeholder="Adaptateurs sans fil"
                className="w-full border border-field bg-surface-2 px-3 py-2 text-[0.875rem] text-ink outline-none"
              />
            </Labelled>

            <Labelled label="Web address">
              <div className="flex items-center border border-field bg-surface-2">
                <span className="pl-3 font-mono text-[0.75rem] text-ink-faint">/shop/category/</span>
                <input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder={slugify(editing.nameEn) || "wireless-adapters"}
                  className="w-full bg-transparent px-1 py-2 font-mono text-[0.78rem] text-ink outline-none"
                />
              </div>
            </Labelled>

            <Labelled label="Icon">
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(CATEGORY_ICONS) as CategoryIconName[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={CATEGORY_ICONS[name]}
                    onClick={() => setEditing({ ...editing, icon: name })}
                    className={
                      "flex aspect-square items-center justify-center border transition-colors " +
                      (editing.icon === name
                        ? "border-blue bg-blue-soft text-blue"
                        : "border-line text-ink-faint hover:border-field hover:text-ink")
                    }
                  >
                    <CategoryIcon name={name} size={18} />
                    <span className="sr-only">{CATEGORY_ICONS[name]}</span>
                  </button>
                ))}
              </div>
            </Labelled>

            <div className="grid grid-cols-2 gap-3">
              <Labelled label="Group">
                <input
                  type="number" min={1} max={9}
                  value={editing.grp}
                  onChange={(e) => setEditing({ ...editing, grp: Number(e.target.value) })}
                  className="w-full border border-field bg-surface-2 px-3 py-2 font-mono text-[0.875rem] text-ink outline-none"
                />
              </Labelled>
              <Labelled label="Position">
                <input
                  type="number" min={0} max={999}
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                  className="w-full border border-field bg-surface-2 px-3 py-2 font-mono text-[0.875rem] text-ink outline-none"
                />
              </Labelled>
            </div>
            <p className="text-[0.74rem] text-ink-faint">
              The menu breaks between groups. Position orders rows within one.
            </p>

            <button
              type="button"
              onClick={save}
              disabled={pending || !editing.nameEn.trim() || !editing.nameFr.trim()}
              className="mt-1 bg-blue px-4 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-3 disabled:bg-surface-2 disabled:text-ink-faint"
            >
              {pending ? "Saving…" : "Save category"}
            </button>
            {(!editing.nameEn.trim() || !editing.nameFr.trim()) && (
              <p className="text-[0.76rem] text-warn">Both languages are needed.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.64rem] tracking-[0.08em] text-ink-faint uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
