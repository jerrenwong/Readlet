import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "danger" | "secondary";

const fills: Record<Variant, string> = {
  primary: "bg-primary border-primary-edge text-white",
  danger: "bg-danger-text border-[#9e1810] text-white",
  secondary: "bg-surface border-flame-off text-text border-2",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-b-4 px-6 py-3 text-lg font-extrabold transition-[transform,border-width] duration-75 active:translate-y-1 active:border-b-0 disabled:pointer-events-none disabled:opacity-60";

/** Chunky button: solid fill with a 4px darker bottom edge that compresses when pressed. */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`${base} ${fills[variant]} ${className}`} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${base} ${fills[variant]} ${className}`} />;
}
