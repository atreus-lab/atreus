"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalances, addTrustline, getExplorerUrl } from "@/lib/wallet";
import { Loader2, ArrowLeft, Check, ExternalLink, Plus } from "lucide-react";

const COMMON_ASSETS = [
  { code: "USDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU", name: "USD Coin" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U", name: "Euro Token" },
  { code: "yUSDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU", name: "Your USDC (same as USDC)" },
];

export default function AssetsPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAsset, setAddingAsset] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customIssuer, setCustomIssuer] = useState("");

  const loadBalances = async (addr: string) => {
    const bals = await getBalances(addr);
    setBalances(bals);
  };

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setAddress(wallet.publicKey);
    loadBalances(wallet.publicKey).finally(() => setLoading(false));
  }, []);

  const handleAddAsset = async (code: string, issuer: string) => {
    try {
      setAddingAsset(code);
      setError("");
      setSuccess("");
      const hash = await addTrustline(code, issuer);
      setSuccess(`${code} added!`);
      await loadBalances(address);
    } catch (err: any) {
      setError(err.message || `Failed to add ${code}`);
    } finally {
      setAddingAsset(null);
    }
  };

  const handleAddCustom = async () => {
    if (!customCode || !customIssuer) { setError("Enter both asset code and issuer"); return; }
    await handleAddAsset(customCode.trim(), customIssuer.trim());
  };

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);

  return (
    <div className="page">
      <div className="content-area inner-space">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft className="icon-sm" /> Back to Wallet
        </Link>

        <h1 className="card-title">Manage Assets</h1>

        {loading ? (
          <div className="card text-centered"><Loader2 className="icon-lg icon-spin" /></div>
        ) : (
          <>
            {/* Common Assets */}
            <div className="card">
              <h2 className="card-title">Add Asset</h2>
              <div className="inner-space">
                {error && <div className="status-error">{error}</div>}
                {success && <div className="success-banner">{success}</div>}

                {COMMON_ASSETS.map((asset) => {
                  const alreadyAdded = existingCodes.includes(asset.code);
                  const isLoading = addingAsset === asset.code;
                  return (
                    <div key={asset.code} className="flex-between card-padding divider">
                      <div>
                        <p className="card-title">{asset.code}</p>
                        <p className="detail-text">{asset.name}</p>
                      </div>
                      {alreadyAdded ? (
                        <span className="flex-center-row"><Check className="icon-sm" /> Added</span>
                      ) : (
                        <button
                          onClick={() => handleAddAsset(asset.code, asset.issuer)}
                          disabled={isLoading}
                          className="btn-secondary flex-center-row"
                        >
                          {isLoading ? <Loader2 className="icon-sm icon-spin" /> : <><Plus className="icon-sm" /> Add</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Asset */}
            <div className="card">
              <h2 className="card-title">Custom Asset</h2>
              <div className="inner-space">
                <div>
                  <label className="input-label">Asset Code</label>
                  <input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())} placeholder="e.g. RANDOM" className="input" />
                </div>
                <div>
                  <label className="input-label">Issuer Public Key</label>
                  <input value={customIssuer} onChange={e => setCustomIssuer(e.target.value)} placeholder="G..." className="input" />
                </div>
                <button onClick={handleAddCustom} disabled={!!addingAsset || !customCode || !customIssuer} className="btn-primary flex-center-row">
                  {addingAsset === "custom" ? <><Loader2 className="icon-sm icon-spin" /> Adding...</> : "Add Custom Asset"}
                </button>
              </div>
            </div>

            {/* Current Assets */}
            <div className="card">
              <h2 className="card-title">Your Assets</h2>
              {balances.map((b: any, i: number) => (
                <div key={i} className="flex-between card-padding divider">
                  <span>{b.asset_type === "native" ? "XLM" : b.asset_code}</span>
                  <span className="font-mono-text">{parseFloat(b.balance).toFixed(7)}</span>
                </div>
              ))}
              {balances.length === 0 && <p className="input-label">No assets found</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
