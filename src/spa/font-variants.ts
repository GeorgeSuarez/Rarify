/**
 * PROTOTYPE (throwaway, experiment/dashboard-fonts branch only): font
 * directions for the dashboard, switchable via `?variant=` on the
 * `/prototype/fonts` route.
 *
 * Four variants of the dashboard typeface: A is the current system stack
 * (control), B–D are single Google Fonts families applied to the whole
 * dashboard so headings, cards, and numbers can be judged in place.
 */

/** One dashboard typeface direction. */
export interface FontVariant {
  /** Short `?variant=` key (A, B, C, …). */
  readonly key: string;
  /** Human-readable name shown in the switcher bar. */
  readonly name: string;
  /** One-line flavour note for the switcher tooltip. */
  readonly blurb: string;
  /** CSS font-family stack applied to the dashboard wrapper. */
  readonly stack: string;
}

export const FONT_VARIANTS: ReadonlyArray<FontVariant> = [
  {
    key: "A",
    name: "System (current)",
    blurb: "Control: Tailwind system sans, no webfont",
    stack:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    key: "B",
    name: "Space Grotesk",
    blurb: "Geometric techy, close to Steam Deck energy",
    stack: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "C",
    name: "Outfit",
    blurb: "Rounded modern SaaS, friendly and clean",
    stack: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "D",
    name: "Chakra Petch",
    blurb: "Angular esports, condensed and aggressive",
    stack: '"Chakra Petch", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "E",
    name: "Inter",
    blurb: "Neutral professional, the safe SaaS default",
    stack: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "F",
    name: "JetBrains Mono",
    blurb: "Terminal stat-board, monospace everywhere",
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  {
    key: "G",
    name: "Bricolage Grotesque",
    blurb: "Expressive wildcard with optical sizing",
    stack: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "H",
    name: "Orbitron",
    blurb: "Futuristic gamer display, check body readability",
    stack: '"Orbitron", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "I",
    name: "Sora",
    blurb: "Modern dashboard techy, wide and soft",
    stack: '"Sora", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "J",
    name: "Rajdhani",
    blurb: "Condensed scoreboard HUD, tall and narrow",
    stack: '"Rajdhani", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "K",
    name: "Oxanium",
    blurb: "Gaming-interface sans, readable futuristic",
    stack: '"Oxanium", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "L",
    name: "Unbounded",
    blurb: "Pill-shaped futuristic display wildcard",
    stack: '"Unbounded", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: "M",
    name: "Zilla Slab",
    blurb: "Slab-serif print wildcard, scoreboard ink",
    stack: '"Zilla Slab", ui-serif, Georgia, serif',
  },
];

/** Google Fonts stylesheet covering every prototype family. */
export const PROTOTYPE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Chakra+Petch:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Orbitron:wght@400;500;600;700;800;900&family=Sora:wght@400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&family=Oxanium:wght@400;500;600;700;800&family=Unbounded:wght@400;500;600;700;800;900&family=Zilla+Slab:wght@400;500;600;700&display=swap";

/**
 * Resolve a `?variant=` key to a font variant, falling back to the control.
 *
 * @param key - Raw search-param value or null.
 * @returns The matching variant, or the system control when unknown.
 */
export function resolveFontVariant(key: string | null): FontVariant {
  return FONT_VARIANTS.find((variant) => variant.key === key) ?? FONT_VARIANTS[0];
}
