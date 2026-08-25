/**
 * The eight certification tracks.
 *
 * TRADEMARK NOTE — read before editing any copy here.
 * CompTIA, Cisco and EC-Council are protected marks. KSF sells exam
 * PREPARATION, not accredited training. Every title therefore reads
 * "Prepare for X". Never "Official", never "Certified Partner", never a
 * vendor logo presented as a KSF badge. Exam vouchers are bought from the
 * vendor and are explicitly not included.
 */

export type Vendor = "CompTIA" | "Cisco" | "EC-Council";
export type Level = "Foundation" | "Intermediate" | "Advanced";

export type Track = {
  slug: string;
  vendor: Vendor;
  /** Official exam code, factual reference only. */
  examCode: string;
  /** Always phrased as preparation. */
  name: string;
  shortName: string;
  summary: string;
  level: Level;
  hours: number;
  /** Who this suits — used on the card and the detail page. */
  audience: string;
  prerequisites: string[];
  domains: { title: string; weight: string; blurb: string }[];
  /** Ordering on the catalogue. */
  order: number;
  open: boolean;
};

export const TRACKS: Track[] = [
  {
    slug: "comptia-security-plus",
    vendor: "CompTIA",
    examCode: "SY0-701",
    name: "Prepare for CompTIA Security+",
    shortName: "Security+",
    summary:
      "The baseline security certification most UK employers screen for. Covers threats, architecture, operations and governance across a broad practical syllabus.",
    level: "Foundation",
    hours: 120,
    audience:
      "Career changers and IT support staff moving into their first dedicated security role.",
    prerequisites: [
      "Comfortable with basic networking — IP addressing, DNS, common ports",
      "Around two years of general IT experience, or equivalent self-study",
      "No prior certification required",
    ],
    domains: [
      { title: "General security concepts", weight: "12%", blurb: "Control types, change management, cryptographic fundamentals." },
      { title: "Threats, vulnerabilities and mitigations", weight: "22%", blurb: "Threat actors, attack surfaces, hardening and mitigation techniques." },
      { title: "Security architecture", weight: "18%", blurb: "Cloud and on-premise models, resilience, data protection design." },
      { title: "Security operations", weight: "28%", blurb: "Monitoring, incident response, identity management, automation." },
      { title: "Programme management and oversight", weight: "20%", blurb: "Governance, risk, third-party assessment, compliance." },
    ],
    order: 1,
    open: true,
  },
  {
    slug: "cisco-ccna",
    vendor: "Cisco",
    examCode: "200-301",
    name: "Prepare for Cisco CCNA",
    shortName: "CCNA",
    summary:
      "The networking foundation everything else stands on. Routing, switching, IP services, wireless and network security fundamentals.",
    level: "Foundation",
    hours: 140,
    audience:
      "Anyone entering networking, and security learners who need real network depth rather than surface familiarity.",
    prerequisites: [
      "Basic computer literacy and familiarity with operating systems",
      "No prior networking certification required",
      "Willingness to work through hands-on lab exercises",
    ],
    domains: [
      { title: "Network fundamentals", weight: "20%", blurb: "Components, topologies, cabling, IPv4 and IPv6 addressing." },
      { title: "Network access", weight: "20%", blurb: "VLANs, trunking, spanning tree, wireless architecture." },
      { title: "IP connectivity", weight: "25%", blurb: "Routing tables, static routing, OSPF, first-hop redundancy." },
      { title: "IP services", weight: "10%", blurb: "NAT, NTP, DHCP, DNS, SNMP, QoS concepts." },
      { title: "Security fundamentals", weight: "15%", blurb: "Access control, port security, wireless security, VPN concepts." },
      { title: "Automation and programmability", weight: "10%", blurb: "Controller-based networking, REST APIs, configuration management." },
    ],
    order: 2,
    open: true,
  },
  {
    slug: "comptia-network-plus",
    vendor: "CompTIA",
    examCode: "N10-009",
    name: "Prepare for CompTIA Network+",
    shortName: "Network+",
    summary:
      "Vendor-neutral networking fundamentals. A gentler on-ramp than CCNA, and a common prerequisite in job specifications.",
    level: "Foundation",
    hours: 100,
    audience:
      "Helpdesk and IT support staff who need formal networking credentials without committing to the Cisco ecosystem.",
    prerequisites: [
      "Around nine months of networking exposure, or equivalent study",
      "CompTIA A+ is helpful but not required",
    ],
    domains: [
      { title: "Networking concepts", weight: "23%", blurb: "OSI model, topologies, cloud concepts, ports and protocols." },
      { title: "Network implementation", weight: "20%", blurb: "Routing, switching, wireless standards and deployment." },
      { title: "Network operations", weight: "19%", blurb: "Documentation, monitoring, disaster recovery." },
      { title: "Network security", weight: "14%", blurb: "Physical and logical controls, common attacks, hardening." },
      { title: "Troubleshooting", weight: "24%", blurb: "Methodology, cabling, connectivity and performance issues." },
    ],
    order: 3,
    open: true,
  },
  {
    slug: "comptia-cysa-plus",
    vendor: "CompTIA",
    examCode: "CS0-003",
    name: "Prepare for CompTIA CySA+",
    shortName: "CySA+",
    summary:
      "Defensive security analytics — the SOC analyst path. Behavioural detection, threat intelligence, incident response and vulnerability management.",
    level: "Intermediate",
    hours: 130,
    audience:
      "Security practitioners moving into a SOC or blue-team role, typically after Security+.",
    prerequisites: [
      "Security+ level knowledge, or equivalent working experience",
      "Around four years of hands-on IT security experience is the vendor's guidance",
      "Comfortable reading logs and command output",
    ],
    domains: [
      { title: "Security operations", weight: "33%", blurb: "System and network analysis, threat intelligence, efficiency through automation." },
      { title: "Vulnerability management", weight: "30%", blurb: "Scanning, analysis, prioritisation, controls and reporting." },
      { title: "Incident response and management", weight: "20%", blurb: "Attack frameworks, response procedure, containment and recovery." },
      { title: "Reporting and communication", weight: "17%", blurb: "Stakeholder reporting, metrics, escalation and documentation." },
    ],
    order: 4,
    open: true,
  },
  {
    slug: "comptia-pentest-plus",
    vendor: "CompTIA",
    examCode: "PT0-003",
    name: "Prepare for CompTIA PenTest+",
    shortName: "PenTest+",
    summary:
      "Offensive security with the paperwork that makes it lawful. Scoping, reconnaissance, exploitation, and the reporting that clients actually pay for.",
    level: "Intermediate",
    hours: 130,
    audience:
      "Analysts moving to offensive work, and consultants who need a credential behind their testing practice.",
    prerequisites: [
      "Network+ and Security+ level knowledge, or equivalent experience",
      "Around three to four years of hands-on security experience",
      "Scripting familiarity — Python or Bash — is strongly recommended",
    ],
    domains: [
      { title: "Engagement management", weight: "13%", blurb: "Scoping, rules of engagement, legal and compliance considerations." },
      { title: "Reconnaissance and enumeration", weight: "21%", blurb: "Passive and active information gathering, scanning, enumeration." },
      { title: "Vulnerability discovery and analysis", weight: "17%", blurb: "Scanning, manual verification, prioritising real risk." },
      { title: "Attacks and exploits", weight: "35%", blurb: "Network, application, wireless, cloud and social engineering attacks." },
      { title: "Post-exploitation and lateral movement", weight: "14%", blurb: "Persistence, privilege escalation, cleanup and reporting." },
    ],
    order: 5,
    open: true,
  },
  {
    slug: "comptia-linux-plus",
    vendor: "CompTIA",
    examCode: "XK0-005",
    name: "Prepare for CompTIA Linux+",
    shortName: "Linux+",
    summary:
      "Practical Linux administration — the operating system most security tooling and infrastructure actually runs on.",
    level: "Intermediate",
    hours: 110,
    audience:
      "Security and networking learners who keep hitting the limits of their command-line confidence.",
    prerequisites: [
      "Around a year of Linux administration exposure, or equivalent study",
      "Comfortable working in a terminal",
    ],
    domains: [
      { title: "System management", weight: "32%", blurb: "Filesystems, storage, processes, kernel modules, boot process." },
      { title: "Security", weight: "21%", blurb: "Permissions, SELinux and AppArmor, authentication, firewalls." },
      { title: "Scripting, containers and automation", weight: "19%", blurb: "Shell scripting, version control, containers, infrastructure as code." },
      { title: "Troubleshooting", weight: "28%", blurb: "Network, storage, permission and performance problems." },
    ],
    order: 6,
    open: true,
  },
  {
    slug: "ethical-hacker",
    vendor: "EC-Council",
    examCode: "312-50",
    name: "Prepare for Certified Ethical Hacker",
    shortName: "Ethical Hacker",
    summary:
      "The best-known offensive security credential, and the one that appears most often in job adverts. Broad coverage of attack techniques and countermeasures.",
    level: "Intermediate",
    hours: 140,
    audience:
      "Practitioners who need the specific credential employers and tender documents ask for by name.",
    prerequisites: [
      "Solid networking fundamentals — CCNA or Network+ level",
      "Around two years of information security experience",
      "Comfortable building and breaking things in a lab environment",
    ],
    domains: [
      { title: "Reconnaissance and footprinting", weight: "20%", blurb: "OSINT, scanning, enumeration and target mapping." },
      { title: "System and network attacks", weight: "25%", blurb: "System hacking, malware, sniffing, denial of service, session hijacking." },
      { title: "Web and application attacks", weight: "20%", blurb: "Web server and application attacks, SQL injection." },
      { title: "Wireless, mobile, IoT and OT", weight: "20%", blurb: "Attacks and countermeasures across non-traditional targets." },
      { title: "Cloud and cryptography", weight: "15%", blurb: "Cloud attack surfaces, container security, applied cryptography." },
    ],
    order: 7,
    open: true,
  },
  {
    slug: "cisco-ccnp-encor",
    vendor: "Cisco",
    examCode: "350-401",
    name: "Prepare for Cisco CCNP ENCOR",
    shortName: "CCNP ENCOR",
    summary:
      "Enterprise networking at professional level. Advanced routing, virtualisation, infrastructure security and automation at scale.",
    level: "Advanced",
    hours: 180,
    audience:
      "Working network engineers with CCNA already behind them, moving toward senior enterprise roles.",
    prerequisites: [
      "CCNA level knowledge is effectively mandatory, not optional",
      "Three to five years of implementing enterprise networks",
      "Regular hands-on access to network equipment or a lab simulator",
    ],
    domains: [
      { title: "Architecture", weight: "15%", blurb: "Enterprise design, high availability, cloud deployment models." },
      { title: "Virtualisation", weight: "10%", blurb: "Device virtualisation, path virtualisation, network virtualisation concepts." },
      { title: "Infrastructure", weight: "30%", blurb: "Layer 2 and 3 forwarding, EIGRP, OSPF, BGP, wireless, IP services." },
      { title: "Network assurance", weight: "10%", blurb: "Diagnostics, monitoring, NetFlow, SPAN, IPSLA." },
      { title: "Security", weight: "20%", blurb: "Device access control, infrastructure security, wireless security, network access control." },
      { title: "Automation", weight: "15%", blurb: "Python fundamentals, APIs, configuration management, controller platforms." },
    ],
    order: 8,
    open: true,
  },
];

export const getTrack = (slug: string) => TRACKS.find((t) => t.slug === slug);

export const tracksInOrder = () => [...TRACKS].sort((a, b) => a.order - b.order);

/* ===================================================================
   ⚠️  UNCONFIRMED COMMERCIAL PROMISES — REVIEW BEFORE TAKING PAYMENT
   ===================================================================
   Everything in INCLUDED and NOT_INCLUDED below was drafted by Claude to
   make the pages renderable. It has NOT been confirmed by KSF.

   These are contractual promises. Once someone pays £10 on the strength
   of them, they are what KSF is bound to deliver. Advertising a service
   that is not provided is a breach of the Consumer Protection from
   Unfair Trading Regulations, quite apart from the refund exposure.

   Correct this list to what KSF genuinely delivers, then delete this
   comment. It is rendered on: /pricing, /faq and all 8 track pages.
   =================================================================== */

/** What every subscription includes, regardless of track. */
export const INCLUDED = [
  "Structured study path through every exam domain",
  "Guided practice questions with written explanations",
  "Direct access to a KSF mentor for questions",
  "Progress reviews against the exam blueprint",
  "Study resources and lab guidance",
] as const;

export const NOT_INCLUDED = [
  "The exam voucher itself — bought directly from the vendor",
  "Official vendor courseware",
  "A guaranteed pass; the exam is sat with the vendor, not with KSF",
] as const;

export const PRICE_GBP = 10;
