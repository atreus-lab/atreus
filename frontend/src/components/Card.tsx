import { ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

export function Card({ title, children, className = "", variant = "default" }: Props) {
  return (
    <div className={`w-full rounded-2xl border border-[var(--border-default)] bg-[var(--background-card)] ${
      variant === "compact" ? "p-5 space-y-4" : "p-6 space-y-5"
    } ${className}`}>
      {title && <h2 className="text-lg font-bold font-[family-name:var(--font-manrope)]">{title}</h2>}
      {children}
    </div>
  );
}
