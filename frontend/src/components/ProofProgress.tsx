export default function ProofProgress() {
  return (
    <div className="card skeleton-pulse" role="status" aria-live="polite" aria-label="Generating zero-knowledge proof">
      <div className="skeleton-shimmer" style={{ height: '0.75rem', width: '75%', borderRadius: '0.25rem' }} />
      <div>
        <p className="skeleton-label">Generating zero-knowledge proof…</p>
        <p className="skeleton-sub">This takes ~10 seconds on first load.</p>
      </div>
    </div>
  );
}
