import { Link } from "@/components/i18n/Link";
import { redirect } from "next/navigation";
import { getLocale } from "@/app/[lang]/dictionaries";
import { Inbox, ShieldAlert, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SITE } from "@/content/site";
import { getTrack } from "@/content/tracks";
import { OPEN_STATUSES, STATUS_LABELS, STATUS_STYLES } from "@/lib/applications/decisions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  reference: string;
  created_at: string;
  course_slug: string;
  name: string;
  email: string;
  status: string;
  paid_at: string | null;
};

/** Matches the response time promised on five public screens. */
const OVERDUE_DAYS = 3;

type Decorated = Row & { ageDays: number; overdue: boolean };

/**
 * Reading the clock is impure, so it happens during the fetch rather than
 * in the component — the same reason the enquiries queue loads this way.
 */
async function loadApplications(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ rows: Decorated[]; error: string | null }> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, reference, created_at, course_slug, name, email, status, paid_at")
    // Oldest first, deliberately. A queue sorted newest-first quietly
    // buries the person who has waited longest.
    .order("created_at", { ascending: true })
    .returns<Row[]>();

  const now = Date.now();

  return {
    rows: (data ?? []).map((r) => {
      const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
      return {
        ...r,
        ageDays,
        overdue: OPEN_STATUSES.includes(r.status) && ageDays >= OVERDUE_DAYS,
      };
    }),
    error: error?.message ?? null,
  };
}

export default async function ApplicationsQueue() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${await getLocale()}/admin/login`);

  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <>
        <AdminHeader email={user.email} active="applications" />
        <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <div className="flex gap-3 border border-warn/40 bg-warn/5 p-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <div>
              <h1 className="font-display font-semibold text-navy">
                This account is not staff
              </h1>
              <p className="mt-1.5 max-w-prose text-[0.9rem] text-ink-dim">
                You are signed in as {user.email}, but this address is not in the
                admin list. Contact {SITE.email}.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { rows, error } = await loadApplications(supabase);

  const counts = {
    awaiting: rows.filter((r) => r.status === "submitted").length,
    inReview: rows.filter((r) => r.status === "in_review").length,
    accepted: rows.filter((r) => r.status === "accepted").length,
    overdue: rows.filter((r) => r.overdue).length,
  };

  return (
    <>
      <AdminHeader email={user.email} active="applications" />

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy">
              Applications
            </h1>
            <p className="mt-1 text-[0.9rem] text-ink-dim">
              Oldest first, so nobody is forgotten. Anything open after{" "}
              {OVERDUE_DAYS} days is flagged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="Awaiting" value={counts.awaiting} tone="blue" />
            <Stat label="In review" value={counts.inReview} tone="plain" />
            <Stat label="Accepted" value={counts.accepted} tone="ok" />
            <Stat label="Overdue" value={counts.overdue} tone="red" />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 border border-red/40 bg-red/5 p-4 text-[0.875rem] text-navy">
            Could not load applications: {error}
          </p>
        )}

        {rows.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
            <Inbox size={26} className="text-ink-faint" aria-hidden="true" />
            <h2 className="font-display font-semibold text-navy">
              No applications yet
            </h2>
            <p className="max-w-md text-[0.875rem] text-ink-dim">
              Applications from the eight track pages arrive here, oldest
              first.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-2">
            {rows.map((r) => {
              const track = getTrack(r.course_slug);
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/applications/${r.id}`}
                    className={
                      "flex flex-wrap items-center gap-x-5 gap-y-2 border bg-surface px-5 py-4 transition-colors hover:border-blue " +
                      (r.overdue ? "border-red/50" : "border-line")
                    }
                  >
                    <span className="font-mono text-[0.78rem] font-semibold text-navy">
                      {r.reference}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy">{r.name}</span>
                      <span className="block truncate text-[0.8rem] text-ink-dim">
                        {track?.shortName ?? r.course_slug} · {r.email}
                      </span>
                    </span>

                    {r.paid_at && (
                      <span className="font-mono text-[0.6rem] tracking-widest text-ok uppercase">
                        Paid
                      </span>
                    )}

                    <span
                      className={
                        "border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase " +
                        (STATUS_STYLES[r.status] ?? "border-line text-ink-dim")
                      }
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>

                    <span
                      className={
                        "w-16 text-right font-mono text-[0.7rem] " +
                        (r.overdue ? "font-semibold text-red" : "text-ink-faint")
                      }
                    >
                      {r.ageDays === 0 ? "today" : `${r.ageDays}d`}
                    </span>

                    <ArrowRight size={15} className="text-ink-faint" aria-hidden="true" />
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "ok" | "red" | "plain";
}) {
  const tones = {
    blue: "border-blue text-blue-lift",
    ok: "border-ok text-ok",
    plain: "border-line text-navy",
    red: value > 0 ? "border-red text-red" : "border-line text-ink-faint",
  };
  return (
    <div className={`border bg-surface px-4 py-2 ${tones[tone]}`}>
      <span className="block font-display text-xl font-extrabold tabular-nums">
        {value}
      </span>
      <span className="font-mono text-[0.6rem] tracking-widest text-ink-faint uppercase">
        {label}
      </span>
    </div>
  );
}
