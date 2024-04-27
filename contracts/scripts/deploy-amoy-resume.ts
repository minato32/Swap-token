import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";

const LZ_ENDPOINT_AMOY = "0x6EDCE65403992e310A62460808c4b910D972f10f";

const ALREADY_DEPLOYED = {
  feeManager: "0xE7ca09f2CcfF870f9559f1baADAcF220302B14Fb",
  tokenVault: "0xA286197c548c71dc73b2c469dB459Cc45351BD91",
  bridgeAdapter: "0x0367c0Ee5bE999Dc1fBC4e49a49FB13B89feBd5B",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Resuming Amoy deployment with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC\n");

  const feeManagerAddr = ALREADY_DEPLOYED.feeManager;
  const tokenVaultAddr = ALREADY_DEPLOYED.tokenVault;
  const bridgeAdapterAddr = ALREADY_DEPLOYED.bridgeAdapter;
  console.log("Using existing FeeManager:", feeManagerAddr);
  console.log("Using existing TokenVault:", tokenVaultAddr);
  console.log("Using existing BridgeAdapter:", bridgeAdapterAddr);

  console.log("\nDeploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddr = await swapRouter.getAddress();
  console.log("  SwapRouter:", swapRouterAddr);

  const feeManager = await ethers.getContractAt("FeeManager", feeManagerAddr);
  const tokenVault = await ethers.getContractAt("TokenVault", tokenVaultAddr);
  const bridgeAdapter = await ethers.getContractAt("BridgeAdapter", bridgeAdapterAddr);

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
