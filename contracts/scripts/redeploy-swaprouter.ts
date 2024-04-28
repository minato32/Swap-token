import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Redeploying SwapRouter with:", deployer.address);
  console.log("Network:", chainId === 11155111 ? "Sepolia" : chainId === 80002 ? "Amoy" : `Unknown (${chainId})`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "\n");

  // Existing contract addresses per chain
  const config: Record<number, { bridgeAdapter: string; tokenVault: string; feeManager: string; uniswapRouter: string }> = {
    11155111: {
      bridgeAdapter: process.env.BRIDGE_ADAPTER_ADDRESS || "",
      tokenVault: process.env.TOKEN_VAULT_ADDRESS || "",
      feeManager: process.env.FEE_MANAGER_ADDRESS || "",
      uniswapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    },
    80002: {
      bridgeAdapter: process.env.BRIDGE_ADAPTER_AMOY_ADDRESS || "",
      tokenVault: process.env.TOKEN_VAULT_AMOY_ADDRESS || "",
      feeManager: process.env.FEE_MANAGER_AMOY_ADDRESS || "",
      uniswapRouter: "0x0000000000000000000000000000000000000001",
    },
  };

  const chainConfig = config[chainId];
  if (!chainConfig) throw new Error(`No config for chain ${chainId}`);

  // Deploy new SwapRouter
  console.log("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddr = await swapRouter.getAddress();
  console.log("  SwapRouter:", swapRouterAddr);

  // Wire SwapRouter
  console.log("\nWiring SwapRouter...");
  await (await swapRouter.setBridgeAdapter(chainConfig.bridgeAdapter)).wait();
  console.log("  setBridgeAdapter ✓");

  await (await swapRouter.setTokenVault(chainConfig.tokenVault)).wait();
  console.log("  setTokenVault ✓");

  await (await swapRouter.setFeeManager(chainConfig.feeManager)).wait();
  console.log("  setFeeManager ✓");

  if (chainConfig.uniswapRouter !== "0x0000000000000000000000000000000000000001") {
    await (await swapRouter.setUniswapRouter(chainConfig.uniswapRouter)).wait();
    console.log("  setUniswapRouter ✓");
  }

  // Wire other contracts to point to new SwapRouter
  console.log("\nUpdating other contracts...");

  const tokenVault = await ethers.getContractAt("TokenVault", chainConfig.tokenVault);
  await (await tokenVault.setSwapRouter(swapRouterAddr)).wait();
  console.log("  tokenVault.setSwapRouter ✓");

  const bridgeAdapter = await ethers.getContractAt("BridgeAdapter", chainConfig.bridgeAdapter);
  await (await bridgeAdapter.setSwapRouter(swapRouterAddr)).wait();
  console.log("  bridgeAdapter.setSwapRouter ✓");

  const feeManager = await ethers.getContractAt("FeeManager", chainConfig.feeManager);
  await (await feeManager.setSwapRouter(swapRouterAddr)).wait();
  console.log("  feeManager.setSwapRouter ✓");

  console.log("\n========================================");
  console.log("  SWAPROUTER REDEPLOYED");
  console.log("========================================");
  const envKey = chainId === 11155111 ? "SWAP_ROUTER_ADDRESS" : "SWAP_ROUTER_AMOY_ADDRESS";
  console.log(`${envKey}=${swapRouterAddr}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
