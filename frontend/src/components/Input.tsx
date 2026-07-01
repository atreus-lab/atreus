import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm text-[var(--foreground-secondary)]">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 rounded-xl border bg-[var(--background-primary)] border-[var(--background-elevated)] text-[var(--foreground-primary)] placeholder-[var(--foreground-secondary)] outline-none transition-all duration-200 focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)] ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
