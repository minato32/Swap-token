import { ethers } from "hardhat";

const UNISWAP_V3_ROUTER_SEPOLIA = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

const EXISTING = {
  bridgeAdapter: process.env.BRIDGE_ADAPTER_ADDRESS || "",
  tokenVault: process.env.TOKEN_VAULT_ADDRESS || "",
  feeManager: process.env.FEE_MANAGER_ADDRESS || "",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  console.log("Existing contracts (unchanged):");
  console.log("  BridgeAdapter:", EXISTING.bridgeAdapter);
  console.log("  TokenVault:   ", EXISTING.tokenVault);
  console.log("  FeeManager:   ", EXISTING.feeManager);

  // 1. Deploy new SwapRouter
  console.log("\nDeploying new SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const newAddr = await swapRouter.getAddress();
  console.log("  New SwapRouter:", newAddr);

  // 2. Wire new SwapRouter to existing contracts
  console.log("\nWiring new SwapRouter...");
  await (await swapRouter.setBridgeAdapter(EXISTING.bridgeAdapter)).wait();
  console.log("  swapRouter.setBridgeAdapter ✓");

  await (await swapRouter.setTokenVault(EXISTING.tokenVault)).wait();
  console.log("  swapRouter.setTokenVault ✓");

  await (await swapRouter.setFeeManager(EXISTING.feeManager)).wait();
  console.log("  swapRouter.setFeeManager ✓");

  await (await swapRouter.setUniswapRouter(UNISWAP_V3_ROUTER_SEPOLIA)).wait();
  console.log("  swapRouter.setUniswapRouter ✓");

  // 3. Update existing contracts to point to new SwapRouter
  console.log("\nUpdating existing contracts...");

  const tokenVault = await ethers.getContractAt("TokenVault", EXISTING.tokenVault);
  await (await tokenVault.setSwapRouter(newAddr)).wait();
  console.log("  tokenVault.setSwapRouter ✓");

  const bridgeAdapter = await ethers.getContractAt("BridgeAdapter", EXISTING.bridgeAdapter);
  await (await bridgeAdapter.setSwapRouter(newAddr)).wait();
  console.log("  bridgeAdapter.setSwapRouter ✓");

  const feeManager = await ethers.getContractAt("FeeManager", EXISTING.feeManager);
  await (await feeManager.setSwapRouter(newAddr)).wait();
  console.log("  feeManager.setSwapRouter ✓");

  console.log("\n========================================");
  console.log("  REDEPLOYMENT COMPLETE — SEPOLIA");
  console.log("========================================");
  console.log(`SWAP_ROUTER_ADDRESS=${newAddr}`);
  console.log("========================================");
  console.log("\nUpdate SWAP_ROUTER_ADDRESS in your .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
