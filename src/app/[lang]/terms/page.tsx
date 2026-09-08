import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { LegalShell } from "@/components/legal/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.meta.termsTitle,
    description: t.meta.termsDescription,
    alternates: await alternatesFor("/terms"),
  };
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of service"
      summary="The agreement between you and KSF Tech Services when you apply for a course or engage us for a service."
      covers={[
        "Who we are, and how to contact us",
        "What the subscription entitles you to, and what it does not",
        "That KSF provides exam preparation and is not an accredited awarding body",
        "Your responsibilities as a subscriber",
        "Billing, renewal and cancellation",
        "Limitation of liability, and the law that applies",
      ]}
    />
  );
}
