import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("TokenVault", function () {
  async function deployFixture() {
    const [owner, swapRouterSigner, bridgeAdapterSigner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");

    const TokenVault = await ethers.getContractFactory("TokenVault");
    const tokenVault = await TokenVault.deploy();

    await tokenVault.setSwapRouter(swapRouterSigner.address);
    await tokenVault.setBridgeAdapter(bridgeAdapterSigner.address);

    const mintAmount = ethers.parseEther("10000");
    await token.mint(swapRouterSigner.address, mintAmount);
    await token.connect(swapRouterSigner).approve(await tokenVault.getAddress(), mintAmount);

    const depositId = ethers.keccak256(ethers.toUtf8Bytes("deposit-1"));

    return { tokenVault, token, owner, swapRouterSigner, bridgeAdapterSigner, user, depositId };
  }

  describe("lockTokens", function () {
    it("should lock tokens successfully", async function () {
      const { tokenVault, token, swapRouterSigner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await expect(
        tokenVault.connect(swapRouterSigner).lockTokens(
          depositId,
          await token.getAddress(),
          amount,
          user.address
        )
      ).to.emit(tokenVault, "TokensLocked");

      expect(await token.balanceOf(await tokenVault.getAddress())).to.equal(amount);
    });

    it("should revert if not called by SwapRouter", async function () {
      const { tokenVault, token, user, depositId } = await loadFixture(deployFixture);

      await expect(
        tokenVault.connect(user).lockTokens(
          depositId,
          await token.getAddress(),
          ethers.parseEther("100"),
          user.address
        )
      ).to.be.revertedWithCustomError(tokenVault, "OnlySwapRouter");
    });

    it("should revert on duplicate deposit ID", async function () {
      const { tokenVault, token, swapRouterSigner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await expect(
        tokenVault.connect(swapRouterSigner).lockTokens(
          depositId, await token.getAddress(), amount, user.address
        )
      ).to.be.revertedWithCustomError(tokenVault, "DepositAlreadyExists");
    });
  });

  describe("releaseTokens", function () {
    it("should release tokens to recipient", async function () {
      const { tokenVault, token, swapRouterSigner, bridgeAdapterSigner, user, depositId } =
        await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await expect(
        tokenVault.connect(bridgeAdapterSigner).releaseTokens(depositId, user.address)
      ).to.emit(tokenVault, "TokensReleased");

      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("should revert if not called by BridgeAdapter", async function () {
      const { tokenVault, token, swapRouterSigner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await expect(
        tokenVault.connect(user).releaseTokens(depositId, user.address)
      ).to.be.revertedWithCustomError(tokenVault, "OnlyBridgeAdapter");
    });
  });

  describe("refund", function () {
    it("should refund after 30-minute timeout", async function () {
      const { tokenVault, token, swapRouterSigner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await time.increase(30 * 60 + 1); // 30 minutes + 1 second

      await expect(
        tokenVault.connect(user).refund(depositId)
      ).to.emit(tokenVault, "TokensRefunded");

      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("should revert if lock has not expired", async function () {
      const { tokenVault, token, swapRouterSigner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await expect(
        tokenVault.connect(user).refund(depositId)
      ).to.be.revertedWithCustomError(tokenVault, "LockNotExpired");
    });

    it("should revert if not the original depositor", async function () {
      const { tokenVault, token, swapRouterSigner, owner, user, depositId } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await time.increase(30 * 60 + 1);

      await expect(
        tokenVault.connect(owner).refund(depositId)
      ).to.be.revertedWithCustomError(tokenVault, "OnlyDepositor");
    });

    it("should revert refund on already released deposit", async function () {
      const { tokenVault, token, swapRouterSigner, bridgeAdapterSigner, user, depositId } =
        await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await tokenVault.connect(swapRouterSigner).lockTokens(
        depositId, await token.getAddress(), amount, user.address
      );

      await tokenVault.connect(bridgeAdapterSigner).releaseTokens(depositId, user.address);

      await time.increase(30 * 60 + 1);

      await expect(
        tokenVault.connect(user).refund(depositId)
      ).to.be.revertedWithCustomError(tokenVault, "DepositAlreadyReleased");
    });
  });
});
