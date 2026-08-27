import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, ShieldAlert, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { StatusControls } from "@/components/admin/StatusControls";
import { SITE } from "@/content/site";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  source_path: string | null;
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  new: "border-blue text-blue bg-blue-soft",
  read: "border-line text-ink-dim",
  replied: "border-ok text-ok bg-ok-soft",
  archived: "border-line text-ink-faint",
  spam: "border-red text-red bg-red-soft",
};

/** Enquiries older than this without a reply are visibly overdue. */
const OVERDUE_HOURS = 72;

type DecoratedLead = Lead & { overdue: boolean };

/**
 * Reading the clock is impure, so it happens here rather than inside the
 * component — React's purity rule rightly rejects `Date.now()` during
 * render. Fetching and decorating together also keeps the component
 * concerned only with presentation.
 */
async function loadLeads(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ rows: DecoratedLead[]; error: string | null }> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Lead[]>();

  const now = Date.now();
  const cutoff = OVERDUE_HOURS * 3600_000;

  return {
    rows: (data ?? []).map((l) => ({
      ...l,
      overdue:
        l.status === "new" && now - new Date(l.created_at).getTime() > cutoff,
    })),
    error: error?.message ?? null,
  };
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Membership is enforced by RLS, but checking here lets us show a clear
  // message instead of an empty table to someone signed in but not staff.
  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { rows, error } = await loadLeads(supabase);

  const isAdmin = Boolean(membership);
  const counts = {
    new: rows.filter((l) => l.status === "new").length,
    replied: rows.filter((l) => l.status === "replied").length,
    overdue: rows.filter((l) => l.overdue).length,
  };

  return (
    <>
      <header className="border-b border-line bg-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-4">
            <KsfLogo tone="dark" href="/admin" />
            <span className="hidden font-mono text-[0.65rem] tracking-widest text-white/50 uppercase sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[0.8rem] text-white/60 sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        {!isAdmin ? (
          <div className="flex gap-3 border border-warn/40 bg-warn/5 p-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <div>
              <h1 className="font-display font-semibold text-navy">
                This account is not staff
              </h1>
              <p className="mt-1.5 max-w-prose text-[0.9rem] leading-relaxed text-ink-dim">
                You are signed in as {user.email}, but this address is not in the
                admin list, so no enquiries can be shown. Ask an existing
                administrator to add you, or contact {SITE.email}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-navy">
                  Enquiries
                </h1>
                <p className="mt-1 text-[0.9rem] text-ink-dim">
                  Newest first. Anything unanswered after {OVERDUE_HOURS} hours is
                  marked overdue.
                </p>
              </div>
              <div className="flex gap-2">
                <Stat label="New" value={counts.new} tone="blue" />
                <Stat label="Replied" value={counts.replied} tone="ok" />
                <Stat label="Overdue" value={counts.overdue} tone="red" />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-6 border border-red/40 bg-red/5 p-4 text-[0.875rem] text-navy">
                Could not load enquiries: {error}
              </p>
            )}

            {rows.length === 0 ? (
              <div className="mt-8 flex flex-col items-center gap-3 border border-dashed border-line bg-surface px-6 py-16 text-center">
                <Inbox size={26} className="text-ink-faint" aria-hidden="true" />
                <h2 className="font-display font-semibold text-navy">
                  No enquiries yet
                </h2>
                <p className="max-w-md text-[0.875rem] text-ink-dim">
                  Enquiries from the contact page, the five service pages and
                  the track apply pages all arrive here, newest first. Nothing
                  has come in yet.
                </p>
                <Link
                  href="/contact"
                  className="mt-1 text-[0.85rem] font-semibold text-blue hover:underline"
                >
                  View the contact page
                </Link>
              </div>
            ) : (
              <ul className="mt-8 flex flex-col gap-3">
                {rows.map((lead) => {
                  const { overdue } = lead;
                  return (
                    <li
                      key={lead.id}
                      className={`border bg-surface p-5 ${overdue ? "border-red/50" : "border-line"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display font-semibold text-navy">
                            {lead.name}
                          </h2>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-ink-dim">
                            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-blue">
                              <Mail size={13} aria-hidden="true" />
                              {lead.email}
                            </a>
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:text-blue">
                                <Phone size={13} aria-hidden="true" />
                                {lead.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {overdue && (
                            <span className="border border-red bg-red-soft px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-red uppercase">
                              Overdue
                            </span>
                          )}
                          <span
                            className={`border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase ${STATUS_STYLES[lead.status] ?? "border-line text-ink-dim"}`}
                          >
                            {lead.status}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink-dim">
                        {lead.message}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[0.65rem] tracking-wide text-ink-faint uppercase">
                        <span>
                          {new Date(lead.created_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {lead.service && <span>{lead.service}</span>}
                        {lead.source_path && <span>from {lead.source_path}</span>}
                      </div>

                      <StatusControls leadId={lead.id} current={lead.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
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
  tone: "blue" | "ok" | "red";
}) {
  const tones = {
    blue: "border-blue text-blue",
    ok: "border-ok text-ok",
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
