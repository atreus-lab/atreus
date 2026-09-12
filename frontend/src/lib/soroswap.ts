/**
 * frontend/src/lib/soroswap.ts
 *
 * Soroswap DEX routing, quote computation, and Soroban XDR formatting utilities.
 * Supports querying the Soroswap Router API with offline estimation fallbacks
 * and helpers for building `claim_and_swap_link` contract invocations.
 */

import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export interface TokenInfo {
  symbol: string;
  name: string;
  contractId: string;
  decimals: number;
  iconBg?: string;
  issuer?: string | null;
}

export interface SwapQuote {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  expectedAmountOut: string;
  minAmountOut: string;
  minAmountOutStroops: bigint;
  path: string[];
  slippageTolerancePct: number;
  executionRate: number;
  routeType: "direct" | "multi-hop";
}

// Known testnet contract IDs for standard assets
export const TESTNET_TOKENS: Record<string, TokenInfo> = {
  XLM: {
    symbol: "XLM",
    name: "Stellar Lumens",
    contractId: process.env.NEXT_PUBLIC_TOKEN_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    decimals: 7,
    iconBg: "bg-slate-900 text-white",
    issuer: null,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    contractId: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "CAQCEES2X65F2MHPBH67R3OOHAZH63K7SUF4WTH7CK7C4EVGNTOG3USDC",
    decimals: 7,
    iconBg: "bg-blue-600 text-white",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  },
  EURT: {
    symbol: "EURT",
    name: "Euro Tether",
    contractId: process.env.NEXT_PUBLIC_EURT_CONTRACT_ID || "CBIWPTY67G3Y6Y7Z3V7B65Q3W2YTXG52U6V3X5G4H4Y6Z7B8EURTTEST",
    decimals: 7,
    iconBg: "bg-emerald-600 text-white",
    issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U",
  },
};

/** Default Soroswap Router contract address on testnet */
export const DEFAULT_SOROSWAP_ROUTER =
  process.env.NEXT_PUBLIC_SOROSWAP_ROUTER ||
  "CA4HEQ56O6U4U2G6Y77PX7G45I27G3Z2Y5X2Z77P4Q7QY3Z5X4G5ROUTER";

/**
 * Returns the configured or default Soroswap Router address.
 */
export function getSoroswapRouterAddress(): string {
  return process.env.NEXT_PUBLIC_SOROSWAP_ROUTER || DEFAULT_SOROSWAP_ROUTER;
}

/**
 * Approximate exchange rates relative to USD / base for testnet quoting fallback.
 */
const BASE_RATES: Record<string, number> = {
  XLM: 0.12,
  USDC: 1.0,
  EURT: 1.08,
};

/**
 * Converts decimal amount string to stroops (7 decimals for Stellar / Soroban SAC).
 */
export function amountToStroops(amount: string | number): bigint {
  const str = typeof amount === "number" ? amount.toFixed(7) : amount.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(str)) {
    throw new Error("Invalid amount: use up to 7 decimal places");
  }
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = frac.padEnd(7, "0");
  return BigInt(whole) * BigInt(10_000_000) + BigInt(paddedFrac || "0");
}

/**
 * Converts stroops BigInt to decimal string formatted with up to 7 decimal places.
 */
export function stroopsToAmount(stroops: bigint): string {
  const str = stroops.toString().padStart(8, "0");
  const whole = str.slice(0, -7) || "0";
  const frac = str.slice(-7).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/**
 * Resolves a token symbol or address to its canonical contract ID.
 */
export function resolveTokenAddress(tokenOrSymbol: string): string {
  const upper = tokenOrSymbol.toUpperCase();
  if (TESTNET_TOKENS[upper]) {
    return TESTNET_TOKENS[upper].contractId;
  }
  return tokenOrSymbol;
}

/**
 * Resolves contract ID or symbol to display symbol.
 */
export function resolveTokenSymbol(addressOrSymbol: string): string {
  for (const token of Object.values(TESTNET_TOKENS)) {
    if (token.contractId === addressOrSymbol || token.symbol.toUpperCase() === addressOrSymbol.toUpperCase()) {
      return token.symbol;
    }
  }
  if (addressOrSymbol.startsWith("C") && addressOrSymbol.length === 56) {
    return `${addressOrSymbol.slice(0, 4)}...${addressOrSymbol.slice(-4)}`;
  }
  return addressOrSymbol;
}

/**
 * Fetch optimal swap path and expected output amount via Soroswap API
 * with automatic fallback estimation.
 */
export async function fetchOptimalSwapPath(
  assetIn: string,
  assetOut: string,
  amountIn: string,
  slippageTolerancePct = 1.0
): Promise<SwapQuote> {
  const tokenInAddr = resolveTokenAddress(assetIn);
  const tokenOutAddr = resolveTokenAddress(assetOut);
  const numAmountIn = parseFloat(amountIn);

  if (isNaN(numAmountIn) || numAmountIn <= 0) {
    throw new Error("Invalid amount for swap quote");
  }

  // Same token: no swap needed (1:1 direct path)
  if (tokenInAddr.toLowerCase() === tokenOutAddr.toLowerCase()) {
    const stroops = amountToStroops(amountIn);
    return {
      assetIn: tokenInAddr,
      assetOut: tokenOutAddr,
      amountIn,
      expectedAmountOut: amountIn,
      minAmountOut: amountIn,
      minAmountOutStroops: stroops,
      path: [tokenInAddr],
      slippageTolerancePct: 0,
      executionRate: 1.0,
      routeType: "direct",
    };
  }

  const routerApiUrl = process.env.NEXT_PUBLIC_SOROSWAP_ROUTER_API;

  if (routerApiUrl) {
    try {
      const endpoint = `${routerApiUrl.replace(/\/$/, "")}/quote?tokenIn=${encodeURIComponent(
        tokenInAddr
      )}&tokenOut=${encodeURIComponent(tokenOutAddr)}&amountIn=${encodeURIComponent(amountIn)}`;

      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const expectedAmountOut = String(data.amountOut || data.expectedAmountOut);
        const path: string[] = Array.isArray(data.path) && data.path.length >= 2 ? data.path : [tokenInAddr, tokenOutAddr];
        const numOut = parseFloat(expectedAmountOut);
        const minOutNum = numOut * (1 - slippageTolerancePct / 100);
        const minAmountOut = minOutNum.toFixed(7).replace(/\.?0+$/, "");
        const minAmountOutStroops = amountToStroops(minAmountOut);

        return {
          assetIn: tokenInAddr,
          assetOut: tokenOutAddr,
          amountIn,
          expectedAmountOut,
          minAmountOut,
          minAmountOutStroops,
          path,
          slippageTolerancePct,
          executionRate: numOut / numAmountIn,
          routeType: path.length > 2 ? "multi-hop" : "direct",
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback / mock route calculation
  const symbolIn = resolveTokenSymbol(assetIn);
  const symbolOut = resolveTokenSymbol(assetOut);
  const rateIn = BASE_RATES[symbolIn] || 1.0;
  const rateOut = BASE_RATES[symbolOut] || 1.0;
  const executionRate = rateIn / rateOut;

  const expectedAmountOutNum = numAmountIn * executionRate;
  const expectedAmountOut = expectedAmountOutNum.toFixed(7).replace(/\.?0+$/, "");
  const minAmountOutNum = expectedAmountOutNum * (1 - slippageTolerancePct / 100);
  const minAmountOut = minAmountOutNum.toFixed(7).replace(/\.?0+$/, "");
  const minAmountOutStroops = amountToStroops(minAmountOut);

  return {
    assetIn: tokenInAddr,
    assetOut: tokenOutAddr,
    amountIn,
    expectedAmountOut,
    minAmountOut,
    minAmountOutStroops,
    path: [tokenInAddr, tokenOutAddr],
    slippageTolerancePct,
    executionRate,
    routeType: "direct",
  };
}

/**
 * Formats a path array of string addresses into an ScVal Vec of Address ScVals.
 */
export function buildPathScVal(path: string[]): xdr.ScVal {
  const addressScVals = path.map((addr) => new Address(addr).toScVal());
  return xdr.ScVal.scvVec(addressScVals);
}

/**
 * Returns deadline timestamp as a u64 ScVal (default 5 minutes from now).
 */
export function buildDeadlineScVal(minutesFromNow = 5): xdr.ScVal {
  const deadlineSec = BigInt(Math.floor(Date.now() / 1000) + minutesFromNow * 60);
  return nativeToScVal(deadlineSec, { type: "u64" });
}
