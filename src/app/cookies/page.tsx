import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "What this site stores in your browser, and why.",
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookie policy"
      summary="This site is built to need as little as possible from your browser. No advertising trackers, and no third-party profiling."
      covers={[
        "The strictly necessary cookies required for the site to work",
        "Why we chose privacy-preserving analytics that need no consent banner",
        "Cookies set by Stripe during checkout",
        "How to control cookies in your browser",
      ]}
    />
  );
}
