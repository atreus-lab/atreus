import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--background-primary)]";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]",
  secondary: "bg-[var(--background-elevated)] text-[var(--foreground-primary)] hover:brightness-110 active:scale-[0.98]",
  ghost: "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)]",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
  icon: "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)] p-2 rounded-lg",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";
