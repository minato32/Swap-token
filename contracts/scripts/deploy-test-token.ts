import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying test token with:", deployer.address);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("CrossChain Test Token", "XCTT");
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("XCTT deployed at:", tokenAddr);

  const mintAmount = ethers.parseEther("10000");
  await (await token.mint(deployer.address, mintAmount)).wait();
  console.log("Minted 10,000 XCTT to", deployer.address);

  console.log(`\nXCTT_TOKEN_ADDRESS=${tokenAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
