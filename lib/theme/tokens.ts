// Color tokens from the spec ("Design and UI → Color tokens").
// accentText and dangerText are darker text-only shades added so links and
// error text meet WCAG AA (4.5:1); see DECISIONS.md.
export const colors = {
  primary: "#E8701F",
  primaryEdge: "#B9520F",
  flame: "#FF6B2C",
  flameOff: "#D8D0C9",
  accent: "#1F9E8C",
  accentText: "#197E70",
  background: "#FFF7EE",
  surface: "#FFFFFF",
  text: "#3B2F2A",
  textMuted: "#7A6A61",
  danger: "#EF5A50",
  dangerText: "#DC2114",
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
