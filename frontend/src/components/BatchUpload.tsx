'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Download, FileUp, Loader2 } from 'lucide-react';
import { connectWallet } from '@/lib/stellar';
import { createBatchLinks, getBatchProgress, getBatchResultsUrl, type BatchProgressData } from '@/lib/links';
import { BatchProgress } from './BatchProgress';

type PreviewRow = { amount: string; email: string; memo: string };

function previewCsv(csv: string): PreviewRow[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines[0]?.trim().toLowerCase() !== 'amount,optional_email,optional_memo') {
    throw new Error('Header must be: amount,optional_email,optional_memo');
  }
  return lines.slice(1).map((line, index) => {
    const fields: string[] = [];
    let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
      } else if (line[i] === ',' && !quoted) { fields.push(value.trim()); value = ''; }
      else value += line[i];
    }
    if (quoted || fields.length !== 2) throw new Error(`Malformed CSV at row ${index + 2}`);
    fields.push(value.trim());
    return { amount: fields[0], email: fields[1], memo: fields[2] };
  });
}

export function BatchUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const [batch, setBatch] = useState<BatchProgressData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!batch || batch.status === 'completed') return;
    const timer = window.setInterval(async () => {
      try { setBatch(await getBatchProgress(batch.id)); } catch (err) { setError(err instanceof Error ? err.message : 'Progress check failed'); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [batch]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Choose a .csv file'); return; }
    try {
      const text = await file.text();
      const parsed = previewCsv(text);
      if (!parsed.length) throw new Error('CSV must contain at least one row');
      if (parsed.length > 100) throw new Error('CSV exceeds the 100 row limit');
      setCsv(text); setRows(parsed); setBatch(null); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read CSV'); setRows([]); }
  };

  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0]); };
  const submit = async () => {
    try {
      setSubmitting(true); setError('');
      const creator = await connectWallet();
      const { batchId } = await createBatchLinks(csv, creator);
      setBatch(await getBatchProgress(batchId));
    } catch (err) { setError(err instanceof Error ? err.message : 'Batch submission failed'); }
    finally { setSubmitting(false); }
  };

  return <div className="space-y-5">
    <div onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => inputRef.current?.click()}
      className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-default)] p-8 text-center hover:border-accent">
      <FileUp className="mx-auto mb-2 h-8 w-8 text-accent" />
      <p className="text-sm font-semibold text-primary">Drop a CSV here or click to browse</p>
      <p className="mt-1 text-xs text-secondary">amount,optional_email,optional_memo · maximum 100 rows</p>
      <input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(event.target.files?.[0])} />
    </div>
    {error && <div className="rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{error}</div>}
    {rows.length > 0 && !batch && <>
      <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-elevated text-secondary"><tr><th className="p-2">Row</th><th className="p-2">Amount</th><th className="p-2">Email</th><th className="p-2">Memo</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-[var(--border-default)]"><td className="p-2">{index + 2}</td><td className="p-2">{row.amount}</td><td className="p-2">{row.email || '—'}</td><td className="max-w-40 truncate p-2">{row.memo || '—'}</td></tr>)}</tbody></table>
      </div>
      <button onClick={submit} disabled={submitting} className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold">
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting batch…</> : `Create ${rows.length} Links`}
      </button>
    </>}
    {batch && <>
      <BatchProgress batch={batch} />
      {batch.status === 'completed' && <a href={getBatchResultsUrl(batch.id)} className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold"><Download className="h-4 w-4" /> Download Results CSV</a>}
    </>}
  </div>;
}
