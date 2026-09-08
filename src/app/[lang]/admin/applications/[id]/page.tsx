import { Link } from "@/components/i18n/Link";
import { notFound, redirect } from "next/navigation";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { ArrowLeft, Mail, Phone, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DecisionPanel } from "@/components/admin/DecisionPanel";
import { getTrack } from "@/content/tracks";
import { experienceLabel } from "@/lib/applications/schema";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/applications/decisions";

export const dynamic = "force-dynamic";

type Application = {
  id: string;
  reference: string;
  created_at: string;
  course_slug: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  experience_level: string | null;
  occupation: string | null;
  background: string | null;
  motivation: string;
  goals: string | null;
  weekly_hours: number | null;
  agreed_terms: boolean;
  status: string;
  paid_at: string | null;
};

type Event = { id: string; created_at: string; actor: string | null; event: string; detail: string | null };

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${await getLocale()}/admin/login`);

  // RLS would return nothing for a non-admin anyway; this makes the
  // difference between "not staff" and "no such application" explicit.
  const { data: membership } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect(`/${await getLocale()}/admin/applications`);

  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle<Application>();

  if (!app) notFound();

  const [{ data: events }, { data: feedback }] = await Promise.all([
    supabase
      .from("application_events")
      .select("id, created_at, actor, event, detail")
      .eq("application_id", app.id)
      .order("created_at", { ascending: false })
      .returns<Event[]>(),
    supabase
      .from("application_feedback")
      .select("body")
      .eq("application_id", app.id)
      .maybeSingle<{ body: string }>(),
  ]);

  const track = getTrack(app.course_slug);

  // The database stores the level as a bare value, so the readable label
  // comes from the dictionary — which also means a French staff member
  // reading /fr/admin sees it in French.
  const t = await getDictionary();
  const level = app.experience_level
    ? experienceLabel(t, app.experience_level)
    : null;

  return (
    <>
      <AdminHeader email={user.email} active="applications" />

      <main id="main" className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-ink-dim hover:text-blue-lift"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          All applications
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.8rem] font-semibold text-navy">
              {app.reference}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-navy">
              {app.name}
            </h1>
            <p className="mt-1 text-[0.9rem] text-ink-dim">
              {track?.name ?? app.course_slug} · applied{" "}
              {new Date(app.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={
              "border px-2.5 py-1 font-mono text-[0.65rem] tracking-widest uppercase " +
              (STATUS_STYLES[app.status] ?? "border-line text-ink-dim")
            }
          >
            {STATUS_LABELS[app.status] ?? app.status}
          </span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
          {/* Everything they told you */}
          <div className="flex flex-col gap-6">
            <section className="border border-line bg-surface p-5">
              <h2 className="font-display font-semibold text-navy">Contact</h2>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[0.85rem]">
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-lift" aria-hidden="true" />
                  <a href={`mailto:${app.email}`} className="text-ink-dim hover:text-blue-lift">
                    {app.email}
                  </a>
                </li>
                {app.phone && (
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-blue-lift" aria-hidden="true" />
                    <a href={`tel:${app.phone}`} className="text-ink-dim hover:text-blue-lift">
                      {app.phone}
                    </a>
                  </li>
                )}
                {app.country && (
                  <li className="flex items-center gap-2 text-ink-dim">
                    <Globe size={14} className="text-blue-lift" aria-hidden="true" />
                    {app.country}
                  </li>
                )}
              </ul>
            </section>

            <section className="border border-line bg-surface p-5">
              <h2 className="font-display font-semibold text-navy">Experience</h2>
              <dl className="mt-3 flex flex-col gap-3">
                <Detail label="Level" value={level ?? "—"} />
                <Detail label="Occupation" value={app.occupation ?? "—"} />
                <Detail label="Background" value={app.background ?? "—"} />
              </dl>
            </section>

            <section className="border border-line bg-surface p-5">
              <h2 className="font-display font-semibold text-navy">Motivation</h2>
              <dl className="mt-3 flex flex-col gap-3">
                <Detail label="Why this course" value={app.motivation} />
                <Detail label="Goals" value={app.goals ?? "—"} />
                <Detail
                  label="Hours a week"
                  value={app.weekly_hours ? `${app.weekly_hours} hours` : "—"}
                />
              </dl>
            </section>

            <section className="border border-line bg-surface p-5">
              <h2 className="font-display font-semibold text-navy">Timeline</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-[0.8rem]">
                    <span className="font-mono text-[0.65rem] tracking-wide text-ink-faint uppercase">
                      {new Date(e.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="font-semibold text-navy">
                      {STATUS_LABELS[e.event] ?? e.event}
                    </span>
                    {e.actor && <span className="text-ink-faint">by {e.actor}</span>}
                    {e.detail && <span className="text-ink-dim">— {e.detail}</span>}
                  </li>
                ))}
                {(events ?? []).length === 0 && (
                  <li className="text-[0.82rem] text-ink-faint">No events recorded.</li>
                )}
              </ul>
            </section>
          </div>

          {/* The decision */}
          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <DecisionPanel
              applicationId={app.id}
              status={app.status}
              applicantName={app.name.split(" ")[0]}
              existingFeedback={feedback?.body ?? null}
            />
          </aside>
        </div>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <dt className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink">
        {value}
      </dd>
    </div>
  );
}
