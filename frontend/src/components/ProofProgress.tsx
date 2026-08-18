import { Loader2 } from "lucide-react";

export default function ProofProgress() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Generating zero-knowledge proof"
      className="flex flex-col gap-3 rounded-xl border border-grey-100 bg-white p-4"
    >
      <div className="h-3 w-3/4 animate-pulse rounded bg-blue-50" style={{ animationDuration: "1.5s" }} />
      <div className="flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primaryBlue" />
        <div>
          <p className="text-sm font-bold text-grey-800">Generating zero-knowledge proof…</p>
          <p className="mt-0.5 text-xs text-grey-500">This takes ~10 seconds on first load.</p>
        </div>
      </div>
    </div>
  );
}