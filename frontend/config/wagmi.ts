import { http, createConfig } from "wagmi";
import { sepolia, polygonAmoy, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";

export const SUPPORTED_CHAINS = [sepolia, polygonAmoy, bscTestnet] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet],
    },
  ],
  {
    appName: "CrossChain Swap",
    projectId: "disabled",
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: SUPPORTED_CHAINS,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_AMOY_URL),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_BSC_URL),
  },
});
