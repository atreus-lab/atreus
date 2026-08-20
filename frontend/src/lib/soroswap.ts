import { Asset } from "@stellar/stellar-sdk";
import { server, networkPassphrase, xlmToStroops } from "./stellar";

export interface TokenInfo {
  code: string;
  name: string;
  issuer: string | null;
  contractId: string;
  decimals: number;
  icon?: string;
}

export interface SwapPathResult {
  path: string[];
  pathSymbols: string[];
  expectedAmountOut: string;
  minAmountOut: string;
  minAmountOutStroops: bigint;
  slippageTolerance: number;
  rate: string;
  priceImpact?: string;
  routerAddress: string;
  sourceToken: TokenInfo;
  destToken: TokenInfo;
}

export const DEFAULT_SOROSWAP_ROUTER_CONTRACT_ID =
  "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD";

export const TESTNET_TOKENS: Record<string, TokenInfo> = {
  XLM: {
    code: "XLM",
    name: "Stellar Lumens",
    issuer: null,
    contractId:
      process.env.NEXT_PUBLIC_TOKEN_ID ||
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    decimals: 7,
  },
  USDC: {
    code: "USDC",
    name: "USD Coin",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    decimals: 7,
  },
  EURC: {
    code: "EURC",
    name: "Euro Coin",
    issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U",
    contractId: "CD6EGFF4IVTCYCSXC4QGOWMRVU7HQ2N3YZXFM2ZAVK2TDLKCYF2LQTLR",
    decimals: 7,
  },
  EURT: {
    code: "EURT",
    name: "Euro Tether",
    issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U",
    contractId: "CB5FUWRCMKGEVTI5XFCSLWNY2H3VPEWTK7CGR52ITAZMB4557M6XFJSH",
    decimals: 7,
  },
};

export const SUPPORTED_CLAIM_TOKENS: TokenInfo[] = [
  TESTNET_TOKENS.XLM,
  TESTNET_TOKENS.USDC,
  TESTNET_TOKENS.EURC,
];

export function getSoroswapRouterContractId(): string {
  return (
    process.env.NEXT_PUBLIC_SOROSWAP_ROUTER_CONTRACT_ID ||
    DEFAULT_SOROSWAP_ROUTER_CONTRACT_ID
  );
}

export function resolveToken(tokenOrCodeOrContract: string): TokenInfo {
  const upper = tokenOrCodeOrContract.toUpperCase().trim();
  if (TESTNET_TOKENS[upper]) {
    return TESTNET_TOKENS[upper];
  }

  const byContract = Object.values(TESTNET_TOKENS).find(
    (t) => t.contractId.toLowerCase() === tokenOrCodeOrContract.toLowerCase()
  );
  if (byContract) return byContract;

  if (tokenOrCodeOrContract.startsWith("C") && tokenOrCodeOrContract.length === 56) {
    return {
      code: "CUSTOM",
      name: "Custom Token",
      issuer: null,
      contractId: tokenOrCodeOrContract,
      decimals: 7,
    };
  }

  return TESTNET_TOKENS.XLM;
}

export function tokenToAsset(token: TokenInfo): Asset {
  if (!token.issuer || token.code === "XLM") {
    return Asset.native();
  }
  return new Asset(token.code, token.issuer);
}

const REFERENCE_RATES: Record<string, Record<string, number>> = {
  XLM: { USDC: 0.125, EURC: 0.115, EURT: 0.115, XLM: 1 },
  USDC: { XLM: 8.0, EURC: 0.92, EURT: 0.92, USDC: 1 },
  EURC: { XLM: 8.69, USDC: 1.087, EURT: 1.0, EURC: 1 },
  EURT: { XLM: 8.69, USDC: 1.087, EURC: 1.0, EURT: 1 },
};

export async function queryHorizonSwapPath(
  sourceAsset: Asset,
  destAsset: Asset,
  amountIn: string
): Promise<{ path: Asset[]; destinationAmount: string } | null> {
  try {
    const result = await server
      .strictSendPaths(sourceAsset, amountIn, [destAsset])
      .call();
    if (result.records && result.records.length > 0) {
      const best = result.records[0];
      const path = (best.path || []).map((a: { asset_code?: string; asset_issuer?: string }) =>
        !a.asset_code || !a.asset_issuer || a.asset_code === "XLM"
          ? Asset.native()
          : new Asset(a.asset_code, a.asset_issuer)
      );
      return {
        path,
        destinationAmount: best.destination_amount,
      };
    }
    return null;
  } catch (err) {
    console.warn("Horizon strictSendPaths query failed, using reference rate:", err);
    return null;
  }
}

export async function querySoroswapQuote(
  tokenInContract: string,
  tokenOutContract: string,
  amountIn: string
): Promise<{ amountOut: string; path?: string[] } | null> {
  try {
    const res = await fetch(
      `https://api.soroswap.finance/api/quote?tokenIn=${encodeURIComponent(
        tokenInContract
      )}&tokenOut=${encodeURIComponent(tokenOutContract)}&amountIn=${encodeURIComponent(
        amountIn
      )}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.amountOut) {
      return {
        amountOut: data.amountOut,
        path: data.path,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSwapPath(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippageTolerance: number = 0.5
): Promise<SwapPathResult> {
  const sourceToken = resolveToken(tokenIn);
  const destToken = resolveToken(tokenOut);
  const routerAddress = getSoroswapRouterContractId();

  const numAmountIn = parseFloat(amountIn) || 0;

  if (
    sourceToken.contractId === destToken.contractId ||
    (sourceToken.code === destToken.code && sourceToken.code === "XLM")
  ) {
    const stroops = xlmToStroops(amountIn.trim() || "0");
    return {
      path: [sourceToken.contractId],
      pathSymbols: [sourceToken.code],
      expectedAmountOut: amountIn,
      minAmountOut: amountIn,
      minAmountOutStroops: stroops,
      slippageTolerance: 0,
      rate: "1.0",
      routerAddress,
      sourceToken,
      destToken,
    };
  }

  const sourceAsset = tokenToAsset(sourceToken);
  const destAsset = tokenToAsset(destToken);

  let expectedAmountOut = "0";
  let intermediateContracts: string[] = [];

  // 1. Try Soroswap API quote first
  const soroswapQuote = await querySoroswapQuote(
    sourceToken.contractId,
    destToken.contractId,
    amountIn
  );
  if (soroswapQuote && parseFloat(soroswapQuote.amountOut) > 0) {
    expectedAmountOut = soroswapQuote.amountOut;
    if (soroswapQuote.path && soroswapQuote.path.length > 2) {
      intermediateContracts = soroswapQuote.path.slice(1, -1);
    }
  }

  // 2. Fallback to Horizon strict send paths
  if (parseFloat(expectedAmountOut) <= 0 && numAmountIn > 0) {
    const horizonResult = await queryHorizonSwapPath(sourceAsset, destAsset, amountIn);
    if (horizonResult && parseFloat(horizonResult.destinationAmount) > 0) {
      expectedAmountOut = horizonResult.destinationAmount;
      intermediateContracts = horizonResult.path.map((asset) =>
        asset.contractId(networkPassphrase)
      );
    }
  }

  // 3. Fallback to reference price estimate
  if (parseFloat(expectedAmountOut) <= 0 && numAmountIn > 0) {
    const refRate =
      REFERENCE_RATES[sourceToken.code]?.[destToken.code] ||
      (1 / (REFERENCE_RATES[destToken.code]?.[sourceToken.code] || 1));
    const estimated = numAmountIn * refRate;
    expectedAmountOut = estimated.toFixed(7);
  }

  // Construct complete contract path [tokenIn, ...intermediates, tokenOut]
  const path: string[] = [sourceToken.contractId];
  const pathSymbols: string[] = [sourceToken.code];

  for (const intermediateId of intermediateContracts) {
    if (
      intermediateId !== sourceToken.contractId &&
      intermediateId !== destToken.contractId &&
      !path.includes(intermediateId)
    ) {
      path.push(intermediateId);
      const tokenInfo = resolveToken(intermediateId);
      pathSymbols.push(tokenInfo.code);
    }
  }

  path.push(destToken.contractId);
  pathSymbols.push(destToken.code);

  const numExpectedOut = parseFloat(expectedAmountOut) || 0;
  const slippageFactor = Math.max(0, 1 - slippageTolerance / 100);
  const minAmountOutNum = numExpectedOut * slippageFactor;
  const minAmountOut = minAmountOutNum.toFixed(7);
  const minAmountOutStroops = BigInt(Math.floor(minAmountOutNum * 10_000_000));

  const rate =
    numAmountIn > 0 ? (numExpectedOut / numAmountIn).toFixed(6) : "0";

  return {
    path,
    pathSymbols,
    expectedAmountOut,
    minAmountOut,
    minAmountOutStroops,
    slippageTolerance,
    rate,
    routerAddress,
    sourceToken,
    destToken,
  };
}
