import { redirect } from "next/navigation";
import { Link } from "@/components/i18n/Link";
import { Inbox, Download, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { formatPence } from "@/lib/shop/money";
import type { OrderStatus } from "@/lib/shop/schema";

export const dynamic = "force-dynamic";

/** Unpaid this long is worth chasing — the same treatment enquiries get. */
const OVERDUE_HOURS = 72;

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: "border-warn text-warn",
  paid: "border-blue text-blue-lift bg-blue-soft",
  dispatched: "border-ok text-ok bg-ok-soft",
  cancelled: "border-line text-ink-faint",
  refunded: "border-line text-ink-faint",
};

type Row = {
  id: string;
  reference: string;
  created_at: string;
  status: OrderStatus;
  name: string;
  email: string;
  total_pence: number;
  ship_country: string | null;
  items: { kind: string; qty: number }[];
};

type DecoratedRow = Row & { overdue: boolean };

/**
 * Reading the clock is impure, so it happens here rather than inside the
 * component — React's purity rule rightly rejects `Date.now()` during
 * render. Same shape as the enquiries board.
 */
async function loadOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ rows: DecoratedRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, reference, created_at, status, name, email, total_pence, ship_country, items:order_items(kind, qty)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const now = Date.now();
  const cutoff = OVERDUE_HOURS * 3600_000;

  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      overdue:
        r.status === "awaiting_payment" && now - new Date(r.created_at).getTime() > cutoff,
    })),
    error: error?.message ?? null,
  };
}

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/admin/login");

  const { rows, error } = await loadOrders(supabase);

  const counts = {
    awaiting: rows.filter((r) => r.status === "awaiting_payment").length,
    paid: rows.filter((r) => r.status === "paid").length,
    overdue: rows.filter((r) => r.overdue).length,
  };

  return (
    <>
      <AdminHeader email={user.email} active="orders" />

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy">Orders</h1>
            <p className="mt-1 text-[0.9rem] text-ink-dim">
              Newest first. Anything unpaid after {OVERDUE_HOURS} hours is marked overdue.
            </p>
          </div>
          <div className="flex gap-2">
            <Stat label="To pay" value={counts.awaiting} tone="warn" />
            <Stat label="To pack" value={counts.paid} tone="blue" />
            <Stat label="Overdue" value={counts.overdue} tone="red" />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 border border-red/40 bg-red-soft p-4 text-[0.875rem] text-navy">
            Could not load orders: {error}
          </p>
        )}

        {rows.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
            <Inbox size={26} className="text-ink-faint" aria-hidden="true" />
            <h2 className="font-display font-semibold text-navy">No orders yet</h2>
            <p className="max-w-md text-[0.875rem] text-ink-dim">
              Orders from the shop arrive here. Each one waits for you to confirm
              the bank transfer before anything is delivered.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {rows.map((o) => {
              const { overdue } = o;
              const digital = o.items.filter((i) => i.kind === "digital").length;
              const physical = o.items.filter((i) => i.kind === "physical").length;

              return (
                <li key={o.id} className={"border bg-surface " + (overdue ? "border-red/50" : "border-line")}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[0.85rem] text-navy">{o.reference}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[0.68rem] text-ink-faint">
                        <span>{o.name}</span>
                        <span>{o.email}</span>
                        {o.ship_country && <span>{o.ship_country}</span>}
                      </span>
                    </span>

                    <span className="flex items-center gap-3 font-mono text-[0.68rem] text-ink-faint">
                      {physical > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Package size={12} aria-hidden="true" />{physical}
                        </span>
                      )}
                      {digital > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Download size={12} aria-hidden="true" />{digital}
                        </span>
                      )}
                    </span>

                    <span className="tabular font-mono text-[0.88rem] text-blue-lift">
                      {formatPence(o.total_pence)}
                    </span>

                    {overdue && (
                      <span className="border border-red bg-red-soft px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-red uppercase">
                        Overdue
                      </span>
                    )}

                    <span className={`border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase ${STATUS_STYLES[o.status]}`}>
                      {o.status.replace("_", " ")}
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

function Stat({ label, value, tone }: { label: string; value: number; tone: "warn" | "blue" | "red" }) {
  const tones = {
    warn: value > 0 ? "border-warn text-warn" : "border-line text-ink-faint",
    blue: value > 0 ? "border-blue text-blue-lift" : "border-line text-ink-faint",
    red: value > 0 ? "border-red text-red" : "border-line text-ink-faint",
  };
  return (
    <div className={`border bg-surface px-4 py-2 ${tones[tone]}`}>
      <span className="block font-display text-xl font-extrabold tabular-nums">{value}</span>
      <span className="font-mono text-[0.6rem] tracking-widest text-ink-faint uppercase">{label}</span>
    </div>
  );
}
