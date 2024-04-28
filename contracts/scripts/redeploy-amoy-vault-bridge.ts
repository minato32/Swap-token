import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";

const EXISTING = {
  swapRouter: process.env.SWAP_ROUTER_AMOY_ADDRESS || "",
  feeManager: process.env.FEE_MANAGER_AMOY_ADDRESS || "",
};

const LZ_ENDPOINT_AMOY = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SEPOLIA_BRIDGE_ADAPTER = process.env.BRIDGE_ADAPTER_ADDRESS || "";
const SEPOLIA_LZ_EID = 40161;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying TokenVault + BridgeAdapter on Amoy");
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "POL\n");

  // Deploy TokenVault
  console.log("Deploying TokenVault...");
  const TokenVault = await ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.waitForDeployment();
  const tvAddr = await tokenVault.getAddress();
  console.log("  TokenVault:", tvAddr);

  // Deploy BridgeAdapter
  console.log("Deploying BridgeAdapter...");
  const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
  const bridgeAdapter = await BridgeAdapter.deploy(LZ_ENDPOINT_AMOY, deployer.address);
  await bridgeAdapter.waitForDeployment();
  const baAddr = await bridgeAdapter.getAddress();
  console.log("  BridgeAdapter:", baAddr);

  // Wire contracts
  console.log("\nWiring...");

  await (await tokenVault.setSwapRouter(EXISTING.swapRouter)).wait();
  console.log("  tokenVault.setSwapRouter ✓");

  await (await tokenVault.setBridgeAdapter(baAddr)).wait();
  console.log("  tokenVault.setBridgeAdapter ✓");

  await (await bridgeAdapter.setSwapRouter(EXISTING.swapRouter)).wait();
  console.log("  bridgeAdapter.setSwapRouter ✓");

  await (await bridgeAdapter.setTokenVault(tvAddr)).wait();
  console.log("  bridgeAdapter.setTokenVault ✓");

  // Update SwapRouter to point to new contracts
  const swapRouter = await ethers.getContractAt("SwapRouter", EXISTING.swapRouter);
  await (await swapRouter.setTokenVault(tvAddr)).wait();
  console.log("  swapRouter.setTokenVault ✓");

  await (await swapRouter.setBridgeAdapter(baAddr)).wait();
  console.log("  swapRouter.setBridgeAdapter ✓");

  // Update FeeManager
  const feeManager = await ethers.getContractAt("FeeManager", EXISTING.feeManager);
  await (await feeManager.setSwapRouter(EXISTING.swapRouter)).wait();
  console.log("  feeManager.setSwapRouter ✓");

  // Set LayerZero peer — trust Sepolia's BridgeAdapter
  console.log("\nSetting LZ peer...");
  const peerBytes32 = ethers.zeroPadValue(SEPOLIA_BRIDGE_ADAPTER, 32);
  await (await bridgeAdapter.setPeer(SEPOLIA_LZ_EID, peerBytes32)).wait();
  console.log("  setPeer(40161, Sepolia BridgeAdapter) ✓");

  console.log("\n========================================");
  console.log("  AMOY REDEPLOY COMPLETE");
  console.log("========================================");
  console.log(`TOKEN_VAULT_AMOY_ADDRESS=${tvAddr}`);
  console.log(`BRIDGE_ADAPTER_AMOY_ADDRESS=${baAddr}`);
  console.log("========================================");
  console.log("\nNOTE: Update .env with new addresses");
  console.log("NOTE: Run setup-peers on Sepolia to trust new Amoy BridgeAdapter");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
