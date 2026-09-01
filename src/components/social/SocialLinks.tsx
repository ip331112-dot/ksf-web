import { SOCIAL } from "@/content/social";
import { SocialIcon } from "./SocialIcon";

/**
 * The row of social links.
 *
 * Renders nothing at all when SOCIAL is empty, so removing the last
 * profile leaves no orphaned heading or empty box behind.
 *
 * Every link carries its platform name as an accessible label: the icon
 * is decorative, so without one a screen reader announces "link" three
 * times and the reader has no way to tell them apart.
 *
 * `rel="me"` is what lets a profile point back and verify it is the same
 * organisation — Mastodon and some search engines read it, and it costs
 * nothing. `noopener` is the security half: without it the opened tab
 * can reach back through `window.opener`.
 */
export function SocialLinks({
  label,
  tone = "dark",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  if (SOCIAL.length === 0) return null;

  return (
    <ul className="flex items-center gap-1" aria-label={label}>
      {SOCIAL.map((profile) => (
        <li key={profile.platform}>
          <a
            href={profile.url}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={profile.name}
            className={
              "inline-flex h-9 w-9 items-center justify-center transition-colors " +
              (tone === "dark"
                ? "text-white/70 hover:text-white"
                : "text-ink-faint hover:text-blue-lift")
            }
          >
            <SocialIcon platform={profile.platform} />
          </a>
        </li>
      ))}
    </ul>
  );
}
