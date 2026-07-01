import { ReactNode } from "react";

export function StatusBlock({ type, children }: { type: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "bg-green-900/20 border-green-800 text-green-400",
    error: "bg-red-900/20 border-red-800 text-red-400",
    info: "bg-blue-900/20 border-blue-800 text-blue-400",
  };

  return (
    <div className={`rounded-xl border p-4 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-[var(--foreground-secondary)]">{text}</p>
    </div>
  );
}
