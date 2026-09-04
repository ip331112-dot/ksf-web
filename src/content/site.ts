/**
 * Site-wide facts and the five KSF services.
 *
 * Contact details are taken from the KSF flyer. TRADING_NAME and
 * TRADING_ADDRESS are placeholders — as a sole trader, UK trading
 * disclosure rules require a real name and contact address in the footer
 * and on invoices. These must be filled in before taking live payments.
 */

export const SITE = {
  name: "KSF Tech Services",
  tagline: "Secure. Innovate. Connect.",
  strapline: "Peace of mind always",
  kicker: "Cyber safety first",
  description:
    "Certification training and cyber security services from KSF Tech Services. Prepare for CompTIA, Cisco and EC-Council exams with mentored support from £10 a month.",
  url: "https://ksftechservices.com",
  email: "admin@ksftechservices.com",
  emailAlt: "ksftechservices@gmail.com",
  phoneUk: "+44 7440 490304",
  phoneFr: "+33 7 44 25 58 24",
  coverage: "Worldwide service",

  // TODO — required before launch (sole trader disclosure)
  tradingName: "[Trading name — to confirm]",
  tradingAddress: "[Disclosure address — to confirm]",

  /**
   * How quickly you promise to respond, and where you work.
   *
   * These two are also in the dictionaries as `common.responseTime` and
   * `common.coverage`, and translated pages read them from there — an
   * English phrase inside a French sentence is worse than no translation
   * at all. What remains here serves the pages still awaiting
   * translation. Change one, change both, until the last page moves over.
   */
  responseTime: "3 working days",
} as const;

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  points: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "cyber-security",
    name: "Cyber Security",
    tagline: "Protecting what matters most",
    summary:
      "Assessment, hardening and ongoing protection for organisations that cannot afford to find out the hard way.",
    points: [
      "Security posture assessment and gap analysis",
      "Endpoint and network hardening",
      "Incident response planning",
      "Staff awareness training",
    ],
  },
  {
    slug: "it-support",
    name: "IT Support",
    tagline: "Reliable support, always",
    summary:
      "Responsive technical support for businesses that need their systems working rather than explained.",
    points: [
      "Remote and on-site troubleshooting",
      "System maintenance and patching",
      "Hardware and software procurement",
      "User account and device management",
    ],
  },
  {
    slug: "network-solutions",
    name: "Network Solutions",
    tagline: "Stronger connections, better performance",
    summary:
      "Design, deployment and optimisation of networks that stay up and stay fast as the organisation grows.",
    points: [
      "Network design and implementation",
      "Wireless survey and deployment",
      "Performance troubleshooting",
      "Segmentation and secure architecture",
    ],
  },
  {
    slug: "data-protection",
    name: "Data Protection",
    tagline: "Your data, our priority",
    summary:
      "Backup, recovery and compliance work that keeps your data available, private and defensible.",
    points: [
      "Backup strategy and disaster recovery",
      "Data classification and access control",
      "UK GDPR compliance support",
      "Encryption at rest and in transit",
    ],
  },
  {
    slug: "consulting",
    name: "Consulting",
    tagline: "Smart strategies, real results",
    summary:
      "Independent technical advice for decisions that are expensive to get wrong.",
    points: [
      "Technology strategy and roadmapping",
      "Vendor and solution selection",
      "Security programme design",
      "Technical due diligence",
    ],
  },
];

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);

/** The four promises from the flyer. */
export const PROMISES = [
  { title: "Trusted experts", body: "Certified practitioners, not resellers." },
  { title: "24/7 support", body: "Reachable when it actually matters." },
  { title: "Secure solutions", body: "Security built in, never bolted on." },
  { title: "Innovative technology", body: "Current tooling, proven methods." },
] as const;

/** The four steps of the application journey. */
export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Choose your track",
    body: "Pick the certification that matches where you are and where you are heading.",
  },
  {
    step: "02",
    title: "Apply",
    body: "Tell us about your experience, your goals and how much time you have.",
  },
  {
    step: "03",
    title: "We review",
    body: `A real person reads your application. We respond within ${SITE.responseTime}.`,
  },
  {
    step: "04",
    title: "You hear back",
    body: "A clear decision with written feedback — never a silent rejection.",
  },
] as const;

export const NAV = [
  { href: "/tracks", key: "tracks" },
  { href: "/services", key: "services" },
  { href: "/shop", key: "shop" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
  /**
   * Staff sign-in, at the owner request. Set apart visually because it
   * is for KSF, not for visitors — a customer clicking it should be able
   * to tell it is not for them before they arrive.
   *
   * `key` indexes the nav section of the dictionary; the label itself
   * lives there so it can be translated rather than hard-coded here.
   */
  { href: "/admin", key: "staff", staff: true },
] as const;
