import { ethers } from "ethers";

export type FourmemeChainConfig = {
    /** Preferred RPC URL (may be selected from a list). */
    rpcUrl: string;
    /** Optional list of fallback RPC URLs. */
    rpcUrls?: string[];
    chainId?: number;
    treasuryPrivateKey: string;
};

export type FourmemeSpendPolicyConfig = {
    spendingPolicyAddress?: string; // optional
};

const SPENDING_POLICY_ABI = [
    "function canSpend(bytes32 agentKey,uint256 amountWei) view returns (bool)",
    "function remaining(bytes32 agentKey) view returns (uint256)",
    "function recordSpend(bytes32 agentKey,uint256 amountWei)",
];

function mustGetEnv(name: string): string {
    const v = (process.env[name] || "").trim();
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

function getOptionalEnv(name: string): string | undefined {
    const v = (process.env[name] || "").trim();
    return v ? v : undefined;
}

function firstValue(...names: string[]): string | undefined {
    for (const n of names) {
        const v = getOptionalEnv(n);
        if (v) return v;
    }
    return undefined;
}

function parseRpcUrlsFromEnv(): string[] {
    const rawList = firstValue("FOURMEME_RPC_URLS", "BSC_RPC_URLS");
    const rawSingle = firstValue("FOURMEME_RPC_URL", "BSC_RPC_URL");
    const list = (rawList || rawSingle || "https://data-seed-prebsc-1-s1.binance.org:8545")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    // De-dupe while preserving order
    return Array.from(new Set(list));
}

export function loadFourmemeChainConfigFromEnv(): FourmemeChainConfig {
    const rpcUrls = parseRpcUrlsFromEnv();
    const rpcUrl = rpcUrls[0] || "https://data-seed-prebsc-1-s1.binance.org:8545";
    const chainIdRaw = firstValue("FOURMEME_CHAIN_ID", "BSC_CHAIN_ID");
    const chainId = chainIdRaw ? Number(chainIdRaw) : 97;

    const treasuryPrivateKey =
        getOptionalEnv("FOURMEME_TREASURY_PRIVATE_KEY") ??
        getOptionalEnv("BSC_TREASURY_PRIVATE_KEY") ??
        (() => {
            // Keep error message stable and clear
            throw new Error("FOURMEME_TREASURY_PRIVATE_KEY is not set");
        })();

    return {
        rpcUrl,
        rpcUrls,
        chainId,
        treasuryPrivateKey,
    };
}

export function fourmemeProvider(cfg: FourmemeChainConfig): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(cfg.rpcUrl, cfg.chainId);
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let t: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new Error(label)), timeoutMs);
    });
    try {
        return await Promise.race([p, timeout]);
    } finally {
        if (t) clearTimeout(t);
    }
}

/**
 * Pick the first healthy RPC from cfg.rpcUrls (or cfg.rpcUrl).
 * This avoids demo-killing RPC outages without changing the rest of the code.
 */
export async function pickHealthyRpc(cfg: FourmemeChainConfig): Promise<{ rpcUrl: string; provider: ethers.JsonRpcProvider }> {
    const urls = (cfg.rpcUrls && cfg.rpcUrls.length > 0 ? cfg.rpcUrls : [cfg.rpcUrl]).filter(Boolean);
    const timeoutMs = Math.max(
        1500,
        Number(firstValue("FOURMEME_RPC_TIMEOUT_MS", "BSC_RPC_TIMEOUT_MS") || "5000") || 5000
    );
    let lastErr: unknown = null;
    for (const url of urls) {
        const provider = new ethers.JsonRpcProvider(url, cfg.chainId);
        try {
            // getBlockNumber is a cheap liveness signal; also indirectly validates chain/rpc.
            await withTimeout(provider.getBlockNumber(), timeoutMs, `RPC timeout (${timeoutMs}ms) for ${url}`);
            return { rpcUrl: url, provider };
        } catch (e) {
            lastErr = e;
        }
    }
    throw new Error(
        `No healthy RPC available. Tried: ${urls.join(", ")}. Last error: ${String((lastErr as any)?.message || lastErr || "")}`
    );
}

let cachedHealthy: { rpcUrl: string; provider: ethers.JsonRpcProvider } | null = null;
let cachedAtMs = 0;

/**
 * Cached provider with automatic RPC failover.
 * Cache TTL keeps requests fast while still recovering if an RPC dies.
 */
export async function getChainProvider(cfg: FourmemeChainConfig): Promise<{ rpcUrl: string; provider: ethers.JsonRpcProvider }> {
    const ttlMs = Math.max(
        1000,
        Number(firstValue("FOURMEME_RPC_CACHE_TTL_MS", "BSC_RPC_CACHE_TTL_MS") || "30000") || 30000
    );
    const now = Date.now();
    if (cachedHealthy && now - cachedAtMs < ttlMs) return cachedHealthy;
    const picked = await pickHealthyRpc(cfg);
    cachedHealthy = picked;
    cachedAtMs = now;
    // Keep cfg.rpcUrl in sync for older call sites that stringify cfg.rpcUrl for logging.
    cfg.rpcUrl = picked.rpcUrl;
    return picked;
}

/**
 * Sends a native BNB transfer (treasury -> agent) and returns the tx hash.
 * Uses serialized callers upstream to avoid nonce races.
 */
export async function sendTreasuryPayment(args: {
    cfg: FourmemeChainConfig;
    to: string;
    amountWei: bigint;
    agentKey: string;
    label: string;
    spendingPolicy?: FourmemeSpendPolicyConfig;
}): Promise<string> {
    const { provider } = await getChainProvider(args.cfg);
    const wallet = new ethers.Wallet(args.cfg.treasuryPrivateKey, provider);

    /** When `1`, any canSpend revert or `false` blocks the payout. Default `0`: revert → pay anyway (demo / ABI mismatch). */
    const policyStrict = (process.env.KAIROS_SPENDING_POLICY_STRICT || "0").trim() === "1";

    // Optional: enforce spending policy (trusted backend records spends)
    let skipPolicy = false;
    if (args.spendingPolicy?.spendingPolicyAddress) {
        const policy = new ethers.Contract(args.spendingPolicy.spendingPolicyAddress, SPENDING_POLICY_ABI, wallet);
        const key = ethers.keccak256(ethers.toUtf8Bytes(args.agentKey));
        let ok = false;
        try {
            ok = await policy.canSpend(key, args.amountWei);
        } catch (e: any) {
            const msg = String(e?.message || e || "");
            if (policyStrict) {
                throw new Error(
                    `Spending policy canSpend() reverted for agent "${args.agentKey}" at ${args.spendingPolicy.spendingPolicyAddress}. ` +
                        `Set KAIROS_SPENDING_POLICY_STRICT=0 to allow treasury payout without this check, or fix the policy ABI / deployment. ` +
                        `Underlying: ${msg}`
                );
            }
            skipPolicy = true;
            console.warn(
                `[Four.meme Sprint] canSpend reverted for ${args.agentKey} (${args.label}) — paying WITHOUT policy gate (KAIROS_SPENDING_POLICY_STRICT=0). ` +
                    `Set KAIROS_SPENDING_POLICY_STRICT=1 to hard-fail. ${msg.slice(0, 200)}`
            );
        }
        if (!skipPolicy && !ok) {
            let rem = 0n;
            try {
                rem = await policy.remaining(key);
            } catch {
                // ignore — remaining() may not exist on all policy deployments
            }
            throw new Error(
                `Spending policy blocked ${args.agentKey}: remaining=${ethers.formatEther(rem)} BNB, requested=${ethers.formatEther(args.amountWei)} BNB`
            );
        }
    }

    const waitConfirms = Math.max(0, Math.min(12, Number(process.env.KAIROS_TREASURY_TX_WAIT_CONFIRMS ?? "1") || 0));
    const waitTimeoutMs = Math.max(5000, Number(process.env.KAIROS_TX_WAIT_TIMEOUT_MS ?? "180000") || 180000);

    // Put label into tx metadata only via logs off-chain; native transfers can't carry memo.
    const tx = await wallet.sendTransaction({
        to: args.to,
        value: args.amountWei,
    });

    // Wait until the payout is mined before releasing the treasury queue; otherwise the next
    // payout can reuse a nonce that is still pending → "replacement fee too low" on some RPCs.
    if (waitConfirms > 0) {
        await tx.wait(waitConfirms, waitTimeoutMs);
    }

    // Record spend after the transfer is settled (best-effort; do not fail the payment if this fails)
    if (args.spendingPolicy?.spendingPolicyAddress && !skipPolicy) {
        try {
            const policy = new ethers.Contract(args.spendingPolicy.spendingPolicyAddress, SPENDING_POLICY_ABI, wallet);
            const key = ethers.keccak256(ethers.toUtf8Bytes(args.agentKey));
            const rec = await policy.recordSpend(key, args.amountWei);
            if (waitConfirms > 0) {
                await rec.wait(waitConfirms, waitTimeoutMs);
            } else {
                void rec.wait().catch(() => {});
            }
        } catch (e) {
            // non-fatal
            console.warn(`[Four.meme Sprint] recordSpend failed for ${args.agentKey} (${args.label}):`, (e as Error)?.message);
        }
    }

    return tx.hash;
}

/**
 * Optional "true A2A" transfer: agent wallet pays another agent wallet.
 * If you don't provide the agent private key, caller should skip A2A.
 */
export async function sendAgentToAgentPayment(args: {
    rpcUrl: string;
    chainId?: number;
    fromPrivateKey: string;
    to: string;
    amountWei: bigint;
}): Promise<string> {
    // Allow a comma-separated rpcUrl list for A2A too (keeps agents from failing when a single RPC flakes).
    const urls = String(args.rpcUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
    const rpcUrl = urls[0] || "https://data-seed-prebsc-1-s1.binance.org:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl, args.chainId ?? 97);
    const wallet = new ethers.Wallet(args.fromPrivateKey, provider);
    const tx = await wallet.sendTransaction({ to: args.to, value: args.amountWei });
    const waitConfirms = Math.max(0, Math.min(12, Number(process.env.KAIROS_A2A_TX_WAIT_CONFIRMS ?? "1") || 0));
    const waitTimeoutMs = Math.max(5000, Number(process.env.KAIROS_TX_WAIT_TIMEOUT_MS ?? "180000") || 180000);
    if (waitConfirms > 0) {
        await tx.wait(waitConfirms, waitTimeoutMs);
    }
    return tx.hash;
}

