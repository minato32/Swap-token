import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("FeeManager", function () {
  async function deployFixture() {
    const [owner, treasury, user, swapRouter] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");
    const tokenB = await MockERC20.deploy("Token B", "TKNB");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(treasury.address);

    await feeManager.setSwapRouter(swapRouter.address);

    const feeManagerAddress = await feeManager.getAddress();
    await token.mint(feeManagerAddress, ethers.parseEther("1000"));

    return { feeManager, token, tokenB, owner, treasury, user, swapRouter };
  }

  describe("fee tiers", function () {
    it("should have valid tiers initialized (1, 5, 15, 30, 100)", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      expect(await feeManager.validFeeTiers(1n)).to.be.true;
      expect(await feeManager.validFeeTiers(5n)).to.be.true;
      expect(await feeManager.validFeeTiers(15n)).to.be.true;
      expect(await feeManager.validFeeTiers(30n)).to.be.true;
      expect(await feeManager.validFeeTiers(100n)).to.be.true;
      expect(await feeManager.validFeeTiers(50n)).to.be.false;
    });

    it("should return default fee (15 BPS) for unconfigured pairs", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);

      expect(
        await feeManager.getFeeBps(await token.getAddress(), await tokenB.getAddress())
      ).to.equal(15n);
    });

    it("should set and return pair-specific fee tier", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();
      const tokenBAddr = await tokenB.getAddress();

      await feeManager.setPairFee(tokenAddr, tokenBAddr, 5n);
      expect(await feeManager.getFeeBps(tokenAddr, tokenBAddr)).to.equal(5n);
    });

    it("should return same fee regardless of token order", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();
      const tokenBAddr = await tokenB.getAddress();

      await feeManager.setPairFee(tokenAddr, tokenBAddr, 1n);
      expect(await feeManager.getFeeBps(tokenBAddr, tokenAddr)).to.equal(1n);
    });

    it("should revert on invalid fee tier", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);

      await expect(
        feeManager.setPairFee(await token.getAddress(), await tokenB.getAddress(), 50n)
      ).to.be.revertedWithCustomError(feeManager, "InvalidFeeTier");
    });

    it("should revert if non-owner sets pair fee", async function () {
      const { feeManager, token, tokenB, user } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(user).setPairFee(await token.getAddress(), await tokenB.getAddress(), 30n)
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("defaultFee", function () {
    it("should allow owner to change default fee", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      await feeManager.setDefaultFee(5n);
      expect(await feeManager.defaultFeeBps()).to.equal(5n);
    });

    it("should revert on invalid default fee", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      await expect(feeManager.setDefaultFee(50n)).to.be.revertedWithCustomError(
        feeManager,
        "InvalidFeeTier"
      );
    });
  });

  describe("calculateFee", function () {
    it("should calculate fee using pair-specific tier", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const amount = ethers.parseEther("1000");

      await feeManager.setPairFee(tokenAddr, tokenBAddr, 5n);

      const fee = await feeManager.calculateFee(tokenAddr, tokenBAddr, amount);
      expect(fee).to.equal((amount * 5n) / 10000n);
    });

    it("should calculate fee using default tier for unconfigured pairs", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      const fee = await feeManager.calculateFee(
        await token.getAddress(),
        await tokenB.getAddress(),
        amount
      );
      expect(fee).to.equal((amount * 15n) / 10000n);
    });

    it("should return zero fee for zero amount", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);

      const fee = await feeManager.calculateFee(
        await token.getAddress(),
        await tokenB.getAddress(),
        0n
      );
      expect(fee).to.equal(0n);
    });
  });

  describe("addFeeTier / removeFeeTier", function () {
    it("should add a new valid tier", async function () {
      const { feeManager, token, tokenB } = await loadFixture(deployFixture);

      await feeManager.addFeeTier(10n);
      expect(await feeManager.validFeeTiers(10n)).to.be.true;

      await feeManager.setPairFee(await token.getAddress(), await tokenB.getAddress(), 10n);
      expect(
        await feeManager.getFeeBps(await token.getAddress(), await tokenB.getAddress())
      ).to.equal(10n);
    });

    it("should revert adding tier above MAX_FEE_BPS", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      await expect(feeManager.addFeeTier(101n)).to.be.revertedWithCustomError(
        feeManager,
        "InvalidFeeTier"
      );
    });

    it("should remove a fee tier", async function () {
      const { feeManager } = await loadFixture(deployFixture);

      await feeManager.removeFeeTier(100n);
      expect(await feeManager.validFeeTiers(100n)).to.be.false;
    });
  });

  describe("collectFee", function () {
    it("should track collected fees", async function () {
      const { feeManager, token, swapRouter } = await loadFixture(deployFixture);
      const tokenAddress = await token.getAddress();
      const amount = ethers.parseEther("3");

      await expect(
        feeManager.connect(swapRouter).collectFee(tokenAddress, amount)
      ).to.emit(feeManager, "FeeCollected");

      expect(await feeManager.collectedFees(tokenAddress)).to.equal(amount);
    });

    it("should revert if not called by SwapRouter", async function () {
      const { feeManager, token, user } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(user).collectFee(await token.getAddress(), ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(feeManager, "OnlySwapRouter");
    });

    it("should revert on zero token address", async function () {
      const { feeManager, swapRouter } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(swapRouter).collectFee(ethers.ZeroAddress, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(feeManager, "ZeroAddress");
    });

    it("should revert on zero amount", async function () {
      const { feeManager, token, swapRouter } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(swapRouter).collectFee(await token.getAddress(), 0n)
      ).to.be.revertedWithCustomError(feeManager, "ZeroAmount");
    });
  });

  describe("withdrawFees", function () {
    it("should withdraw fees to treasury", async function () {
      const { feeManager, token, treasury, swapRouter } = await loadFixture(deployFixture);
      const tokenAddress = await token.getAddress();
      const amount = ethers.parseEther("100");

      await feeManager.connect(swapRouter).collectFee(tokenAddress, amount);

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

    it("should revert if non-owner sets swap router", async function () {
      const { feeManager, user } = await loadFixture(deployFixture);

      await expect(
        feeManager.connect(user).setSwapRouter(user.address)
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount");
    });
  });
});
