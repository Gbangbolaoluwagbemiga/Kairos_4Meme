# Agent Payments (Four.meme AI Sprint / EVM)

This document explains how AI agents can pay each other and receive payments on-chain for the Four.meme AI Sprint build (EVM).

---

## The “machines pay machines” vision

The vision: machines paying machines for API access, compute, data, and services — with receipts anchored on-chain.

### Why native payments (EVM)?
- **EVM compatibility** — standard tooling (RPC, wallets, explorers)
- **Auditable receipts** — tx hashes can be verified on-chain
- **Simple value transfer** — native BNB via transaction `value`

---

## Agent Wallet Architecture

Each Kairos agent has its own EVM wallet:

```
Agent: Price Oracle
Address: 0x…
Balance: X BNB
```

### Wallet Requirements
1. **Funded account** — enough BNB for value transfers and gas
2. **Secret key** — stored securely in environment variables / secret manager

### Creating Agent Wallets
```bash
npx tsx scripts/generate-agent-evm-wallets.ts
```

This script:
1. Deterministically derives 9 agent wallets from a treasury seed (for reproducible hackathon deploys)
2. Writes `.env` lines and `agent-wallets-evm.json`

---

## Payment Flow: Treasury → Agent

When a user asks a question:

1. **Query arrives** at `/query` endpoint
2. **Orchestrator routes** to specialist agents
3. **Agent executes** tool (fetches data)
4. **Treasury pays agent** in native BNB via an EVM value transfer
5. **Response returns** with tx hash embedded

```
┌─────────┐    Query     ┌──────────────┐    Tool Call    ┌─────────────┐
│  User   │ ──────────▶  │ Orchestrator │ ──────────────▶ │ Price Oracle│
└─────────┘              └──────────────┘                 └─────────────┘
                               │                                │
                               │ Payment (BNB)                  │ Data
                               ▼                                ▼
                         ┌──────────┐                    ┌──────────────┐
                         │ Treasury │ ──────────────────▶│ Agent Wallet │
                         └──────────┘                    └──────────────┘
```

### Transaction Structure
```
Transaction:
  From: Treasury (0x…)
  To: Agent (0x…)
  Value: <priceWei>
  Chain: BNB testnet (chainId 97)
```

---

## Agent-to-Agent (A2A) Payments

When multiple agents collaborate, the **primary agent pays sub-agents**:

### Orchestration Priority
Agents are ranked to determine who pays whom:
1. Price Oracle (highest — data backbone)
2. Protocol Stats
3. Bridge Monitor
4. DEX Volumes
5. Chain Scout
6. Perp Stats
7. Tokenomics
8. Yield Optimizer
9. News Scout (always a sub-agent)

### A2A Payment Flow
```
┌──────────────┐                ┌─────────────┐
│ Primary Agent│ ─── BNB tx ──▶│ Sub-agent    │
└──────────────┘                └─────────────┘
```

### A2A Notes
- A2A payments are signed by the sending agent wallet.
- Spending limits can be enforced by the Spending Policy contract (optional).

---

## Payment Timing & Receipts

### Synchronous vs Asynchronous
- **Fast path** — Payment settles in ~3s, tx hash included in response
- **Slow path** — Payment takes longer, response returns first
- **Background completion** — Payment completes, receipt available via polling

### Polling Receipts
```
GET /receipts/:requestId
Response: { "oracle": "abc123...", "news": "def456..." }
```

### UI Integration
- Payment badges show immediately if tx hash is available
- If pending, badge shows "Confirming..."
- Click badge → Opens the explorer transaction page

---

## Spending Policies

The **Spending Policy** EVM contract demonstrates programmatic constraints:

### Use Cases
- **Daily limits** — Max BNB/day for A2A payments
- **Rate limiting** — Prevent runaway agent costs
- **Budget caps** — Hard stop on agent spending
- **Approval workflows** — Multi-sig for large payments

### Contract Interface
Exposed as `canSpend(...)` + `recordSpend(...)` in `SpendingPolicy.sol`.

### Integration Pattern
```typescript
// Before A2A payment
const canSpend = await spendingPolicy.canSpend(agentAddress, amount);
if (!canSpend) {
  console.log("Daily limit exceeded, skipping A2A");
  return;
}

// After successful payment
await spendingPolicy.recordSpend(agentAddress, amount);
```

---

## Machine Payments (Principles)

Kairos aligns with machine-payment principles for autonomous machine commerce:

### MPP Principles
1. **Pay-per-use** — Granular billing for API calls, compute, data
2. **Autonomous wallets** — Machines hold and manage their own funds
3. **Spending policies** — Programmable constraints via smart contracts
4. **Streaming payments** — Continuous payment flows (future)
5. **Interoperability** — Cross-chain and cross-protocol payments

### Kairos MPP Implementation
| Principle | Implementation |
|-----------|----------------|
| Pay-per-use | Per-agent on-chain settlement |
| Autonomous wallets | 9 agents with funded EVM accounts |
| Spending policies | EVM contract with daily limits |
| Interoperability | EVM ecosystem tooling |

---

## Security Considerations

### Key Management
- Agent secrets stored in environment variables
- Never commit `.env` or `agent-wallets.json`
- Use secret managers in production (Vault, AWS Secrets)

### Treasury Security
- Treasury holds bulk funds, should be multi-sig in production
- Rate limit treasury operations

### Payment Validation
- Verify agent addresses before payment
- Implement retry with backoff

### A2A Trust
- Only pay registered agents
- Verify agent is in the on-chain registry
- Log all A2A payments for audit
