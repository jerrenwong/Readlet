// Color tokens: the AIST brand palette (aist.now/graphics) mapped onto Readlet's roles.
// Brand: teal #0F89AB (logo, big type, shapes), dark teal #0C6D88 (links, small text,
// buttons), navy #0C264D, cream #F3EEE3 (page), ink #1B1F1F (body text).
// surface is the light cream AIST uses for cards; flameOff, textMuted, field and the two
// reds are neutral/semantic shades the palette doesn't cover; see DECISIONS.md.
export const colors = {
  primary: "#0C6D88", // dark teal: buttons
  primaryEdge: "#0C264D", // navy: pressed/hover, avatars
  flame: "#0F89AB", // teal: lit streak flame
  flameOff: "#D0CDC4", // ink at 16% on cream: unlit flame, hairlines
  accent: "#0F89AB", // teal: checkmarks, filled calendar days
  accentText: "#0C6D88", // dark teal: links and small accent text
  background: "#F3EEE3", // cream
  surface: "#FBF8F1", // light cream cards
  text: "#1B1F1F", // ink
  textMuted: "#5B5E5B",
  field: "#8E908B", // input borders (3:1 non-text contrast)
  danger: "#C2331F",
  dangerText: "#B42318",
} as const;

export type ColorToken = keyof typeof colors;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
