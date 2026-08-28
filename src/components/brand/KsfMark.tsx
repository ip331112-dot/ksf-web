/**
 * KSF mark — the broken orbit ring with the pixel-dissolve motif.
 *
 * Rebuilt as true vector from the raster logo (download (1).jfif).
 * The ring is two overlapping arcs: navy behind, blue gradient in front,
 * with a gap at the upper right where the ring dissolves into pixels.
 *
 * Ring and pixels are pure geometry, so this stays crisp at favicon size.
 */

type Props = {
  className?: string;
  /** Render in a single flat colour (for footers, dark bands, print). */
  mono?: boolean;
  title?: string;
};

export function KsfMark({ className, mono = false, title }: Props) {
  const gradId = "ksf-ring-grad";

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!mono && (
        <defs>
          <linearGradient id={gradId} x1="104" y1="40" x2="34" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D63" />
            <stop offset="55%" stopColor="#E01E37" />
            <stop offset="100%" stopColor="#8E1224" />
          </linearGradient>
        </defs>
      )}

      {/* Long sweep, gap at the upper right. Light on the dark ground —
          the counterpart to the accent arc, not a colour of its own. */}
      <path
        d="M 107.8 55.8 A 48 48 0 1 1 72.4 13.6"
        stroke={mono ? "currentColor" : "#E7EAEF"}
        strokeWidth="11"
        strokeLinecap="round"
        opacity={mono ? 0.55 : 1}
      />

      {/* Accent arc — overlays the right and lower sweep */}
      <path
        d="M 105.1 43.6 A 48 48 0 0 1 36 101.6"
        stroke={mono ? "currentColor" : `url(#${gradId})`}
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Pixel dissolve — squares scattering out of the ring gap */}
      <g fill={mono ? "currentColor" : "#E01E37"}>
        <rect x="83" y="7" width="6.5" height="6.5" />
        <rect x="94.5" y="14.5" width="5" height="5" />
        <rect x="92.5" y="1.5" width="4" height="4" />
        <rect x="104" y="9" width="3.5" height="3.5" />
        <rect x="101.5" y="22" width="3" height="3" />
        <rect x="110.5" y="2.5" width="2.5" height="2.5" />
        <rect x="111.5" y="16" width="2" height="2" />
      </g>
    </svg>
  );
}
