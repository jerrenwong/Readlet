/**
 * Preset cat colorways for the Readlet mascot and profile avatars.
 * Ids are persisted in `profiles.avatar`: never rename or remove one.
 */

export type AvatarId =
  | "cat-ginger"
  | "cat-black"
  | "cat-grey"
  | "cat-cream"
  | "cat-tabby"
  | "cat-calico"
  | "cat-siamese"
  | "cat-tuxedo";

export type Colorway = {
  id: AvatarId;
  label: string;
  /** Main fur colour. */
  body: string;
  /** Belly / chest colour. */
  belly: string;
  /** Stripes, points or patches (white markings for tuxedo). */
  accent: string;
  /** Inner ear. */
  ear: string;
  /** Iris colour. */
  eye: string;
  pattern: "none" | "stripes" | "points" | "patches" | "tuxedo";
};

export const AVATARS: readonly Colorway[] = [
  { id: "cat-ginger", label: "Ginger", body: "#E8701F", belly: "#FCE8C8", accent: "#C4560F", ear: "#F6A5A0", eye: "#6E9F3A", pattern: "none" },
  { id: "cat-black", label: "Black", body: "#2F2A2C", belly: "#46403F", accent: "#1F1B1C", ear: "#E58E95", eye: "#E8C340", pattern: "none" },
  { id: "cat-grey", label: "Grey", body: "#8E959E", belly: "#E6E8EB", accent: "#6B727B", ear: "#F2A7AE", eye: "#8CC152", pattern: "none" },
  { id: "cat-cream", label: "Cream", body: "#F3D9A8", belly: "#FFF5E3", accent: "#E3BC7A", ear: "#F5A9A9", eye: "#4E93C9", pattern: "none" },
  { id: "cat-tabby", label: "Tabby", body: "#A8743F", belly: "#F1DEC0", accent: "#5E3B1E", ear: "#EFA2A0", eye: "#A8B83A", pattern: "stripes" },
  { id: "cat-calico", label: "Calico", body: "#FFF8EE", belly: "#FFFFFF", accent: "#E8822F", ear: "#F5A9A9", eye: "#D9A23A", pattern: "patches" },
  { id: "cat-siamese", label: "Siamese", body: "#F4E6CF", belly: "#FFF8EC", accent: "#5A4033", ear: "#B88579", eye: "#5AAFE8", pattern: "points" },
  { id: "cat-tuxedo", label: "Tuxedo", body: "#2F2A2C", belly: "#FFFFFF", accent: "#FFFFFF", ear: "#E58E95", eye: "#9CCB4B", pattern: "tuxedo" },
] as const;

export const DEFAULT_AVATAR: AvatarId = "cat-ginger";

const BY_ID = new Map<string, Colorway>(AVATARS.map((c) => [c.id, c]));

export function isAvatarId(x: string): x is AvatarId {
  return BY_ID.has(x);
}

/** Colorway for an id; unknown or missing ids fall back to the default ginger cat. */
export function colorway(id: string): Colorway {
  return BY_ID.get(id) ?? (BY_ID.get(DEFAULT_AVATAR) as Colorway);
}
