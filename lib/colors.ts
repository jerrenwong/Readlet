// Avatar colors; white letters on each meet WCAG AA (≥ 4.9:1).
export const COLORS = {
  orange: "#B9520F",
  red: "#C0392B",
  pink: "#B0306A",
  purple: "#7A3FA0",
  blue: "#2F5FA7",
  teal: "#197E70",
  green: "#3B7A2B",
  gray: "#5B5550",
} as const;

export type ColorId = keyof typeof COLORS;
export const COLOR_IDS = Object.keys(COLORS) as ColorId[];
export const DEFAULT_COLOR: ColorId = "orange";
export const colorHex = (id: string | null | undefined) => COLORS[id as ColorId] ?? COLORS.orange;
