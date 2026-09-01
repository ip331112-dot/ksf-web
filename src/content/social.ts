/**
 * KSF's social profiles.
 *
 * URLs here are the CANONICAL profile addresses, not the links the
 * mobile apps hand you when you tap "share". Those carry tracking
 * parameters and, on Facebook, an opaque share id that resolves through
 * a redirect and is not guaranteed to keep working:
 *
 *   facebook.com/share/1DMtuvCkvw/?mibextid=…  →  facebook.com/Ksftechservices03
 *   tiktok.com/@ksftechservices?_r=1&_t=…      →  tiktok.com/@ksftechservices
 *
 * Both were resolved by following the redirect before being recorded, so
 * what ships is the address the profile actually lives at.
 *
 * To add a platform: add an entry here and an icon in
 * @/components/social/SocialIcon. Nothing else needs touching — the
 * footer and the Organization schema both read this list, so a platform
 * is either present in both or absent from both.
 */

export type SocialPlatform = "facebook" | "youtube" | "tiktok";

export type SocialProfile = {
  platform: SocialPlatform;
  /** Shown to screen readers, and used as the link title. */
  name: string;
  url: string;
};

export const SOCIAL: SocialProfile[] = [
  {
    platform: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/Ksftechservices03",
  },
  {
    platform: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@KSFTECHSERVICES",
  },
  {
    platform: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@ksftechservices",
  },
];
