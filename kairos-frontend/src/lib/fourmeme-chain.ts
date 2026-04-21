export const FOURMEME_RPC_URL =
  import.meta.env.VITE_FOURMEME_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545";
export const FOURMEME_CHAIN_ID = Number(import.meta.env.VITE_FOURMEME_CHAIN_ID || 97);
export const FOURMEME_EXPLORER_BASE =
  import.meta.env.VITE_FOURMEME_EXPLORER_BASE || "https://testnet.bscscan.com";

export const KAIROS_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const txUrl = (hash: string) => `${FOURMEME_EXPLORER_BASE.replace(/\/$/, "")}/tx/${hash}`;
export const addressUrl = (addr: string) => `${FOURMEME_EXPLORER_BASE.replace(/\/$/, "")}/address/${addr}`;

