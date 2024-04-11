import { ethers } from "ethers";
import CHAINS from "../config/chains";

const providers: Record<string, ethers.JsonRpcProvider> = {};

export function getProvider(chain: string): ethers.JsonRpcProvider {
  const key = chain.toLowerCase();

  if (providers[key]) return providers[key];

  const config = CHAINS[key];
  if (!config || !config.rpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${chain}`);
  }

  providers[key] = new ethers.JsonRpcProvider(config.rpcUrl);
  return providers[key];
}

export async function checkRpcConnectivity(chain: string): Promise<boolean> {
  try {
    const provider = getProvider(chain);
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
