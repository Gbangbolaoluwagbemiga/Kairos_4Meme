/**
 * Fund all 9 agent wallets from the treasury.
 *
 * Usage:
 *   cd kairos-backend
 *   npx tsx scripts/fund-agent-wallets.ts
 *
 * Required env:
 * - FOURMEME_TREASURY_PRIVATE_KEY
 * - FOURMEME_RPC_URL or FOURMEME_RPC_URLS
 * - ORACLE_EVM_ADDRESS, NEWS_EVM_ADDRESS, ... (9 total)
 *
 * Optional env:
 * - KAIROS_AGENT_TOPUP_BNB (default "0.01")
 */

import "../src/load-env.js";
import { ethers } from "ethers";
import { getChainProvider, loadFourmemeChainConfigFromEnv } from "../src/services/fourmeme-chain.js";

const AGENT_ADDR_ENVS = [
    "ORACLE_EVM_ADDRESS",
    "NEWS_EVM_ADDRESS",
    "YIELD_EVM_ADDRESS",
    "TOKENOMICS_EVM_ADDRESS",
    "PERP_EVM_ADDRESS",
    "CHAIN_SCOUT_EVM_ADDRESS",
    "PROTOCOL_EVM_ADDRESS",
    "BRIDGES_EVM_ADDRESS",
    "DEX_VOLUMES_EVM_ADDRESS",
] as const;

function mustEnv(name: string): string {
    const v = (process.env[name] || "").trim();
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

async function main() {
    const cfg = loadFourmemeChainConfigFromEnv();
    const { provider, rpcUrl } = await getChainProvider(cfg);

    const pk0x = cfg.treasuryPrivateKey.startsWith("0x") ? cfg.treasuryPrivateKey : `0x${cfg.treasuryPrivateKey}`;
    const wallet = new ethers.Wallet(pk0x, provider);
    const treasury = await wallet.getAddress();

    const amountBnb = (process.env.KAIROS_AGENT_TOPUP_BNB || "0.01").trim();
    const value = ethers.parseEther(amountBnb);

    console.log(`[FundAgents] chainId=${cfg.chainId} rpc=${rpcUrl}`);
    console.log(`[FundAgents] treasury=${treasury}`);
    console.log(`[FundAgents] topup=${amountBnb} BNB per agent`);

    // Basic balance check
    const bal = await provider.getBalance(treasury);
    console.log(`[FundAgents] treasury balance=${ethers.formatEther(bal)} BNB`);

    // Serialize sends to avoid nonce issues on RPCs
    for (const envName of AGENT_ADDR_ENVS) {
        const to = ethers.getAddress(mustEnv(envName));
        if (to.toLowerCase() === treasury.toLowerCase()) {
            console.log(`[FundAgents] skip ${envName} (same as treasury)`);
            continue;
        }

        console.log(`[FundAgents] sending ${amountBnb} BNB -> ${envName}=${to}`);
        const tx = await wallet.sendTransaction({ to, value });
        console.log(`[FundAgents] tx=${tx.hash}`);
        // 1 confirm is enough for demo funding
        await tx.wait(1);
    }

    console.log("[FundAgents] done");
}

main().catch((e) => {
    console.error("[FundAgents] failed:", (e as Error)?.message || e);
    process.exit(1);
});

