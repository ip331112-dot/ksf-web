"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[0.8rem] font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white disabled:opacity-50"
    >
      <LogOut size={14} aria-hidden="true" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
