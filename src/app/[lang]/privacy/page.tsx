import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n/alternates";
import { LegalShell } from "@/components/legal/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: "Privacy policy",
  description: "How KSF Tech Services collects, uses and protects your personal data under UK GDPR.",
    alternates: await alternatesFor("/privacy"),
  };
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy policy"
      summary="What personal data we hold, why we hold it, and the rights you have over it under UK GDPR."
      covers={[
        "What we collect when you apply or make an enquiry",
        "Our lawful basis for processing, and how long we keep it",
        "The processors we use — Supabase, Stripe, Resend, Vercel and Cloudflare",
        "Where your data is stored: our database is hosted in London",
        "Your rights of access, correction, deletion and portability",
        "How to complain to the Information Commissioner's Office",
      ]}
    />
  );
}
