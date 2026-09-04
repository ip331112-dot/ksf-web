import { notFound, redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { ChevronLeft, Download, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OrderPanel } from "@/components/shop/OrderPanel";
import { formatPence } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/schema";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: "border-warn text-warn",
  paid: "border-blue text-blue-lift bg-blue-soft",
  dispatched: "border-ok text-ok bg-ok-soft",
  cancelled: "border-line text-ink-faint",
  refunded: "border-line text-ink-faint",
};

type Order = {
  id: string;
  reference: string;
  created_at: string;
  status: OrderStatus;
  name: string;
  email: string;
  phone: string | null;
  locale: string;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_postcode: string | null;
  ship_country: string | null;
  goods_pence: number;
  postage_pence: number;
  total_pence: number;
  paid_at: string | null;
  paid_by: string | null;
  payment_note: string | null;
  tracking: string | null;
  carrier: string | null;
  digital_consent: boolean;
  items: {
    id: string;
    name_snapshot: string;
    option_snapshot: string | null;
    kind: "physical" | "digital";
    unit_price_pence: number;
    qty: number;
  }[];
};

type Event = { id: string; created_at: string; actor: string | null; event: string; detail: string | null };

export default async function AdminOrderPage({ params }: PageProps<"/[lang]/admin/orders/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/admin/login");

  const { id } = await params;

  const { data: order } = await supabase
    .from("orders")
    .select(
      `*, items:order_items(id, name_snapshot, option_snapshot, kind, unit_price_pence, qty)`,
    )
    .eq("id", id)
    .maybeSingle<Order>();

  if (!order) notFound();

  const { data: events } = await supabase
    .from("order_events")
    .select("id, created_at, actor, event, detail")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  const hasPhysical = order.items.some((i) => i.kind === "physical");

  return (
    <>
      <AdminHeader email={user.email} active="orders" />

      <main id="main" className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-[0.82rem] text-ink-dim transition-colors hover:text-navy"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          All orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-2xl font-extrabold text-navy">{order.reference}</h1>
          <span className={`border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase ${STATUS_STYLES[order.status]}`}>
            {order.status.replace("_", " ")}
          </span>
          <span className="font-mono text-[0.72rem] text-ink-faint">
            {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
          <div className="flex flex-col gap-6">
            <OrderPanel
              orderId={order.id}
              status={order.status}
              totalPence={order.total_pence}
              hasPhysical={hasPhysical}
            />

            <section>
              <h2 className="mb-3 font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">
                What they ordered
              </h2>
              <ul className="border border-line bg-surface">
                {order.items.map((item, i) => (
                  <li key={item.id} className={"flex items-center gap-3 p-4 " + (i > 0 ? "border-t border-line-soft" : "")}>
                    {item.kind === "digital" ? (
                      <Download size={15} className="shrink-0 text-blue-lift" aria-hidden="true" />
                    ) : (
                      <Package size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 text-[0.9rem] text-ink">
                      {item.qty} × {item.name_snapshot}
                      {item.option_snapshot && (
                        <span className="font-mono text-[0.72rem] text-ink-faint"> · {item.option_snapshot}</span>
                      )}
                    </span>
                    <span className="tabular font-mono text-[0.88rem] text-ink-dim">
                      {formatPence(item.unit_price_pence * item.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 flex flex-col gap-1.5 text-[0.88rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-dim">Goods</dt>
                  <dd className="tabular font-mono text-ink">{formatPence(order.goods_pence)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-dim">Postage</dt>
                  <dd className="tabular font-mono text-ink">{formatPence(order.postage_pence)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line-soft pt-2">
                  <dt className="font-semibold text-navy">Total</dt>
                  <dd className="tabular font-mono text-blue-lift">{formatPence(order.total_pence)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="mb-3 font-mono text-[0.66rem] tracking-[0.18em] text-ink-faint uppercase">
                History
              </h2>
              <ul className="flex flex-col gap-2">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="border-l-2 border-line pl-3 text-[0.83rem]">
                    <span className="font-mono text-[0.7rem] tracking-wide text-ink-faint uppercase">
                      {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      {e.actor && ` · ${e.actor}`}
                    </span>
                    <span className="mt-0.5 block text-ink-dim">
                      <strong className="font-medium text-navy">{e.event.replace(/_/g, " ")}</strong>
                      {e.detail && ` — ${e.detail}`}
                    </span>
                  </li>
                ))}
                {(events ?? []).length === 0 && (
                  <li className="text-[0.85rem] text-ink-faint">Nothing recorded yet.</li>
                )}
              </ul>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="border border-line bg-surface p-4">
              <h2 className="mb-2 font-mono text-[0.64rem] tracking-[0.16em] text-ink-faint uppercase">
                Buyer
              </h2>
              <p className="text-[0.9rem] font-medium text-navy">{order.name}</p>
              <a href={`mailto:${order.email}`} className="block text-[0.83rem] text-blue-lift hover:underline">
                {order.email}
              </a>
              {order.phone && <p className="text-[0.83rem] text-ink-dim">{order.phone}</p>}
              <p className="mt-2 font-mono text-[0.68rem] text-ink-faint uppercase">
                Wrote in {order.locale}
              </p>
            </div>

            {order.ship_line1 && (
              <div className="border border-line bg-surface p-4">
                <h2 className="mb-2 font-mono text-[0.64rem] tracking-[0.16em] text-ink-faint uppercase">
                  Post to
                </h2>
                <address className="text-[0.85rem] leading-relaxed text-ink-dim not-italic">
                  {order.ship_line1}
                  {order.ship_line2 && <><br />{order.ship_line2}</>}
                  <br />{order.ship_city} {order.ship_postcode}
                  <br />{order.ship_country}
                </address>
              </div>
            )}

            {order.paid_at && (
              <div className="border border-line bg-surface p-4">
                <h2 className="mb-2 font-mono text-[0.64rem] tracking-[0.16em] text-ink-faint uppercase">
                  Payment
                </h2>
                <p className="text-[0.83rem] text-ink-dim">
                  {new Date(order.paid_at).toLocaleString("en-GB", { dateStyle: "medium" })}
                  {order.paid_by && <><br />confirmed by {order.paid_by}</>}
                  {order.payment_note && <><br />ref: {order.payment_note}</>}
                </p>
              </div>
            )}

            {order.digital_consent && (
              <p className="border border-line bg-surface p-4 text-[0.8rem] text-ink-faint">
                Consented to immediate delivery of downloads, waiving the 14-day
                cancellation right on those items.
              </p>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
