import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { LegalShell } from "@/components/legal/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.refundsTitle,
    description: t.meta.refundsDescription,
    alternates: await alternatesFor("/refunds"),
  };
}

export default function RefundsPage() {
  return (
    <LegalShell
      title="Refund policy"
      summary="If we cannot offer you a place, your subscription is cancelled and refunded in full, automatically — you never have to ask."
      covers={[
        "The automatic refund when an application is declined",
        "How long a refund takes to reach your card",
        "Your statutory 14-day cancellation right, and how immediate access affects it",
        "Cancelling an active subscription, and what happens to the current month",
        "How to raise a billing problem with us before your bank",
      ]}
    />
  );
}
