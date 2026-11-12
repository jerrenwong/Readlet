import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "danger" | "secondary";
type Size = "md" | "sm";

// White on dark teal is 5.9:1 and on danger-text 6.6:1, so labels pass AA at any size.
const fills: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-edge",
  danger: "bg-danger-text text-white hover:bg-[#8F1C13]",
  secondary: "border border-field bg-surface text-text hover:border-text",
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,border-color,transform] duration-100 active:translate-y-px disabled:pointer-events-none disabled:opacity-60";
const sizes: Record<Size, string> = {
  md: "min-h-12 px-6 py-3 text-lg",
  sm: "min-h-11 px-4 py-2 text-base",
};

/** Flat, square AIST button: solid fill that darkens to navy on hover. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={`${base} ${sizes[size]} ${fills[variant]} ${className}`} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${base} ${sizes.md} ${fills[variant]} ${className}`} />;
}
