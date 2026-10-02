export async function verifyViaNativeService(
  recipient: string,
  linkHash: string,
  nullifier: string,
  proofB64: string
): Promise<boolean> {
  const url = process.env.VERIFIER_SERVICE_URL;
  if (!url) {
    throw new Error('VERIFIER_SERVICE_URL is not configured');
  }
  const endpoint = `${url.replace(/\/$/, '')}/verify`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, link_hash: linkHash, nullifier, proof: proofB64 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Verifier service responded ${res.status}: ${text}`);
  }
  const data = await res.json();
  return Boolean(data.valid);
}
