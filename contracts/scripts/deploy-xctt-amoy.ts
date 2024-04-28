import "@nomicfoundation/hardhat-toolbox";
import { ethers } from "hardhat";

const TOKEN_VAULT_AMOY = "0xA286197c548c71dc73b2c469dB459Cc45351BD91";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying XCTT on Amoy with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "POL\n");

  // Deploy XCTT
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("CrossChain Test Token", "XCTT");
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("XCTT deployed at:", tokenAddr);

  // Mint 10,000 XCTT to deployer
  const mintAmount = ethers.parseEther("10000");
  await (await token.mint(deployer.address, mintAmount)).wait();
  console.log("Minted 10,000 XCTT to deployer");

  // Fund TokenVault with 5,000 XCTT for cross-chain releases
  const vaultFund = ethers.parseEther("5000");
  await (await token.transfer(TOKEN_VAULT_AMOY, vaultFund)).wait();
  console.log("Funded TokenVault with 5,000 XCTT");

  // Verify
  const vaultBalance = await token.balanceOf(TOKEN_VAULT_AMOY);
  console.log("TokenVault XCTT balance:", ethers.formatEther(vaultBalance));

  console.log(`\nXCTT_TOKEN_AMOY=${tokenAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
