"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalisedPath } from "@/lib/i18n/useLocale";
import { Suspense } from "react";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KsfLogo } from "@/components/brand/KsfLogo";

/**
 * Sign-in only. There is no sign-up route on purpose: staff accounts are
 * created in the Supabase dashboard and then added to the `admins` table,
 * so nobody can grant themselves access by registering.
 */
function LoginForm() {
  const router = useRouter();
  const localised = useLocalisedPath();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Deliberately generic: distinguishing "no such user" from "wrong
      // password" tells an attacker which addresses are real.
      setError("Those details were not recognised. Check them and try again.");
      setBusy(false);
      return;
    }

    // `next` already carries a locale when the proxy set it.
    router.replace(localised(params.get("next") ?? "/admin"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[0.8rem] font-semibold text-navy">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-field bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[0.8rem] font-semibold text-navy">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-field bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
        />
      </div>

      {error && (
        <p role="alert" className="border border-red/40 bg-red/5 px-3.5 py-2.5 text-[0.85rem] text-navy">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-lift disabled:bg-ink-faint"
      >
        {busy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-surface-2 px-5 py-16"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <KsfLogo />
        </div>

        <div className="border border-line bg-surface p-7">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={17} className="text-blue-lift" aria-hidden="true" />
            <h1 className="font-display text-lg font-extrabold text-navy">
              Staff sign in
            </h1>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-[0.8rem] text-ink-faint">
          Accounts are issued by KSF. There is no self-registration.
        </p>
      </div>
    </main>
  );
}
