export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo: string;
  chainId: number;
}

export const SUPPORTED_TOKENS: Record<number, Token[]> = {
  // Sepolia (ChainID: 11155111)
  11155111: [
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      logo: "/tokens/eth.svg",
      chainId: 11155111,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
      logo: "/tokens/usdc.svg",
      chainId: 11155111,
    },
  ],

  // Amoy (ChainID: 80002)
  80002: [
    {
      symbol: "XCTT",
      name: "CrossChain Test Token",
      address: "0x57dE85325fb30402AeeF473487B43EcacB544dfE",
      decimals: 18,
      logo: "/tokens/xctt.svg",
      chainId: 80002,
    },
  ],

  // BSC Testnet (ChainID: 97) — not deployed yet
  // 97: [],
};
