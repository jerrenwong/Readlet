import { describe, expect, it } from "vitest";
import { colors, contrast } from "@/lib/theme/tokens";

// [foreground, background, minimum ratio]. 4.5 = WCAG AA body text,
// 3 = large text (18px+ bold) and non-text UI such as icons and fills.
const pairs: [keyof typeof colors, keyof typeof colors, number][] = [
  ["text", "background", 4.5],
  ["text", "surface", 4.5],
  ["textMuted", "background", 4.5],
  ["textMuted", "surface", 4.5],
  ["accentText", "background", 4.5],
  ["accentText", "surface", 4.5],
  ["dangerText", "background", 4.5],
  ["dangerText", "surface", 4.5],
  ["surface", "primary", 4.5], // button labels at any size
  ["surface", "primaryEdge", 4.5], // avatar letters
  ["surface", "accent", 3],
  ["surface", "danger", 3],
  ["accent", "surface", 3], // checkmarks
  ["accent", "background", 3], // teal page titles (large text)
  ["field", "surface", 3], // input borders
  ["flame", "surface", 2.5], // decorative flame; paired with a number label
];

describe("color tokens meet WCAG contrast", () => {
  it.each(pairs)("%s on %s ≥ %s", (fg, bg, min) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });
});
