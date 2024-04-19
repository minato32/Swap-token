import { http } from "wagmi";
import { sepolia, polygonAmoy, bscTestnet } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const SUPPORTED_CHAINS = [sepolia, polygonAmoy, bscTestnet] as const;

export const wagmiConfig = getDefaultConfig({
  appName: "CrossChain Swap",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: SUPPORTED_CHAINS,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_AMOY_URL),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_BSC_URL),
  },
});
