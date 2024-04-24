import { ethers } from "hardhat";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SEPOLIA_EID = 40161;
const AMOY_EID = 40267;

async function main() {
  const sepoliaBridgeAddr = process.env.BRIDGE_ADAPTER_ADDRESS;
  const amoyBridgeAddr = process.env.BRIDGE_ADAPTER_AMOY_ADDRESS;

  if (!sepoliaBridgeAddr || !amoyBridgeAddr) {
    console.error("Missing BRIDGE_ADAPTER_ADDRESS or BRIDGE_ADAPTER_AMOY_ADDRESS in .env");
    process.exit(1);
  }

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const [deployer] = await ethers.getSigners();
  console.log("Setting peers with:", deployer.address);
  console.log("Network:", chainId === 11155111 ? "Sepolia" : "Amoy");

  if (chainId === 11155111) {
    const bridgeAdapter = await ethers.getContractAt("BridgeAdapter", sepoliaBridgeAddr);
    const peerBytes32 = ethers.zeroPadValue(amoyBridgeAddr, 32);
    await (await bridgeAdapter.setPeer(AMOY_EID, peerBytes32)).wait();
    console.log(`Sepolia BridgeAdapter → setPeer(${AMOY_EID}, ${amoyBridgeAddr}) ✓`);
  } else if (chainId === 80002) {
    const bridgeAdapter = await ethers.getContractAt("BridgeAdapter", amoyBridgeAddr);
    const peerBytes32 = ethers.zeroPadValue(sepoliaBridgeAddr, 32);
    await (await bridgeAdapter.setPeer(SEPOLIA_EID, peerBytes32)).wait();
    console.log(`Amoy BridgeAdapter → setPeer(${SEPOLIA_EID}, ${sepoliaBridgeAddr}) ✓`);
  } else {
    console.error("Unknown network. Run with --network sepolia or --network amoy");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
