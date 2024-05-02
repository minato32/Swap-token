import { http, createConfig } from "wagmi";
import { sepolia, polygonAmoy } from "wagmi/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";

export const SUPPORTED_CHAINS = [sepolia, polygonAmoy] as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "04b09f045a3f50de5cf1e6940b888a43";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet],
    },
  ],
  {
    appName: "CrossChain Swap",
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: SUPPORTED_CHAINS,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_AMOY_URL),
  },
});
