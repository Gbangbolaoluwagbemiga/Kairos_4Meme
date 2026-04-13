# Crypto & DeFi Glossary

Quick reference for common terms the agents may need to explain.

---

## DeFi Fundamentals

### TVL (Total Value Locked)
The total value of assets deposited in a DeFi protocol. Higher TVL generally indicates more trust and liquidity.

### APY (Annual Percentage Yield)
The annualized return including compound interest. A 10% APY means $100 becomes $110 after one year of compounding.

### APR (Annual Percentage Rate)
Simple interest rate without compounding. APY > APR when compounding is frequent.

### Impermanent Loss (IL)
Loss experienced by liquidity providers when asset prices diverge. Called "impermanent" because it reverses if prices return to original ratio.

### Slippage
The difference between expected and executed price. Higher for large trades in low-liquidity pools.

### Liquidity Mining
Earning tokens for providing liquidity. Often used to bootstrap new protocols.

---

## Lending & Borrowing

### Collateral
Assets deposited to secure a loan. Overcollateralization (e.g., 150%) protects lenders.

### Liquidation
Forced sale of collateral when loan health ratio drops below threshold.

### Health Factor
Ratio of collateral value to borrowed value. Below 1.0 triggers liquidation.

### Utilization Rate
Percentage of deposited assets currently borrowed. Higher utilization = higher interest rates.

### Flash Loan
Uncollateralized loan that must be repaid in the same transaction. Used for arbitrage, liquidations.

---

## DEX Concepts

### AMM (Automated Market Maker)
Algorithm that prices assets using a formula (e.g., x*y=k). No order book needed.

### Order Book
Traditional exchange model where buyers and sellers post limit orders.

### Liquidity Pool
Smart contract holding paired assets. LPs earn fees when traders swap.

### Price Impact
How much a trade moves the market price. Larger trades = higher impact in AMMs.

### MEV (Maximal Extractable Value)
Profit extracted by reordering transactions (or manipulating inclusion). Common discussion point on EVM chains.

---

## Yield Strategies

### Staking
Locking tokens to secure a network or protocol. Earn rewards in native tokens.

### Liquid Staking
Staking while receiving a liquid derivative (e.g., stETH for ETH). Can use in DeFi while staked.

### Yield Aggregator
Protocol that auto-compounds and optimizes yield strategies (e.g., Yearn, Beefy).

### Delta-Neutral
Strategy where long and short positions cancel out price exposure. Earn yield without directional risk.

### Funding Rate Arbitrage
Capturing funding payments on perpetual futures while hedging spot. Popular yield source.

---

## Perpetual Futures

### Perpetual Swap (Perp)
Futures contract with no expiration. Price tracks spot via funding rate mechanism.

### Funding Rate
Periodic payment between long and short holders. Positive = longs pay shorts. Keeps perp price near spot.

### Open Interest (OI)
Total value of outstanding contracts. High OI = high market participation.

### Leverage
Trading with borrowed funds. 10x leverage = 10% move causes 100% gain/loss.

### Liquidation Price
Price at which position is force-closed. Closer with higher leverage.

---

## Tokenomics

### Circulating Supply
Tokens currently tradeable on the market.

### Total Supply
All tokens that exist (including locked/vested).

### Max Supply
Hard cap on tokens that will ever exist (e.g., Bitcoin's 21M).

### Vesting
Gradual release of tokens over time. Prevents immediate selling by insiders.

### Token Unlock
Event where vested tokens become liquid. Can cause sell pressure.

### Inflation Rate
Annual increase in token supply. Funds staking rewards, ecosystem grants.

---

## EVM / Sprint Demo Terms

### EOA (Externally Owned Account)
An account controlled by a private key (a wallet address). Sends transactions and pays gas.

### Contract Account
An address with deployed bytecode. It can hold funds and execute code when called.

### Gas
The fee unit paid to execute a transaction. Users pay gas in the chain’s native token.

### Wei
Smallest unit used for on-chain integer accounting. \(1 ether = 10^{18}\) wei.

### Chain ID
Identifier for a blockchain network (BNB testnet uses `97`).

### RPC (JSON-RPC)
The standard interface wallets/apps use to read chain state and send transactions.

---

## Risk Terms

### Smart Contract Risk
Bugs or exploits in contract code. Audits reduce but don't eliminate.

### Oracle Risk
Dependence on external data feeds. Manipulation can cause liquidations.

### Counterparty Risk
Risk that a centralized entity fails. Relevant for anchors, CEXs.

### Regulatory Risk
Government actions affecting crypto operations. Varies by jurisdiction.

### Rug Pull
Developers abandoning project and taking funds. More common in unaudited protocols.

---

## Market Metrics

### Market Cap
Total value of circulating supply. Price × Circulating Supply.

### Fully Diluted Valuation (FDV)
Market cap if all tokens were circulating. Price × Max Supply.

### Volume
Trading activity over a period. 24h volume is standard metric.

### ATH (All-Time High)
Highest price ever reached by an asset.

### ATL (All-Time Low)
Lowest price ever reached by an asset.

### Dominance
Percentage of total crypto market cap. Bitcoin dominance ~45-50%.
