# CrossChain Swap System

A decentralized cross-chain token swap protocol that enables users to seamlessly swap ERC20 tokens across multiple blockchain networks. Built with a modular smart contract architecture, a RESTful backend API, and a modern frontend interface.

## Overview

CrossChain Swap System allows users to initiate token swaps from one blockchain and receive tokens on a different blockchain. The protocol leverages LayerZero for secure cross-chain message passing, ensuring trustless and verifiable transfers between supported networks.

### Supported Networks

| Network | Chain ID | Type |
|---------|----------|------|
| Ethereum Sepolia | 11155111 | Testnet |
| Polygon Amoy | 80002 | Testnet |
| BSC Testnet | 97 | Testnet |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend    │────▶│   Backend    │────▶│  Smart Contracts │
│  Next.js 14   │     │  Express API │     │    Solidity      │
│  wagmi + RKit │     │  ethers v6   │     │  OpenZeppelin v5 │
└──────────────┘     └──────────────┘     └──────────────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │   LayerZero      │
                                          │  Cross-Chain Msg │
                                          └─────────────────┘
```

### Swap Flow

1. User connects wallet and selects source token, destination chain, and recipient
2. Frontend fetches a quote from the backend API
3. User approves the ERC20 token spend and signs the swap transaction
4. **SwapRouter** receives tokens, deducts protocol fee, and locks the remainder in **TokenVault**
5. **BridgeAdapter** sends a cross-chain message via LayerZero to the destination chain
6. Destination chain **BridgeAdapter** receives the message and triggers token release
7. Frontend polls transaction status until delivery is confirmed

## Smart Contracts

| Contract | Description |
|----------|-------------|
| **SwapRouter** | Main entry point for cross-chain swaps. Handles token transfers, fee deduction, slippage protection, and orchestrates the swap flow |
| **BridgeAdapter** | Manages cross-chain messaging via LayerZero. Sends and receives messages with nonce tracking to prevent replay attacks |
| **TokenVault** | Locks ERC20 tokens during cross-chain transfers with a 30-minute refund timeout for failed transactions |
| **FeeManager** | Collects 0.3% protocol fees per swap and manages treasury withdrawals |

### Security Features

- **ReentrancyGuard** on all state-changing functions
- **SafeERC20** for safe token transfers
- **Ownable** access control on admin functions
- **Nonce tracking** to prevent cross-chain replay attacks
- **Trusted remote verification** for cross-chain message authentication
- **Slippage protection** with configurable max tolerance (default 1%)
- **30-minute timeout** with user-initiated refund for failed transfers
- **Custom errors** for gas-efficient reverts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity ^0.8.24, Hardhat, OpenZeppelin v5, TypeScript |
| Backend | Node.js, Express, ethers.js v6, TypeScript |
| Frontend | Next.js 14, Tailwind CSS, wagmi v2, RainbowKit |
| Cross-Chain | LayerZero Protocol |
| Deployment | Vercel (frontend), Railway (backend) |

## Project Structure

```
├── contracts/              # Solidity smart contracts
│   ├── src/                # Contract source files
│   │   ├── SwapRouter.sol
│   │   ├── BridgeAdapter.sol
│   │   ├── TokenVault.sol
│   │   ├── FeeManager.sol
│   │   └── mocks/          # Test mock contracts
│   ├── test/               # Hardhat test suite
│   └── hardhat.config.ts
├── backend/                # Express REST API
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       └── utils/
├── frontend/               # Next.js 14 application
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   └── styles/
├── package.json            # Root workspace config
└── .env.example            # Environment variable template
```

## Getting Started

### Prerequisites

- Node.js 18 LTS
- MetaMask wallet
- Alchemy API keys (Sepolia, Amoy, BSC Testnet)
- Testnet tokens (ETH, MATIC, BNB)

### Installation

```bash
# Clone the repository
git clone git@github.com:minato32/Swap-token.git
cd Swap-token

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys and private key

# Compile contracts
cd contracts && npx hardhat compile

# Run tests
npx hardhat test
```

### Environment Variables

```
ALCHEMY_SEPOLIA_URL=       # Alchemy RPC URL for Sepolia
ALCHEMY_AMOY_URL=          # Alchemy RPC URL for Polygon Amoy
ALCHEMY_BSC_URL=           # Alchemy RPC URL for BSC Testnet
PRIVATE_KEY=               # Deployer wallet private key
```

## Testing

The contract test suite covers:

- Successful swap execution and token flow
- Slippage protection and rejection
- Token locking and release mechanics
- 30-minute timeout refund functionality
- Fee calculation and treasury withdrawal
- Access control and unauthorized access rejection
- Nonce tracking and replay attack prevention
- Cross-chain message send and receive validation

```bash
cd contracts
npx hardhat test
```

## License

MIT
