import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("FeeManager", function () {
  async function deployFixture() {
    const [owner, treasury, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(treasury.address);

    const feeManagerAddress = await feeManager.getAddress();
    await token.mint(feeManagerAddress, ethers.parseEther("1000"));

    return { feeManager, token, owner, treasury, user };
  }

  describe("calculateFee", function () {
    it("should calculate 0.3% fee correctly", async function () {
      const { feeManager } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      const fee = await feeManager.calculateFee(amount);
      const expected = (amount * 30n) / 10000n;

      expect(fee).to.equal(expected);
    });

    it("should return zero fee for zero amount", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      expect(await feeManager.calculateFee(0n)).to.equal(0n);
    });
  });

  describe("collectFee", function () {
    it("should track collected fees", async function () {
      const { feeManager, token } = await loadFixture(deployFixture);
      const tokenAddress = await token.getAddress();
      const amount = ethers.parseEther("3");

      await expect(
        feeManager.collectFee(tokenAddress, amount)
      ).to.emit(feeManager, "FeeCollected");

      expect(await feeManager.collectedFees(tokenAddress)).to.equal(amount);
    });

    it("should revert on zero token address", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      await expect(
        feeManager.collectFee(ethers.ZeroAddress, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(feeManager, "ZeroAddress");
    });

    it("should revert on zero amount", async function () {
      const { feeManager, token } = await loadFixture(deployFixture);

      await expect(
        feeManager.collectFee(await token.getAddress(), 0n)
      ).to.be.revertedWithCustomError(feeManager, "ZeroAmount");
    });
  });

  describe("withdrawFees", function () {
    it("should withdraw fees to treasury", async function () {
      const { feeManager, token, treasury } = await loadFixture(deployFixture);
      const tokenAddress = await token.getAddress();
      const amount = ethers.parseEther("100");

      await feeManager.collectFee(tokenAddress, amount);

      await expect(
        feeManager.withdrawFees(tokenAddress)
      ).to.emit(feeManager, "FeeWithdrawn");

      expect(await token.balanceOf(treasury.address)).to.equal(amount);
      expect(await feeManager.collectedFees(tokenAddress)).to.equal(0n);
    });

    it("should revert if no fees to withdraw", async function () {
      const { feeManager, token } = await loadFixture(deployFixture);

      await expect(
        feeManager.withdrawFees(await token.getAddress())
      ).to.be.revertedWithCustomError(feeManager, "InsufficientFees");
    });

    it("should revert if non-owner withdraws", async function () {
      const { feeManager, token, user } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(user).withdrawFees(await token.getAddress())
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner sets treasury", async function () {
      const { feeManager, user } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(user).setTreasury(user.address)
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount");
    });
  });
});
