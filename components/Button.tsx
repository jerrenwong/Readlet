import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" };

const fills = {
  primary: "bg-primary border-primary-edge",
  danger: "bg-danger border-[#b8362e]",
};

/** Chunky button: solid fill with a 4px darker bottom edge that compresses when pressed. */
export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-2xl border-b-4 px-6 py-3 text-lg font-extrabold text-white transition-transform active:translate-y-1 active:border-b-0 disabled:opacity-60 ${fills[variant]} ${className}`}
    />
  );
}
