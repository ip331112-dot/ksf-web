"use client";

import { useActionState, useId } from "react";
import Script from "next/script";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { submitEnquiry } from "@/lib/leads/actions";
import { EMPTY_STATE } from "@/lib/leads/schema";
import { SERVICES, SITE } from "@/content/site";

type Props = {
  /** `full` is the contact page; `compact` is the service-page sidebar. */
  variant?: "full" | "compact";
  /** Which page this came from — stored so KSF knows what prompted it. */
  sourcePath: string;
  /** Pre-selects the service on a service page. */
  defaultService?: string;
  /** Absent when Turnstile is not configured; the widget is then skipped. */
  turnstileSiteKey?: string;
  /**
   * False when Supabase has no service-role key, i.e. nothing could be
   * stored. The form then refuses to accept input rather than swallowing
   * a real enquiry.
   */
  pipelineReady: boolean;
};

const field =
  "border border-line bg-surface px-3.5 py-2.5 text-[0.9rem] outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30 disabled:bg-surface-2 disabled:text-ink-faint";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[0.78rem] text-warn">
      {message}
    </p>
  );
}

export function EnquiryForm({
  variant = "full",
  sourcePath,
  defaultService = "",
  turnstileSiteKey,
  pipelineReady,
}: Props) {
  const [state, formAction, pending] = useActionState(submitEnquiry, EMPTY_STATE);
  const uid = useId();
  const compact = variant === "compact";

  if (!pipelineReady) {
    return (
      <div className="mt-5 flex gap-3 border border-warn/40 bg-warn/5 p-4">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-warn"
          aria-hidden="true"
        />
        <p className="text-[0.875rem] leading-relaxed text-ink-dim">
          <strong className="font-semibold text-navy">
            This form is not live yet.
          </strong>{" "}
          We are still connecting it, and we would rather tell you than take your
          message and lose it. Please email{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="font-semibold text-blue hover:underline"
          >
            {SITE.email}
          </a>{" "}
          or call us — both reach us today.
        </p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="mt-5 flex gap-3 border-2 border-blue bg-blue/5 p-5">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0 text-blue"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-navy">Message sent</p>
          <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-dim">
            {state.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      )}

      <form
        action={formAction}
        noValidate
        className={compact ? "mt-5 flex flex-col gap-3" : "mt-6 flex flex-col gap-4"}
      >
        <input type="hidden" name="sourcePath" value={sourcePath} />

        {/*
          Honeypot. Hidden from people and from screen readers, but a bot
          parsing the markup will happily fill it in and give itself away.
        */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${uid}-company`}>Company</label>
          <input
            id={`${uid}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {state.message && !state.ok && (
          <p
            role="alert"
            className="border border-warn/40 bg-warn/5 px-3.5 py-2.5 text-[0.85rem] text-navy"
          >
            {state.message}
          </p>
        )}

        <div className={compact ? "flex flex-col gap-3" : "grid gap-4 sm:grid-cols-2"}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-name`}
              className={
                compact
                  ? "eyebrow text-ink-faint"
                  : "text-[0.8rem] font-semibold text-navy"
              }
            >
              {compact ? "Name" : "Your name"}
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              defaultValue={state.values?.name ?? ""}
              aria-invalid={Boolean(state.errors?.name)}
              aria-describedby={state.errors?.name ? `${uid}-name-err` : undefined}
              className={compact ? `w-full ${field}` : field}
            />
            <FieldError id={`${uid}-name-err`} message={state.errors?.name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-email`}
              className={
                compact
                  ? "eyebrow text-ink-faint"
                  : "text-[0.8rem] font-semibold text-navy"
              }
            >
              Email
            </label>
            <input
              id={`${uid}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={state.values?.email ?? ""}
              aria-invalid={Boolean(state.errors?.email)}
              aria-describedby={state.errors?.email ? `${uid}-email-err` : undefined}
              className={compact ? `w-full ${field}` : field}
            />
            <FieldError id={`${uid}-email-err`} message={state.errors?.email} />
          </div>

          {!compact && (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${uid}-phone`}
                  className="text-[0.8rem] font-semibold text-navy"
                >
                  Phone <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                <input
                  id={`${uid}-phone`}
                  name="phone"
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  defaultValue={state.values?.phone ?? ""}
                  aria-invalid={Boolean(state.errors?.phone)}
                  aria-describedby={
                    state.errors?.phone ? `${uid}-phone-err` : undefined
                  }
                  className={field}
                />
                <FieldError id={`${uid}-phone-err`} message={state.errors?.phone} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${uid}-service`}
                  className="text-[0.8rem] font-semibold text-navy"
                >
                  What is this about?
                </label>
                <select
                  id={`${uid}-service`}
                  name="service"
                  defaultValue={state.values?.service || defaultService}
                  className={field}
                >
                  <option value="">Select…</option>
                  {SERVICES.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                  <option value="training">Certification training</option>
                  <option value="other">Something else</option>
                </select>
              </div>
            </>
          )}
        </div>

        {compact && <input type="hidden" name="service" value={defaultService} />}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${uid}-message`}
            className={
              compact
                ? "eyebrow text-ink-faint"
                : "text-[0.8rem] font-semibold text-navy"
            }
          >
            {compact ? "What do you need?" : "Message"}
          </label>
          <textarea
            id={`${uid}-message`}
            name="message"
            required
            maxLength={4000}
            rows={compact ? 4 : 6}
            defaultValue={state.values?.message ?? ""}
            aria-invalid={Boolean(state.errors?.message)}
            aria-describedby={
              state.errors?.message ? `${uid}-message-err` : undefined
            }
            className={compact ? `w-full resize-y ${field}` : `resize-y ${field}`}
          />
          <FieldError id={`${uid}-message-err`} message={state.errors?.message} />
        </div>

        {turnstileSiteKey && (
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-theme="light"
          />
        )}

        <div>
          <button
            type="submit"
            disabled={pending}
            className={
              compact
                ? "mt-1 flex w-full items-center justify-center gap-2 bg-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-3 disabled:cursor-not-allowed disabled:opacity-55"
                : "inline-flex items-center gap-2 bg-blue px-6 py-3.5 font-semibold text-white transition-colors hover:bg-blue-lift disabled:cursor-not-allowed disabled:bg-ink-faint"
            }
          >
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {pending ? "Sending…" : "Send enquiry"}
          </button>
          {!compact && (
            <p className="mt-2.5 text-[0.8rem] text-ink-faint">
              We reply to every enquiry, within {SITE.responseTime}.
            </p>
          )}
        </div>
      </form>
    </>
  );
}
