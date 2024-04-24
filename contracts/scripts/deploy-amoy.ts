import { ethers } from "hardhat";

const LZ_ENDPOINT_AMOY = "0x6EDCE65403992e310A62460808c4b910D972f10f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Amoy with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC\n");

  console.log("Deploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.waitForDeployment();
  const feeManagerAddr = await feeManager.getAddress();
  console.log("  FeeManager:", feeManagerAddr);

  console.log("Deploying TokenVault...");
  const TokenVault = await ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.waitForDeployment();
  const tokenVaultAddr = await tokenVault.getAddress();
  console.log("  TokenVault:", tokenVaultAddr);

  console.log("Deploying BridgeAdapter...");
  const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
  const bridgeAdapter = await BridgeAdapter.deploy(LZ_ENDPOINT_AMOY, deployer.address);
  await bridgeAdapter.waitForDeployment();
  const bridgeAdapterAddr = await bridgeAdapter.getAddress();
  console.log("  BridgeAdapter:", bridgeAdapterAddr);

  console.log("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddr = await swapRouter.getAddress();
  console.log("  SwapRouter:", swapRouterAddr);

  console.log("\nWiring contracts together...");

  await (await swapRouter.setBridgeAdapter(bridgeAdapterAddr)).wait();
  console.log("  swapRouter.setBridgeAdapter ✓");

  await (await swapRouter.setTokenVault(tokenVaultAddr)).wait();
  console.log("  swapRouter.setTokenVault ✓");

  await (await swapRouter.setFeeManager(feeManagerAddr)).wait();
  console.log("  swapRouter.setFeeManager ✓");

  await (await tokenVault.setSwapRouter(swapRouterAddr)).wait();
  console.log("  tokenVault.setSwapRouter ✓");

  await (await tokenVault.setBridgeAdapter(bridgeAdapterAddr)).wait();
  console.log("  tokenVault.setBridgeAdapter ✓");

  await (await bridgeAdapter.setSwapRouter(swapRouterAddr)).wait();
  console.log("  bridgeAdapter.setSwapRouter ✓");

  await (await bridgeAdapter.setTokenVault(tokenVaultAddr)).wait();
  console.log("  bridgeAdapter.setTokenVault ✓");

  await (await feeManager.setSwapRouter(swapRouterAddr)).wait();
  console.log("  feeManager.setSwapRouter ✓");

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE — AMOY");
  console.log("========================================");
  console.log(`SWAP_ROUTER_AMOY_ADDRESS=${swapRouterAddr}`);
  console.log(`BRIDGE_ADAPTER_AMOY_ADDRESS=${bridgeAdapterAddr}`);
  console.log(`TOKEN_VAULT_AMOY_ADDRESS=${tokenVaultAddr}`);
  console.log(`FEE_MANAGER_AMOY_ADDRESS=${feeManagerAddr}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
