const CACHE_KEY = "atreus_usd_rates";
const CACHE_TTL = 5 * 60 * 1000;

const USD_RATES: Record<string, number> = {
  USDC: 1,
  EURT: 1.08,
};

export async function getXlmUsdPrice(): Promise<number> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    if (cached.price && Date.now() - cached.timestamp < CACHE_TTL) return cached.price;
  } catch {}
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd");
    const data = await res.json();
    const price = data?.stellar?.usd;
    if (price > 0) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ price, timestamp: Date.now() })); } catch {}
      return price;
    }
  } catch {}
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}").price ?? 0;
  } catch {
    return 0;
  }
}

export function usdBalanceOf(balances: any[], xlmUsd: number): number {
  let total = 0;
  for (const b of balances) {
    const code = b.asset_type === "native" ? "XLM" : b.asset_code;
    if (!code) continue;
    const rate = code === "XLM" ? xlmUsd : (USD_RATES[code] ?? 0);
    total += parseFloat(b.balance || "0") * rate;
  }
  return total;
}