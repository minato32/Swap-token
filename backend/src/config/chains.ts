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
  wethAddress: string;
  quoterV2Address: string;
  nativeSymbol: string;
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
    lzChainId: 40161,
    wethAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    quoterV2Address: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
    nativeSymbol: "ETH",
  },
  amoy: {
    name: "Polygon Amoy",
    chainId: 80002,
    rpcUrl: process.env.ALCHEMY_AMOY_URL || "",
    swapRouterAddress: process.env.SWAP_ROUTER_AMOY_ADDRESS || "",
    bridgeAdapterAddress: process.env.BRIDGE_ADAPTER_AMOY_ADDRESS || "",
    tokenVaultAddress: process.env.TOKEN_VAULT_AMOY_ADDRESS || "",
    feeManagerAddress: process.env.FEE_MANAGER_AMOY_ADDRESS || "",
    lzChainId: 40267,
    wethAddress: "",
    quoterV2Address: "",
    nativeSymbol: "MATIC",
  },
  bsc: {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl: process.env.ALCHEMY_BSC_URL || "",
    swapRouterAddress: process.env.SWAP_ROUTER_BSC_ADDRESS || "",
    bridgeAdapterAddress: process.env.BRIDGE_ADAPTER_BSC_ADDRESS || "",
    tokenVaultAddress: process.env.TOKEN_VAULT_BSC_ADDRESS || "",
    feeManagerAddress: process.env.FEE_MANAGER_BSC_ADDRESS || "",
    lzChainId: 40102,
    wethAddress: "",
    quoterV2Address: "",
    nativeSymbol: "BNB",
  },
};

export function getChainConfig(chain: string): ChainConfig | undefined {
  return CHAINS[chain.toLowerCase()];
}

export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}

export default CHAINS;
