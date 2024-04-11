import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  swapRouterAddress: string;
  bridgeAdapterAddress: string;
  tokenVaultAddress: string;
  feeManagerAddress: string;
  lzChainId: number;
}

const CHAINS: Record<string, ChainConfig> = {
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: process.env.ALCHEMY_SEPOLIA_URL || "",
    swapRouterAddress: process.env.SWAP_ROUTER_ADDRESS || "",
    bridgeAdapterAddress: process.env.BRIDGE_ADAPTER_ADDRESS || "",
    tokenVaultAddress: process.env.TOKEN_VAULT_ADDRESS || "",
    feeManagerAddress: process.env.FEE_MANAGER_ADDRESS || "",
    lzChainId: 10161,
  },
  amoy: {
    name: "Polygon Amoy",
    chainId: 80002,
    rpcUrl: process.env.ALCHEMY_AMOY_URL || "",
    swapRouterAddress: process.env.SWAP_ROUTER_AMOY_ADDRESS || "",
    bridgeAdapterAddress: process.env.BRIDGE_ADAPTER_AMOY_ADDRESS || "",
    tokenVaultAddress: process.env.TOKEN_VAULT_AMOY_ADDRESS || "",
    feeManagerAddress: process.env.FEE_MANAGER_AMOY_ADDRESS || "",
    lzChainId: 10267,
  },
  bsc: {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl: process.env.ALCHEMY_BSC_URL || "",
    swapRouterAddress: process.env.SWAP_ROUTER_BSC_ADDRESS || "",
    bridgeAdapterAddress: process.env.BRIDGE_ADAPTER_BSC_ADDRESS || "",
    tokenVaultAddress: process.env.TOKEN_VAULT_BSC_ADDRESS || "",
    feeManagerAddress: process.env.FEE_MANAGER_BSC_ADDRESS || "",
    lzChainId: 10102,
  },
};

export function getChainConfig(chain: string): ChainConfig | undefined {
  return CHAINS[chain.toLowerCase()];
}

export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}

export default CHAINS;
