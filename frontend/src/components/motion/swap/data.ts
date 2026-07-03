import type { Chain, Token } from "./types";

export const CHAINS: Chain[] = [
  { id: "stellar", name: "Stellar", tone: "bg-black text-white border border-white/20", symbol: "S" },
];

export const TOKENS: Token[] = [
  {
    id: "stellar-xlm",
    symbol: "XLM",
    name: "Lumen",
    chainId: "stellar",
    balance: 852.4,
    usd: 0.12,
    popular: true,
  },
  {
    id: "stellar-usdc",
    symbol: "USDC",
    name: "USD Coin",
    chainId: "stellar",
    balance: 452.1,
    usd: 1.0,
    popular: true,
  },
];
