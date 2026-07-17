'use client';

import type { BatchProgressData } from '@/lib/links';
import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';

export function BatchProgress({ batch }: { batch: BatchProgressData }) {
  const finished = batch.successCount + batch.failureCount;
  const percent = batch.rows.length ? Math.round((finished / batch.rows.length) * 100) : 0;
  return (
    <div className="space-y-4" aria-live="polite">
      <div>
        <div className="mb-1 flex justify-between text-xs font-semibold text-secondary">
          <span>{batch.status === 'completed' ? 'Complete' : 'Creating links…'}</span>
          <span>{finished}/{batch.rows.length} ({percent}%)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="max-h-72 overflow-auto rounded-lg border border-[var(--border-default)]">
        {batch.rows.map((row) => (
          <div key={row.row} className="flex items-start gap-3 border-b border-[var(--border-default)] p-3 text-xs last:border-b-0">
            {row.status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              : row.status === 'failed' ? <XCircle className="h-4 w-4 shrink-0 text-error" />
              : row.status === 'processing' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
              : <Clock3 className="h-4 w-4 shrink-0 text-secondary" />}
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><span>Row {row.row}: {row.amount} XLM</span><span className="capitalize">{row.status}</span></div>
              {row.error && <p className="mt-1 text-error">{row.error}</p>}
              {row.url && <p className="mt-1 truncate font-mono text-secondary">{row.url}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
