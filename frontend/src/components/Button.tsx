import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base = "inline-flex items-center justify-center font-semibold transition-all duration-150 ease-linear rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none";

const variants: Record<Variant, string> = {
  primary: "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700",
  secondary: "bg-white text-neutral-primary shadow-card hover:bg-grey-25 active:bg-grey-50",
  ghost: "text-grey-700 hover:bg-grey-50 active:bg-grey-100",
  danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  icon: "text-grey-700 hover:bg-grey-50 p-2 rounded-lg",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
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