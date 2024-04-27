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
      symbol: "MATIC",
      name: "Polygon",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      logo: "/tokens/matic.svg",
      chainId: 80002,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
      decimals: 6,
      logo: "/tokens/usdc.svg",
      chainId: 80002,
    },
  ],

  // BSC Testnet (ChainID: 97)
  97: [
    {
      symbol: "BNB",
      name: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      logo: "/tokens/bnb.svg",
      chainId: 97,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x64544969ed7EBf5f083679233325356EbE738930",
      decimals: 18,
      logo: "/tokens/usdc.svg",
      chainId: 97,
    },
  ],
};
