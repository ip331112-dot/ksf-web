import "server-only";
import { SITE } from "@/content/site";
import { formatPence } from "@/lib/shop/money";
import type { Locale } from "@/lib/locale";
import { baseUrl, send } from "./send";

export { isEmailConfigured } from "./send";

/**
 * Shop email.
 *
 * Same house style as lib/email/index.ts: plain sentences, the useful
 * thing first, no marketing voice. Kept in its own module because the
 * shop's messages are the only ones that have to render a table of
 * money, and because index.ts is already long.
 *
 * BANK DETAILS ARE NOT REAL YET. `BANK` below is a placeholder and the
 * invoice says so. Filling it in is on the owner — see the shop plan's
 * "needed from you". Until then an invoice is honest about the fact that
 * it cannot be paid.
 */

export const BANK = {
  accountName: process.env.BANK_ACCOUNT_NAME ?? "",
  sortCode: process.env.BANK_SORT_CODE ?? "",
  accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
  iban: process.env.BANK_IBAN ?? "",
  bic: process.env.BANK_BIC ?? "",
};

export function bankDetailsConfigured(): boolean {
  return Boolean(BANK.accountName && (BANK.sortCode || BANK.iban));
}

/** French readers get the French number — it is the one they can call cheaply. */
const signOff = (locale: Locale) =>
  `${SITE.name}\n${SITE.email}\n${locale === "fr" ? SITE.phoneFr : SITE.phoneUk}`;

function wrap(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#14213d;max-width:34rem">
${bodyHtml}
<hr style="border:none;border-top:1px solid #d5dfec;margin:28px 0 16px">
<p style="font-size:13px;color:#53638a;margin:0">
  ${SITE.name}<br>
  <a href="mailto:${SITE.email}" style="color:#c8102e">${SITE.email}</a> · ${SITE.phoneUk}
</p>
</div>`;
}

export type InvoiceLine = {
  name: string;
  option: string | null;
  qty: number;
  unitPricePence: number;
};

/** The lines as plain text, aligned enough to read in a monospace client. */
function linesText(lines: InvoiceLine[], locale: Locale): string {
  return lines
    .map((l) => {
      const label = l.option ? `${l.name} (${l.option})` : l.name;
      return `  ${l.qty} × ${label} — ${formatPence(l.unitPricePence * l.qty, locale)}`;
    })
    .join("\n");
}

function linesHtml(lines: InvoiceLine[], locale: Locale): string {
  return lines
    .map((l) => {
      const label = l.option ? `${l.name} <span style="color:#53638a">(${l.option})</span>` : l.name;
      return `<tr>
  <td style="padding:6px 0;border-bottom:1px solid #eef2f8">${l.qty} × ${label}</td>
  <td style="padding:6px 0;border-bottom:1px solid #eef2f8;text-align:right;white-space:nowrap">${formatPence(l.unitPricePence * l.qty, locale)}</td>
</tr>`;
    })
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* 1. Invoice — to the buyer, when the order is placed                 */
/* ------------------------------------------------------------------ */

export async function sendInvoice(o: {
  to: string;
  name: string;
  reference: string;
  locale: Locale;
  lines: InvoiceLine[];
  goodsPence: number;
  postagePence: number;
  totalPence: number;
  statusPath: string;
}): Promise<boolean> {
  const fr = o.locale === "fr";
  const url = `${baseUrl()}${o.statusPath}`;
  const money = (p: number) => formatPence(p, o.locale);

  const payable = bankDetailsConfigured();

  const bankBlock = payable
    ? fr
      ? [
          `  Titulaire  : ${BANK.accountName}`,
          BANK.iban ? `  IBAN       : ${BANK.iban}` : null,
          BANK.bic ? `  BIC        : ${BANK.bic}` : null,
          `  Référence  : ${o.reference}`,
        ]
      : [
          `  Account name : ${BANK.accountName}`,
          BANK.sortCode ? `  Sort code    : ${BANK.sortCode}` : null,
          BANK.accountNumber ? `  Account no.  : ${BANK.accountNumber}` : null,
          `  Reference    : ${o.reference}`,
        ]
    : [];

  const text = fr
    ? [
        `Bonjour ${o.name},`,
        "",
        `Votre commande ${o.reference} est enregistrée. Voici le détail :`,
        "",
        linesText(o.lines, o.locale),
        "",
        `  Sous-total : ${money(o.goodsPence)}`,
        o.postagePence > 0 ? `  Livraison  : ${money(o.postagePence)}` : null,
        `  Total      : ${money(o.totalPence)}`,
        "",
        payable
          ? "Pour régler, faites un virement en indiquant bien la référence :"
          : "Nous vous enverrons les coordonnées bancaires très vite — nous finalisons cette partie.",
        ...bankBlock,
        "",
        "Dès réception du paiement, nous préparons votre commande et vous",
        "recevrez un message. Les téléchargements sont débloqués immédiatement.",
        "",
        `Suivre votre commande : ${url}`,
        "",
        "Gardez ce lien : il ne demande aucun mot de passe.",
        "",
        signOff(o.locale),
      ]
    : [
        `Hello ${o.name},`,
        "",
        `Your order ${o.reference} is placed. Here is what is on it:`,
        "",
        linesText(o.lines, o.locale),
        "",
        `  Subtotal : ${money(o.goodsPence)}`,
        o.postagePence > 0 ? `  Postage  : ${money(o.postagePence)}` : null,
        `  Total    : ${money(o.totalPence)}`,
        "",
        payable
          ? "To pay, send a bank transfer quoting the reference:"
          : "We will send bank details shortly — we are still setting that part up.",
        ...bankBlock,
        "",
        "Once the payment lands we will pack your order and email you.",
        "Any downloads unlock straight away.",
        "",
        `Track your order: ${url}`,
        "",
        "Keep this link — it needs no password.",
        "",
        signOff(o.locale),
      ];

  const html = wrap(`
<p>${fr ? "Bonjour" : "Hello"} ${o.name},</p>
<p>${fr ? "Votre commande" : "Your order"} <strong>${o.reference}</strong> ${fr ? "est enregistrée." : "is placed."}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
${linesHtml(o.lines, o.locale)}
<tr><td style="padding:6px 0">${fr ? "Sous-total" : "Subtotal"}</td><td style="padding:6px 0;text-align:right">${money(o.goodsPence)}</td></tr>
${o.postagePence > 0 ? `<tr><td style="padding:6px 0">${fr ? "Livraison" : "Postage"}</td><td style="padding:6px 0;text-align:right">${money(o.postagePence)}</td></tr>` : ""}
<tr><td style="padding:8px 0;font-weight:600">${fr ? "Total" : "Total"}</td><td style="padding:8px 0;text-align:right;font-weight:600">${money(o.totalPence)}</td></tr>
</table>
${
  payable
    ? `<p>${fr ? "Pour régler, faites un virement en indiquant la référence" : "To pay, send a bank transfer quoting the reference"} <strong>${o.reference}</strong>:</p>
<pre style="background:#f4f7fb;padding:12px;font-size:13px;margin:0 0 16px">${bankBlock.filter(Boolean).join("\n")}</pre>`
    : `<p style="background:#fff6e5;padding:12px;font-size:14px">${fr ? "Nous vous enverrons les coordonnées bancaires très vite." : "We will send bank details shortly — we are still setting that part up."}</p>`
}
<p><a href="${url}" style="color:#c8102e;font-weight:600">${fr ? "Suivre votre commande" : "Track your order"}</a></p>`);

  const res = await send({
    to: o.to,
    subject: fr ? `Commande ${o.reference}` : `Order ${o.reference}`,
    text: text.filter((l) => l !== null).join("\n"),
    html,
  });

  return res.sent;
}

/* ------------------------------------------------------------------ */
/* 2. Downloads ready — when the order is marked paid                  */
/* ------------------------------------------------------------------ */

export async function sendDownloadLinks(o: {
  to: string;
  name: string;
  reference: string;
  locale: Locale;
  files: { name: string; path: string }[];
  expiresInDays: number;
  maxDownloads: number;
}): Promise<boolean> {
  if (o.files.length === 0) return false;
  const fr = o.locale === "fr";

  const links = o.files.map((f) => `  ${f.name}\n  ${baseUrl()}${f.path}`).join("\n\n");

  const text = fr
    ? [
        `Bonjour ${o.name},`,
        "",
        `Paiement reçu pour la commande ${o.reference}. Vos fichiers :`,
        "",
        links,
        "",
        `Chaque lien fonctionne ${o.maxDownloads} fois et expire dans ${o.expiresInDays} jours.`,
        "Téléchargez-les et gardez-en une copie.",
        "",
        signOff(o.locale),
      ].join("\n")
    : [
        `Hello ${o.name},`,
        "",
        `Payment received for order ${o.reference}. Here are your files:`,
        "",
        links,
        "",
        `Each link works ${o.maxDownloads} times and expires in ${o.expiresInDays} days.`,
        "Download them and keep a copy somewhere safe.",
        "",
        signOff(o.locale),
      ].join("\n");

  const html = wrap(`
<p>${fr ? "Bonjour" : "Hello"} ${o.name},</p>
<p>${fr ? "Paiement reçu pour la commande" : "Payment received for order"} <strong>${o.reference}</strong>.</p>
<ul style="padding-left:18px">
${o.files.map((f) => `<li style="margin-bottom:8px"><a href="${baseUrl()}${f.path}" style="color:#c8102e;font-weight:600">${f.name}</a></li>`).join("\n")}
</ul>
<p style="font-size:13px;color:#53638a">${
    fr
      ? `Chaque lien fonctionne ${o.maxDownloads} fois et expire dans ${o.expiresInDays} jours.`
      : `Each link works ${o.maxDownloads} times and expires in ${o.expiresInDays} days.`
  }</p>`);

  const res = await send({
    to: o.to,
    subject: fr ? `Vos fichiers — ${o.reference}` : `Your files — ${o.reference}`,
    text,
    html,
  });

  return res.sent;
}

/* ------------------------------------------------------------------ */
/* 3. Dispatched — when the parcel goes                                */
/* ------------------------------------------------------------------ */

export async function sendDispatched(o: {
  to: string;
  name: string;
  reference: string;
  locale: Locale;
  carrier: string | null;
  tracking: string | null;
  statusPath: string;
}): Promise<boolean> {
  const fr = o.locale === "fr";
  const url = `${baseUrl()}${o.statusPath}`;

  const trackingLine = o.tracking
    ? fr
      ? `Suivi ${o.carrier ? `(${o.carrier})` : ""} : ${o.tracking}`
      : `Tracking ${o.carrier ? `(${o.carrier})` : ""}: ${o.tracking}`
    : null;

  const text = [
    `${fr ? "Bonjour" : "Hello"} ${o.name},`,
    "",
    fr
      ? `Votre commande ${o.reference} est partie.`
      : `Your order ${o.reference} is on its way.`,
    "",
    trackingLine,
    trackingLine ? "" : null,
    `${fr ? "Votre commande" : "Your order"}: ${url}`,
    "",
    signOff(o.locale),
  ]
    .filter((l) => l !== null)
    .join("\n");

  const html = wrap(`
<p>${fr ? "Bonjour" : "Hello"} ${o.name},</p>
<p>${fr ? "Votre commande" : "Your order"} <strong>${o.reference}</strong> ${fr ? "est partie." : "is on its way."}</p>
${trackingLine ? `<p style="background:#f4f7fb;padding:12px;font-size:14px">${trackingLine}</p>` : ""}
<p><a href="${url}" style="color:#c8102e;font-weight:600">${fr ? "Voir votre commande" : "View your order"}</a></p>`);

  const res = await send({
    to: o.to,
    subject: fr ? `Commande ${o.reference} expédiée` : `Order ${o.reference} dispatched`,
    text,
    html,
  });

  return res.sent;
}
