import Link from "next/link";
import { KsfLogo } from "@/components/brand/KsfLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";

/**
 * Shared admin chrome. Extracted when the applications queue arrived and
 * the enquiries page's inline header would otherwise have been copied.
 */
export function AdminHeader({
  email,
  active,
}: {
  email?: string | null;
  active: "enquiries" | "applications";
}) {
  const tab = (href: string, label: string, key: string) => (
    <Link
      key={key}
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={
        "border-b-2 pb-1 text-[0.85rem] font-semibold transition-colors " +
        (active === key
          ? "border-blue-lift text-white"
          : "border-transparent text-white/55 hover:text-white")
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line bg-band">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 lg:px-8">
        <div className="flex items-center gap-5">
          <KsfLogo tone="dark" href="/admin" />
          <nav className="flex items-end gap-4" aria-label="Admin sections">
            {tab("/admin", "Enquiries", "enquiries")}
            {tab("/admin/applications", "Applications", "applications")}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {email && (
            <span className="hidden text-[0.8rem] text-white/60 sm:inline">{email}</span>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
