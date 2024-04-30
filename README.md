# CrossChain Swap System

A production-grade decentralized cross-chain token swap protocol enabling seamless token swaps across multiple blockchain networks. Supports **same-chain DEX swaps** via Uniswap V3 and **cross-chain bridges** via LayerZero V2, with real-time pricing powered by Binance WebSocket.

## Overview

CrossChain Swap System allows users to:
- **Same-chain swaps**: Swap tokens on the same network through Uniswap V3 pools (e.g., ETH → USDC on Sepolia)
- **Cross-chain bridges**: Transfer tokens between different blockchains via LayerZero V2 messaging (e.g., Sepolia ETH → Amoy XCTT)

The protocol auto-detects the swap type based on source/destination chain selection and routes accordingly.

### Supported Networks

| Network | Chain ID | Same-Chain Swap | Cross-Chain Bridge |
|---------|----------|-----------------|-------------------|
| Ethereum Sepolia | 11155111 | Uniswap V3 | LayerZero V2 |
| Polygon Amoy | 80002 | - | LayerZero V2 |

## Architecture

![CrossChain Swap System Architecture](docs/architecture.svg)

### Same-Chain Flow (Uniswap V3)

```
User → Wrap ETH → Approve WETH → SwapRouter.swapOnChain()
  → Uniswap V3 exactInputSingle() → Tokens sent to user (~30 sec)
```

### Cross-Chain Flow (LayerZero V2)

```
User → Wrap ETH → Approve WETH → SwapRouter.swapAndBridge()
  → FeeManager (0.15% fee) → TokenVault (lock tokens)
  → BridgeAdapter → LayerZero V2 → Destination BridgeAdapter
  → TokenVault.releaseBridgedTokens() → Tokens to user (2-5 min)
```

### Fee Structure

| Swap Type | Protocol Fee | Why |
|-----------|-------------|-----|
| Same-chain | **0%** | User only pays Uniswap pool fee — we don't double-dip |
| Cross-chain (stablecoins) | **0.05%** | Low risk pairs |
| Cross-chain (standard) | **0.15%** | Default tier (ETH/MATIC, etc.) |
| Cross-chain (exotic) | **0.30%** | Higher risk, lower liquidity pairs |

## Smart Contracts

### Core Contracts

| Contract | Description |
|----------|-------------|
| **SwapRouter** | Entry point for both same-chain (Uniswap V3) and cross-chain (LayerZero) swaps. Handles token transfers, tiered fee deduction, slippage protection, and emergency pause. Resets token approvals after each swap (S-04 hardened). |
| **BridgeAdapter** | LayerZero V2 OApp for cross-chain messaging. Sends/receives messages with nonce replay protection and token mapping for cross-chain token resolution. |
| **TokenVault** | Locks ERC20 tokens with 30-minute refund timeout. Manages bridged token reserves with accounting-based tracking (S-03 hardened). Supports emergency pause with intentional release/refund during pause. |
| **FeeManager** | Uniswap V3-style tiered fee system (0.01%–1%). Configurable per-pair and default tiers. Guards against removing active default tier (S-10). |

### Security Contracts

| Contract | Description |
|----------|-------------|
| **PriceOracle** | Chainlink-ready oracle with staleness checks (min 60s), deviation detection (max 2000 bps), and testnet fallback pricing. |
| **SwapTimelock** | 24-hour admin delay with nonce-based operation IDs (collision-resistant). Operations expire after 48-hour grace period. |
| **SecurityMonitor** | On-chain activity surveillance with access-controlled `recordSwap` (S-06). Detects large swaps, rapid trading, and manages blacklist. |

### Mock Contracts (Testing)

| Contract | Description |
|----------|-------------|
| **MockERC20** | Mintable test ERC20 (XCTT — CrossChain Test Token) |
| **MockLzEndpoint** | Simulates LayerZero endpoint for local testing |
| **MockUniswapRouter** | Simulates Uniswap V3 exactInputSingle for testing |

## Real-Time Pricing

Quotes update in real-time via a three-tier fallback chain:

```
Binance WebSocket (~1s ticks)  →  CoinGecko API (60s cache)  →  Error (no silent fallback)
```

- **Same-chain**: Uniswap V3 QuoterV2 for exact on-chain output, with auto fee tier selection (500/3000/10000/100 bps)
- **Cross-chain**: Binance WS for live exchange rates, CoinGecko as backup
- **Frontend**: Server-Sent Events (SSE) for push-based real-time quote updates

## Security

### Smart Contract Security (16 Protections)

- **ReentrancyGuard** on all token-moving functions
- **SafeERC20** for safe token transfers handling non-standard tokens
- **Approval reset to zero** after every Uniswap swap (prevents residual allowance exploitation)
- **Slippage protection** with 1% buffer applied by frontend
- **Role-based access control** — each function restricted to authorized callers only
- **Nonce tracking** to prevent cross-chain replay attacks
- **Trusted remote verification** (OApp peer validation) for cross-chain message authentication
- **30-minute timeout** with user-initiated refund for failed transfers
- **Emergency pause** (circuit breaker) on SwapRouter and TokenVault
- **Max swap amount** per transaction to prevent whale manipulation
- **Deposit cap per token** and bridged reserve accounting to prevent vault drain
- **Donation attack immunity** — mapping-based accounting, not `balanceOf()`
- **Chainlink-ready price oracle** with staleness (min 60s) and deviation (max 2000 bps) checks
- **24-hour timelock** on all admin configuration changes with nonce-based collision resistance
- **On-chain activity monitoring** with automatic flagging and blacklist
- **Custom errors** for gas-efficient reverts (~5x cheaper than require strings)

### Backend Security (8 Protections)

- **Input validation** with express-validator (address regex, amount bounds, chain whitelist)
- **Rate limiting** at 100 requests/minute/IP
- **Helmet** security headers (CSP, X-Frame-Options, HSTS, XSS Protection)
- **CORS** restricted to configured frontend origin only (no wildcards)
- **Body size limit** of 10KB to prevent payload-based DoS
- **Sanitized error messages** — no stack traces, internal details, or raw error propagation
- **SSE error events** emitted instead of silent failures when price sources are down
- **Backend never signs transactions** — user's private key never leaves MetaMask

### Security Audit

A comprehensive 26-finding security audit was performed and all findings remediated:

| Severity | Found | Fixed |
|----------|-------|-------|
| Critical | 2 | 2 (key rotation) |
| High | 6 | 6 |
| Medium | 9 | 9 |
| Low | 6 | 6 |
| Informational | 3 | 3 |

Post-remediation re-audit: **13/13 PASS**, 1 new medium finding (NEW-01) identified and fixed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity ^0.8.24, Hardhat, OpenZeppelin v5, TypeScript |
| Backend | Node.js, Express, ethers.js v6, Helmet, TypeScript |
| Frontend | Next.js 14, Tailwind CSS v4, wagmi v2, RainbowKit, Framer Motion |
| Cross-Chain | LayerZero V2 (OApp) |
| DEX | Uniswap V3 (SwapRouter02, QuoterV2) |
| Pricing | Binance WebSocket, CoinGecko API |
| Fonts | Space Grotesk (headings), Inter (body) |
| Deployment | Vercel (frontend), Railway (backend) |

## Project Structure

```
├── contracts/                    # Solidity smart contracts
│   ├── src/
│   │   ├── SwapRouter.sol        # Main swap entry point (same-chain + cross-chain)
│   │   ├── BridgeAdapter.sol     # LayerZero V2 OApp messaging
│   │   ├── TokenVault.sol        # Token custody + bridged reserves + refunds
│   │   ├── FeeManager.sol        # Tiered fee system (0.01%–1%)
│   │   ├── PriceOracle.sol       # Chainlink-ready price feeds
│   │   ├── SwapTimelock.sol      # 24-hour admin delay
│   │   ├── SecurityMonitor.sol   # Activity surveillance
│   │   └── mocks/                # MockERC20, MockLzEndpoint, MockUniswapRouter
│   ├── test/                     # 56 automated tests
│   ├── scripts/                  # 8 deployment scripts
│   └── hardhat.config.ts
├── backend/                      # Express REST API
│   └── src/
│       ├── routes/               # quote, swap, status, health endpoints
│       ├── services/
│       │   ├── priceService.ts   # Quote engine (Binance WS + CoinGecko + QuoterV2)
│       │   ├── txBuilder.ts      # Unsigned transaction builder
│       │   ├── statusService.ts  # LayerZero status polling
│       │   ├── binanceWsService.ts  # Live price WebSocket
│       │   ├── coinGeckoService.ts  # USD price API
│       │   └── quoterService.ts  # Uniswap V3 QuoterV2 on-chain quotes
│       ├── config/chains.ts      # Network + contract addresses
│       └── middleware/            # Error handler, rate limiter
├── frontend/                     # Next.js 14 application
│   ├── app/                      # Layout, page, providers, globals
│   ├── components/
│   │   ├── swap/                 # SwapCard, SwapButton, TransactionStatus, QuoteDetails, RouteBreakdown
│   │   ├── layout/               # Header, ThemeToggle, Hero3DArt
│   │   ├── wallet/               # ConnectWalletButton, NetworkBanner
│   │   └── token/                # TokenSelector
│   ├── hooks/                    # useSwapQuote (SSE), useTransactionStatus
│   ├── config/                   # wagmi config, token lists
│   └── lib/                      # Types, constants, utilities
├── docs/                         # Architecture SVG diagram
└── .env.example                  # Environment variable template
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quote` | Returns swap pricing: output amount, fees, gas, ETA, exchange rate, USD values |
| SSE | `/quote/stream` | Real-time quote streaming via Server-Sent Events |
| POST | `/swap` | Builds unsigned EIP-1559 transaction for frontend signing |
| GET | `/status/:txHash` | Polls cross-chain swap status with retry logic (3 attempts, 5s intervals) |
| GET | `/health` | Server health + RPC connectivity check |

## Getting Started

### Prerequisites

- Node.js 18 LTS
- MetaMask wallet
- Alchemy API keys (Sepolia, Amoy)
- Testnet tokens (SepoliaETH from faucets)

### Installation

```bash
# Clone the repository
git clone git@github.com:minato32/Swap-token.git
cd Swap-token

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys and deployer private key

# Compile contracts
cd contracts && npx hardhat compile

# Run tests (56 tests)
npx hardhat test

# Start backend (Terminal 1)
cd ../backend && npm run dev

# Start frontend (Terminal 2)
cd ../frontend && npm run dev
```

### Environment Variables

```
ALCHEMY_SEPOLIA_URL=           # Alchemy RPC URL for Sepolia
ALCHEMY_AMOY_URL=              # Alchemy RPC URL for Polygon Amoy
PRIVATE_KEY=                   # Deployer wallet private key (never commit!)
ETHERSCAN_API_KEY=             # For contract verification on Etherscan

# Contract addresses (auto-filled after deployment)
SWAP_ROUTER_ADDRESS=
BRIDGE_ADAPTER_ADDRESS=
TOKEN_VAULT_ADDRESS=
FEE_MANAGER_ADDRESS=
SWAP_ROUTER_AMOY_ADDRESS=
BRIDGE_ADAPTER_AMOY_ADDRESS=
TOKEN_VAULT_AMOY_ADDRESS=
FEE_MANAGER_AMOY_ADDRESS=
```

### Deployment

```bash
# Deploy to Sepolia
cd contracts && npx hardhat run scripts/deploy-sepolia.ts --network sepolia

# Deploy to Amoy
npx hardhat run scripts/deploy-amoy.ts --network amoy

# Set up LayerZero peers (both directions)
npx hardhat run scripts/setup-peers.ts --network sepolia
npx hardhat run scripts/setup-peers.ts --network amoy

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <SWAP_ROUTER_ADDRESS>
```

## Testing

56 automated tests across 7 contract test suites:

- **SwapRouter** — swap execution, slippage rejection, same-chain Uniswap swap, access control
- **BridgeAdapter** — cross-chain send/receive, nonce tracking, trusted remote validation
- **TokenVault** — lock, release, bridged token release, refund, timeout, deposit caps
- **FeeManager** — tiered fee calculation, pair-specific tiers, collection access control, treasury withdrawal
- **PriceOracle** — fallback prices, deviation detection, staleness threshold enforcement
- **SwapTimelock** — schedule with nonce, execute after delay, expiry, cancellation
- **SecurityMonitor** — authorized caller enforcement, large swap detection, rapid trading, blacklist

```bash
cd contracts
npx hardhat test
```

## Security Design Rationale

This protocol's security architecture was designed to mitigate well-documented DeFi attack vectors:

- **Donation attack immunity** — TokenVault uses explicit deposit tracking via mappings and bridged reserve accounting, not `balanceOf()`, making it immune to exchange rate inflation via direct token transfers
- **Concentration limits** — Per-token deposit caps and bridged reserve tracking prevent vault drain attacks
- **Oracle hardening** — Chainlink integration with staleness thresholds (min 60s) and price deviation detection (max 2000 bps cap) prevents price manipulation
- **Admin delay** — 24-hour timelock with nonce-based collision resistance gives the community reaction time if owner keys are compromised
- **Activity surveillance** — On-chain monitoring with access-controlled recording detects anomalous trading patterns before damage escalates
- **Zero-fee same-chain** — No protocol fee on same-chain swaps prevents double-dipping (user already pays Uniswap pool fee), making the platform competitive with using Uniswap directly

## Testnet Limitations

On testnet, the destination token for cross-chain swaps is XCTT (CrossChain Test Token) instead of native tokens like MATIC. This is because:
1. Testnet faucets provide limited gas tokens — insufficient for vault liquidity
2. No Uniswap V3 pools exist on Polygon Amoy for same-chain swaps

On mainnet, the vault would be funded with real tokens (WMATIC, USDC) by liquidity providers, and Uniswap V3 pools would be available on all supported chains. The bridge infrastructure is identical — swapping XCTT for WMATIC is a one-line config change: `setTokenMapping(WETH, WMATIC)`.

## License

MIT
