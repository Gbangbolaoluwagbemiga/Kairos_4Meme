/**
 * Generate deterministic EVM wallets for all 9 Kairos agents from the treasury private key.
 *
 * - Does NOT print private keys.
 * - Writes agent keys + addresses into kairos-backend/.env.
 * - Also writes a local JSON file (agent-wallets-evm.json) containing addresses only.
 *
 * Run:
 *   cd kairos-backend
 *   npx tsx scripts/generate-agent-evm-wallets.ts
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ENV_PATH = path.resolve(__dirname, "../.env");

const AGENTS = [
    "oracle",
    "news",
    "yield",
    "tokenomics",
    "perp",
    "chain-scout",
    "protocol",
    "bridges",
    "dex-volumes",
] as const;

const KEY_ENV_BY_AGENT: Record<(typeof AGENTS)[number], string> = {
    oracle: "ORACLE_EVM_PRIVATE_KEY",
    news: "NEWS_EVM_PRIVATE_KEY",
    yield: "YIELD_EVM_PRIVATE_KEY",
    tokenomics: "TOKENOMICS_EVM_PRIVATE_KEY",
    perp: "PERP_EVM_PRIVATE_KEY",
    "chain-scout": "CHAIN_SCOUT_EVM_PRIVATE_KEY",
    protocol: "PROTOCOL_EVM_PRIVATE_KEY",
    bridges: "BRIDGES_EVM_PRIVATE_KEY",
    "dex-volumes": "DEX_VOLUMES_EVM_PRIVATE_KEY",
};

const ADDR_ENV_BY_AGENT: Record<(typeof AGENTS)[number], string> = {
    oracle: "ORACLE_EVM_ADDRESS",
    news: "NEWS_EVM_ADDRESS",
    yield: "YIELD_EVM_ADDRESS",
    tokenomics: "TOKENOMICS_EVM_ADDRESS",
    perp: "PERP_EVM_ADDRESS",
    "chain-scout": "CHAIN_SCOUT_EVM_ADDRESS",
    protocol: "PROTOCOL_EVM_ADDRESS",
    bridges: "BRIDGES_EVM_ADDRESS",
    "dex-volumes": "DEX_VOLUMES_EVM_ADDRESS",
};

function mustGetEnv(name: string): string {
    const v = (process.env[name] || "").trim();
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

function normalizePk(pk: string): string {
    const raw = pk.trim();
    if (raw.startsWith("0x")) return raw;
    return `0x${raw}`;
}

function derivePrivateKey(basePk0x: string, label: string): string {
    const base = ethers.getBytes(basePk0x);
    const salt = ethers.toUtf8Bytes(`kairos-agent:${label}`);
    const digest = ethers.keccak256(ethers.concat([base, salt]));
    // Ensure non-zero key; if zero (astronomically unlikely), tweak label.
    if (BigInt(digest) === 0n) {
        const digest2 = ethers.keccak256(ethers.concat([base, ethers.toUtf8Bytes(`kairos-agent:${label}:1`)]));
        return digest2;
    }
    return digest;
}

function upsertEnvLines(existing: string, updates: Record<string, string>): string {
    const lines = existing.split(/\r?\n/);
    const seen = new Set<string>();
    const out: string[] = [];

    for (const line of lines) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) {
            out.push(line);
            continue;
        }
        const key = m[1];
        if (updates[key] !== undefined) {
            out.push(`${key}=${updates[key]}`);
            seen.add(key);
        } else {
            out.push(line);
        }
    }

    for (const [k, v] of Object.entries(updates)) {
        if (!seen.has(k)) out.push(`${k}=${v}`);
    }

    // Ensure trailing newline
    const joined = out.join("\n").replace(/\n{3,}/g, "\n\n");
    return joined.endsWith("\n") ? joined : `${joined}\n`;
}

async function main() {
    console.log("🔐 Kairos — deterministic EVM agent wallet generator");

    const treasuryPk = normalizePk(mustGetEnv("FOURMEME_TREASURY_PRIVATE_KEY"));
    const treasuryAddr = new ethers.Wallet(treasuryPk).address;
    console.log(`🏦 Treasury: ${treasuryAddr}`);

    const updates: Record<string, string> = {};
    const addressesOnly: Record<string, string> = {};

    for (const agent of AGENTS) {
        const pk = derivePrivateKey(treasuryPk, agent);
        const wallet = new ethers.Wallet(pk);

        updates[KEY_ENV_BY_AGENT[agent]] = pk;
        updates[ADDR_ENV_BY_AGENT[agent]] = wallet.address;
        addressesOnly[agent] = wallet.address;
    }

    const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
    const next = upsertEnvLines(existing, updates);
    fs.writeFileSync(ENV_PATH, next, "utf8");

    const outPath = path.resolve(__dirname, "../agent-wallets-evm.json");
    fs.writeFileSync(outPath, JSON.stringify({ treasury: treasuryAddr, agents: addressesOnly }, null, 2));

    console.log(`✅ Wrote agent keys + addresses into ${ENV_PATH}`);
    console.log(`📄 Wrote addresses-only file: ${outPath}`);
    console.log("ℹ️  (Private keys were NOT printed.)");
}

main().catch((e) => {
    console.error("Fatal:", (e as Error)?.message || e);
    process.exit(1);
});

