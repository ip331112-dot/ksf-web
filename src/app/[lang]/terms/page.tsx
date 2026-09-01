import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { LegalShell } from "@/components/legal/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: "Terms of service",
  description: "The terms under which KSF Tech Services provides certification training and services.",
    alternates: await alternatesFor("/terms"),
  };
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of service"
      summary="The agreement between you and KSF Tech Services when you apply for a track or engage us for a service."
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
