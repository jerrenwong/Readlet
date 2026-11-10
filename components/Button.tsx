import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "danger" | "secondary";
type Size = "md" | "sm";

const fills: Record<Variant, string> = {
  primary: "bg-primary border-primary-edge text-white",
  danger: "bg-danger-text border-[#9e1810] text-white",
  secondary: "bg-surface border-flame-off text-text border-2",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 font-extrabold transition-[transform,border-width] duration-75 active:translate-y-1 active:border-b-0 disabled:pointer-events-none disabled:opacity-60";
// md labels are 20px/800 (WCAG large text, so white on primary's 3.1:1 passes);
// sm labels are 16px, so primary sm buttons use the darker primary-edge fill (4.9:1).
const sizes: Record<Size, string> = {
  md: "min-h-12 px-6 py-3 text-xl",
  sm: "min-h-11 px-4 py-2 text-base",
};
const fill = (v: Variant, s: Size) =>
  v === "primary" && s === "sm" ? "bg-primary-edge border-[#8A3C0A] text-white" : fills[v];

/** Chunky button: solid fill with a 4px darker bottom edge that compresses when pressed. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={`${base} ${sizes[size]} ${fill(variant, size)} ${className}`} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${base} ${sizes.md} ${fills[variant]} ${className}`} />;
}
