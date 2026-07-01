import { ReactNode } from "react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  title?: string;
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
}

export function PageLayout({ children, title, backHref, backLabel = "Back", maxWidth = "max-w-md" }: Props) {
  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: "var(--background-primary)" }}>
      <div className={`w-full mx-auto ${maxWidth} space-y-6`}>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            {backLabel}
          </Link>
        )}
        {title && <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">{title}</h1>}
        {children}
      </div>
    </div>
  );
}
