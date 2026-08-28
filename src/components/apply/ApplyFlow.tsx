"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { submitApplication } from "@/lib/applications/actions";
import {
  clearDraft,
  getRaw,
  getServerRaw,
  parseDraft,
  subscribe,
  writeDraft,
} from "@/lib/applications/draft-store";
import {
  EXPERIENCE_LEVELS,
  STEPS,
  STEP_SCHEMAS,
  type ApplyDraft,
  type ApplyErrors,
} from "@/lib/applications/schema";

type Props = {
  courseSlug: string;
  trackName: string;
  priceGbp: number;
  paymentRequired: boolean;
  /** Absent when Turnstile is not configured; the widget is then skipped. */
  turnstileSiteKey?: string;
};

const field =
  "w-full border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30";

export function ApplyFlow({
  courseSlug,
  trackName,
  priceGbp,
  paymentRequired,
  turnstileSiteKey,
}: Props) {
  const router = useRouter();
  const uid = useId();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ApplyErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  /**
   * The draft lives in localStorage, not in React state — so answers
   * survive a refresh, a closed tab or a flat battery, which is the whole
   * point of persisting them.
   */
  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => getRaw(courseSlug), [courseSlug]),
    getServerRaw,
  );
  const draft = useMemo(() => parseDraft(raw), [raw]);

  // Moving between steps changes what the page is about, so send focus to
  // the new heading — otherwise a screen reader stays silent and a
  // keyboard user is stranded at the bottom of the previous step.
  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);

  const set = <K extends keyof ApplyDraft>(key: K, value: ApplyDraft[K]) => {
    writeDraft(courseSlug, { ...draft, [key]: value });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateStep(index: number): boolean {
    const schema = STEP_SCHEMAS[index];
    const slice: Record<string, unknown> =
      index === 0
        ? { name: draft.name, email: draft.email, phone: draft.phone, country: draft.country }
        : index === 1
          ? {
              experienceLevel: draft.experienceLevel,
              occupation: draft.occupation,
              background: draft.background,
            }
          : index === 2
            ? { motivation: draft.motivation, goals: draft.goals, weeklyHours: draft.weeklyHours }
            : { agreedTerms: draft.agreedTerms, agreedImmediateStart: draft.agreedImmediateStart };

    const res = schema.safeParse(slice);
    if (res.success) {
      setErrors({});
      return true;
    }

    const next: ApplyErrors = {};
    for (const issue of res.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  }

  function onNext() {
    setFormError(null);
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onBack() {
    setFormError(null);
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit() {
    setFormError(null);
    if (!validateStep(3)) return;

    // Turnstile writes its token into a hidden input inside its own
    // container. There is no <form> here — the flow submits an object to a
    // server action — so it is read from the DOM rather than FormData.
    const turnstileToken =
      turnstileRef.current
        ?.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')
        ?.value ?? undefined;

    startTransition(async () => {
      const res = await submitApplication({
        ...draft,
        courseSlug,
        weeklyHours: draft.weeklyHours === "" ? "" : draft.weeklyHours,
        company: honeypotRef.current?.value ?? "",
        turnstileToken,
      });

      if (!res.ok) {
        setFormError(res.message);
        if (res.errors) setErrors(res.errors);
        return;
      }

      // The draft has served its purpose; leaving it behind would prefill
      // a second application with the first one's answers.
      clearDraft(courseSlug);

      const q = new URLSearchParams({ ref: res.reference });
      if (res.statusPath) q.set("status", res.statusPath);
      router.push(`/apply/success?${q.toString()}`);
    });
  }

  const current = STEPS[step];

  return (
    <div className="mt-8">
      {/* Progress */}
      <ol className="flex flex-wrap gap-x-2 gap-y-2" aria-label="Application progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2 min-w-[8rem]">
              <span
                aria-current={active ? "step" : undefined}
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[0.7rem] " +
                  (done
                    ? "border-ok bg-ok-soft text-ok"
                    : active
                      ? "border-blue bg-blue text-white"
                      : "border-line text-ink-faint")
                }
              >
                {done ? <Check size={12} aria-hidden="true" /> : s.n}
              </span>
              <span
                className={
                  "text-[0.75rem] font-semibold " +
                  (active ? "text-navy" : done ? "text-ok" : "text-ink-faint")
                }
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-7">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl font-extrabold text-navy outline-none"
        >
          {current.title}
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-dim">{current.blurb}</p>
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-5 border border-warn/40 bg-warn/5 px-3.5 py-2.5 text-[0.85rem] text-navy"
        >
          {formError}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {step === 0 && (
          <>
            <Field id={`${uid}-name`} label="Full name" error={errors.name}>
              <input
                id={`${uid}-name`}
                className={field}
                autoComplete="name"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field id={`${uid}-email`} label="Email" error={errors.email}>
              <input
                id={`${uid}-email`}
                type="email"
                className={field}
                autoComplete="email"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${uid}-phone`} label="Phone" hint="optional" error={errors.phone}>
                <input
                  id={`${uid}-phone`}
                  type="tel"
                  className={field}
                  autoComplete="tel"
                  value={draft.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
              <Field id={`${uid}-country`} label="Country" hint="optional" error={errors.country}>
                <input
                  id={`${uid}-country`}
                  className={field}
                  autoComplete="country-name"
                  value={draft.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field
              id={`${uid}-level`}
              label="Where are you starting from?"
              error={errors.experienceLevel}
            >
              <div className="flex flex-col gap-2">
                {EXPERIENCE_LEVELS.map((l) => (
                  <label
                    key={l.value}
                    className={
                      "flex cursor-pointer items-center gap-2.5 border px-3.5 py-2.5 text-[0.875rem] " +
                      (draft.experienceLevel === l.value
                        ? "border-blue bg-blue-soft text-navy"
                        : "border-line text-ink-dim hover:border-blue")
                    }
                  >
                    <input
                      type="radio"
                      name={`${uid}-level`}
                      value={l.value}
                      checked={draft.experienceLevel === l.value}
                      onChange={() => set("experienceLevel", l.value)}
                      className="accent-blue"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field
              id={`${uid}-occupation`}
              label="What do you do at the moment?"
              hint="optional"
              error={errors.occupation}
            >
              <input
                id={`${uid}-occupation`}
                className={field}
                value={draft.occupation}
                onChange={(e) => set("occupation", e.target.value)}
              />
            </Field>
            <Field
              id={`${uid}-background`}
              label="Any relevant background"
              hint="optional"
              error={errors.background}
            >
              <textarea
                id={`${uid}-background`}
                rows={4}
                className={`${field} resize-y`}
                value={draft.background}
                onChange={(e) => set("background", e.target.value)}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field
              id={`${uid}-motivation`}
              label={`Why ${trackName}?`}
              error={errors.motivation}
            >
              <textarea
                id={`${uid}-motivation`}
                rows={5}
                className={`${field} resize-y`}
                value={draft.motivation}
                onChange={(e) => set("motivation", e.target.value)}
              />
            </Field>
            <Field
              id={`${uid}-goals`}
              label="What are you hoping it leads to?"
              hint="optional"
              error={errors.goals}
            >
              <textarea
                id={`${uid}-goals`}
                rows={4}
                className={`${field} resize-y`}
                value={draft.goals}
                onChange={(e) => set("goals", e.target.value)}
              />
            </Field>
            <Field
              id={`${uid}-hours`}
              label="Hours a week you can give it"
              hint="optional"
              error={errors.weeklyHours}
            >
              <input
                id={`${uid}-hours`}
                type="number"
                min={1}
                max={60}
                className={`${field} max-w-[8rem]`}
                value={draft.weeklyHours}
                onChange={(e) => set("weeklyHours", e.target.value)}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <dl className="divide-y divide-line border border-line bg-surface-2">
              <Row label="Track" value={trackName} />
              <Row label="Name" value={draft.name} />
              <Row label="Email" value={draft.email} />
              {draft.phone && <Row label="Phone" value={draft.phone} />}
              {draft.country && <Row label="Country" value={draft.country} />}
              <Row
                label="Experience"
                value={
                  EXPERIENCE_LEVELS.find((l) => l.value === draft.experienceLevel)?.label ?? "—"
                }
              />
              {draft.occupation && <Row label="Occupation" value={draft.occupation} />}
              {draft.background && <Row label="Background" value={draft.background} />}
              <Row label="Motivation" value={draft.motivation} />
              {draft.goals && <Row label="Goals" value={draft.goals} />}
              {draft.weeklyHours && <Row label="Hours a week" value={String(draft.weeklyHours)} />}
            </dl>

            <div className="border-2 border-blue bg-blue/5 p-4">
              {paymentRequired ? (
                <p className="text-[0.875rem] leading-relaxed text-navy">
                  <strong className="font-semibold">
                    £{priceGbp}/month starts today.
                  </strong>{" "}
                  If we cannot offer you a place, your subscription is cancelled
                  and refunded in full, automatically.
                </p>
              ) : (
                <p className="text-[0.875rem] leading-relaxed text-navy">
                  <strong className="font-semibold">
                    You will not be charged anything now.
                  </strong>{" "}
                  Applying is free. If we offer you a place, we will send you a
                  link to start the £{priceGbp}/month subscription — you decide
                  then.
                </p>
              )}
            </div>

            <Field id={`${uid}-terms`} label="" error={errors.agreedTerms}>
              <label className="flex cursor-pointer items-start gap-2.5 text-[0.875rem] text-ink-dim">
                <input
                  type="checkbox"
                  className="mt-1 accent-blue"
                  checked={draft.agreedTerms}
                  onChange={(e) => set("agreedTerms", e.target.checked)}
                />
                <span>
                  I have read the terms and the refund policy, and the answers
                  above are my own.
                </span>
              </label>
            </Field>

            {paymentRequired && (
              <label className="flex cursor-pointer items-start gap-2.5 text-[0.875rem] text-ink-dim">
                <input
                  type="checkbox"
                  className="mt-1 accent-blue"
                  checked={draft.agreedImmediateStart}
                  onChange={(e) => set("agreedImmediateStart", e.target.checked)}
                />
                <span>
                  I agree the service starts immediately, and I understand this
                  affects my 14-day cancellation right.
                </span>
              </label>
            )}

            {/*
              Honeypot. Hidden from people and from screen readers, but a
              bot parsing the markup fills it in and gives itself away.
              Deliberately uncontrolled — it must never round-trip through
              the draft, or it would be restored from localStorage.
            */}
            <div
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
            >
              <label htmlFor={`${uid}-company`}>Company</label>
              <input
                ref={honeypotRef}
                id={`${uid}-company`}
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            {/*
              Turnstile lives on the final step, where the submission
              actually happens. Without this the action would receive no
              token, and every application would be refused the moment
              Turnstile keys are configured.
            */}
            {turnstileSiteKey && (
              <div ref={turnstileRef}>
                <Script
                  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                  strategy="lazyOnload"
                />
                <div
                  className="cf-turnstile"
                  data-sitekey={turnstileSiteKey}
                  data-theme="light"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0 || pending}
          className="inline-flex items-center gap-1.5 border border-line px-4 py-2.5 text-[0.875rem] font-semibold text-ink-dim transition-colors hover:border-blue hover:text-blue disabled:invisible"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-lift"
          >
            Continue
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-lift disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {pending ? "Submitting…" : "Submit application"}
          </button>
        )}
      </div>

      <p className="mt-3 text-[0.75rem] text-ink-faint">
        Your answers are saved on this device as you go, so you can come back
        to them.
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[0.8rem] font-semibold text-navy">
          {label}{" "}
          {hint && <span className="font-normal text-ink-faint">({hint})</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[0.78rem] text-warn">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="font-mono text-[0.65rem] tracking-widest text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="text-[0.875rem] whitespace-pre-wrap text-ink">{value}</dd>
    </div>
  );
}
