import { SITE } from "./site";
import { PRICE_GBP } from "./tracks";

/**
 * FAQ content, grouped.
 *
 * The payment group deliberately leads with "why do I pay before you accept
 * me?" — it is the objection every visitor will have, and answering it
 * openly converts better than hoping nobody asks. It is also the same
 * answer that defends against chargebacks later.
 *
 * ⚠️ Answers describing what KSF delivers inherit the unconfirmed claims in
 * tracks.ts (INCLUDED / NOT_INCLUDED) and SITE.responseTime. Review with
 * those before launch.
 */

export type FaqItem = { q: string; a: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "payment",
    title: "Payment and refunds",
    items: [
      {
        q: "Why do I pay before you accept me?",
        a: `Because every application is read by a person rather than filtered by a form, and that time has to be paid for somewhere. Charging £${PRICE_GBP} keeps applications serious and means we can give real written feedback instead of a silent rejection. If we cannot offer you a place, you are refunded in full — automatically, without asking.`,
      },
      {
        q: "What happens to my money if you turn me down?",
        a: "Your subscription is cancelled and the payment is refunded in full the moment we make that decision. It is triggered automatically by the decline, not by a request from you. Refunds typically reach your card within five to ten working days depending on your bank.",
      },
      {
        q: "How do I cancel?",
        a: "It is a rolling monthly subscription with no minimum term. You can cancel at any time and you will not be charged again. Access continues to the end of the month you have already paid for.",
      },
      {
        q: "What currency am I charged in?",
        a: `All prices are in pounds sterling. £${PRICE_GBP} a month, inclusive of any applicable VAT. If your card is issued outside the UK your bank may apply its own conversion rate.`,
      },
    ],
  },
  {
    id: "applying",
    title: "Applying",
    items: [
      {
        q: "How long does a decision take?",
        a: `We respond within ${SITE.responseTime}. You will get a decision either way — we do not leave applications unanswered.`,
      },
      {
        q: "What are you actually assessing?",
        a: "Whether the track you have chosen is the right one for where you are now. Most declines are not about ability; they are about someone applying for a track that assumes knowledge they have not built yet. Where that happens we say so and point you at the track that does fit.",
      },
      {
        q: "Can I apply for more than one track?",
        a: "Apply for the one closest to your current level. If a different track suits you better we will say so in our feedback rather than decline you outright.",
      },
      {
        q: "Do I need a certification already?",
        a: "Not for the foundation tracks. Intermediate and advanced tracks assume real prior knowledge, and each track page lists exactly what it expects before you apply.",
      },
    ],
  },
  {
    id: "training",
    title: "The training",
    items: [
      {
        q: "How is the training delivered?",
        a: "Mentored preparation structured around the vendor's published exam blueprint, with direct access to a KSF mentor for questions as you work through it.",
      },
      {
        q: "How much time should I expect to commit?",
        a: "Each track page gives an estimate in guided hours — from around 100 for the foundation tracks to 180 for CCNP ENCOR. How quickly you cover them is up to you; there is no fixed cohort or timetable.",
      },
      {
        q: "Is KSF an accredited training provider?",
        a: "No, and we do not claim to be. KSF provides independent exam preparation. CompTIA, Cisco and EC-Council are the awarding bodies, and their certifications are earned by sitting their exams with them.",
      },
    ],
  },
  {
    id: "exams",
    title: "The exams",
    items: [
      {
        q: "Is the exam included in the £10?",
        a: "No. The exam voucher is bought directly from the vendor and is not part of the subscription. Voucher prices are set by CompTIA, Cisco and EC-Council and are typically several hundred pounds — budget for that separately.",
      },
      {
        q: "Do you guarantee I will pass?",
        a: "No, and you should be sceptical of anyone who does. You sit the exam with the vendor, not with KSF. What we commit to is preparing you properly against the published blueprint.",
      },
      {
        q: "What if I fail?",
        a: "Retake policies are set by the awarding body, not by KSF. Your subscription continues as normal, so you can keep preparing for a second attempt.",
      },
    ],
  },
];

/** Flattened, for FAQPage structured data. */
export const ALL_FAQS: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items);
