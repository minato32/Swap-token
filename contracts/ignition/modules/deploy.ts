import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const LZ_ENDPOINT_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const UNISWAP_V3_ROUTER_SEPOLIA = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

const DeployModule = buildModule("CrossChainSwapSystem", (m) => {
  const deployer = m.getAccount(0);

  const feeManager = m.contract("FeeManager", [deployer]);
  const tokenVault = m.contract("TokenVault", []);
  const bridgeAdapter = m.contract("BridgeAdapter", [LZ_ENDPOINT_SEPOLIA, deployer]);
  const swapRouter = m.contract("SwapRouter", []);

  m.call(swapRouter, "setBridgeAdapter", [bridgeAdapter]);
  m.call(swapRouter, "setTokenVault", [tokenVault]);
  m.call(swapRouter, "setFeeManager", [feeManager]);
  m.call(swapRouter, "setUniswapRouter", [UNISWAP_V3_ROUTER_SEPOLIA]);

  m.call(tokenVault, "setSwapRouter", [swapRouter]);
  m.call(tokenVault, "setBridgeAdapter", [bridgeAdapter]);

  m.call(bridgeAdapter, "setSwapRouter", [swapRouter]);
  m.call(bridgeAdapter, "setTokenVault", [tokenVault]);

  m.call(feeManager, "setSwapRouter", [swapRouter]);

  return { feeManager, tokenVault, bridgeAdapter, swapRouter };
});

export default DeployModule;
