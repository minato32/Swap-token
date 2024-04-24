import { ethers } from "hardhat";

const LZ_ENDPOINT_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const UNISWAP_V3_ROUTER_SEPOLIA = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // 1. Deploy FeeManager
  console.log("Deploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.waitForDeployment();
  const feeManagerAddr = await feeManager.getAddress();
  console.log("  FeeManager:", feeManagerAddr);

  // 2. Deploy TokenVault
  console.log("Deploying TokenVault...");
  const TokenVault = await ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.waitForDeployment();
  const tokenVaultAddr = await tokenVault.getAddress();
  console.log("  TokenVault:", tokenVaultAddr);

  // 3. Deploy BridgeAdapter
  console.log("Deploying BridgeAdapter...");
  const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
  const bridgeAdapter = await BridgeAdapter.deploy(LZ_ENDPOINT_SEPOLIA, deployer.address);
  await bridgeAdapter.waitForDeployment();
  const bridgeAdapterAddr = await bridgeAdapter.getAddress();
  console.log("  BridgeAdapter:", bridgeAdapterAddr);

  // 4. Deploy SwapRouter
  console.log("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddr = await swapRouter.getAddress();
  console.log("  SwapRouter:", swapRouterAddr);

  console.log("\nWiring contracts together...");

  // 5. Wire SwapRouter
  await (await swapRouter.setBridgeAdapter(bridgeAdapterAddr)).wait();
  console.log("  swapRouter.setBridgeAdapter ✓");

  await (await swapRouter.setTokenVault(tokenVaultAddr)).wait();
  console.log("  swapRouter.setTokenVault ✓");

  await (await swapRouter.setFeeManager(feeManagerAddr)).wait();
  console.log("  swapRouter.setFeeManager ✓");

  await (await swapRouter.setUniswapRouter(UNISWAP_V3_ROUTER_SEPOLIA)).wait();
  console.log("  swapRouter.setUniswapRouter ✓");

  // 6. Wire TokenVault
  await (await tokenVault.setSwapRouter(swapRouterAddr)).wait();
  console.log("  tokenVault.setSwapRouter ✓");

  await (await tokenVault.setBridgeAdapter(bridgeAdapterAddr)).wait();
  console.log("  tokenVault.setBridgeAdapter ✓");

  // 7. Wire BridgeAdapter
  await (await bridgeAdapter.setSwapRouter(swapRouterAddr)).wait();
  console.log("  bridgeAdapter.setSwapRouter ✓");

  await (await bridgeAdapter.setTokenVault(tokenVaultAddr)).wait();
  console.log("  bridgeAdapter.setTokenVault ✓");

  // 8. Wire FeeManager
  await (await feeManager.setSwapRouter(swapRouterAddr)).wait();
  console.log("  feeManager.setSwapRouter ✓");

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE — SEPOLIA");
  console.log("========================================");
  console.log(`SWAP_ROUTER_ADDRESS=${swapRouterAddr}`);
  console.log(`BRIDGE_ADAPTER_ADDRESS=${bridgeAdapterAddr}`);
  console.log(`TOKEN_VAULT_ADDRESS=${tokenVaultAddr}`);
  console.log(`FEE_MANAGER_ADDRESS=${feeManagerAddr}`);
  console.log("========================================");
  console.log("\nCopy these addresses to your .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
