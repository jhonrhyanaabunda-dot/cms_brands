// Tenant theming for the public microsite. Returns a style object with CSS
// custom properties that downstream components read instead of hardcoding
// brand colors. Lets every dealership ship in its own color identity.

/**
 * Light/dark text-on-color helper. Pick black or white for accessibility
 * against the dealership's primary color.
 */
function readableOn(hex: string): "#0B0D0F" | "#ffffff" {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#0B0D0F";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // WCAG relative luminance approximation.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0B0D0F" : "#ffffff";
}

/**
 * Slight darken for hover states. Keeps the tenant's identity but adds a
 * visible interaction signal without a second user-supplied color.
 */
function darken(hex: string, amount = 0.12): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) * (1 - amount));
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function siteThemeVars(d: { primaryColor?: string | null; brand?: string | null }): React.CSSProperties {
  const primary = d.primaryColor || "#1DB954";
  const onPrimary = readableOn(primary);
  const primaryDark = darken(primary, 0.14);

  return {
    // Read by site-header, site-footer, and block-renderer via Tailwind's
    // arbitrary-value syntax: `bg-[color:var(--site-primary)]`.
    ["--site-primary" as any]: primary,
    ["--site-primary-dark" as any]: primaryDark,
    ["--site-on-primary" as any]: onPrimary,
  } as React.CSSProperties;
}
