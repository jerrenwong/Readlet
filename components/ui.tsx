import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`border border-flame-off bg-surface p-5 ${className}`}>{children}</section>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{label}</span>
        {children}
      </label>
      {error ? (
        <span className="text-sm text-danger-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

const inputCls =
  "min-h-12 w-full border border-field bg-white px-4 py-2.5 text-base text-text outline-none placeholder:text-text-muted/70 focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-24 resize-y ${props.className ?? ""}`} />;
}

export function TextButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-11 px-3 font-semibold text-accent-text hover:bg-accent/10 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex justify-center py-10" role="status" aria-label={label}>
      <span className="size-8 animate-spin rounded-full border-4 border-flame-off border-t-accent" />
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-4 border-danger bg-danger/10 px-4 py-3 text-danger-text" role="alert">
      {children}
    </p>
  );
}

export function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" className={`inline-block align-[-0.125em] ${className}`}>
      <rect x="3" y="7" width="10" height="7.5" rx="2" fill="currentColor" />
      <path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
