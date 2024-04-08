import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SwapRouter", function () {
  async function deployFixture() {
    const [owner, user, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(treasury.address);

    const TokenVault = await ethers.getContractFactory("TokenVault");
    const tokenVault = await TokenVault.deploy();

    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const lzEndpoint = await MockLzEndpoint.deploy();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = await BridgeAdapter.deploy(await lzEndpoint.getAddress());

    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy();

    await swapRouter.setBridgeAdapter(await bridgeAdapter.getAddress());
    await swapRouter.setTokenVault(await tokenVault.getAddress());
    await swapRouter.setFeeManager(await feeManager.getAddress());
    await tokenVault.setSwapRouter(await swapRouter.getAddress());

    const mintAmount = ethers.parseEther("10000");
    await token.mint(user.address, mintAmount);
    await token.connect(user).approve(await swapRouter.getAddress(), mintAmount);

    return { swapRouter, token, feeManager, tokenVault, bridgeAdapter, owner, user, treasury };
  }

  describe("swapAndBridge", function () {
    it("should execute a successful swap", async function () {
      const { swapRouter, token, user, feeManager, tokenVault } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("997"); // 0.3% fee = 3 tokens

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          amount,
          80001n,
          user.address,
          minOut
        )
      ).to.emit(swapRouter, "SwapInitiated");

      const expectedFee = (amount * 30n) / 10000n;
      const expectedAfterFee = amount - expectedFee;

      expect(await token.balanceOf(await feeManager.getAddress())).to.equal(expectedFee);
      expect(await token.balanceOf(await tokenVault.getAddress())).to.equal(expectedAfterFee);
    });

    it("should revert on slippage exceeded", async function () {
      const { swapRouter, token, user } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("999"); // expects 999 but gets 997

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          amount,
          80001n,
          user.address,
          minOut
        )
      ).to.be.revertedWithCustomError(swapRouter, "SlippageExceeded");
    });

    it("should revert on zero amount", async function () {
      const { swapRouter, token, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          0n,
          80001n,
          user.address,
          0n
        )
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAmount");
    });

    it("should revert on same chain destination", async function () {
      const { swapRouter, token, user } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          ethers.parseEther("100"),
          chainId,
          user.address,
          0n
        )
      ).to.be.revertedWithCustomError(swapRouter, "InvalidChainId");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner sets bridge adapter", async function () {
      const { swapRouter, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).setBridgeAdapter(user.address)
      ).to.be.revertedWithCustomError(swapRouter, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner sets max slippage", async function () {
      const { swapRouter, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).setMaxSlippage(200n)
      ).to.be.revertedWithCustomError(swapRouter, "OwnableUnauthorizedAccount");
    });

    it("should revert if slippage set above 5%", async function () {
      const { swapRouter, owner } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(owner).setMaxSlippage(501n)
      ).to.be.revertedWithCustomError(swapRouter, "SlippageTooHigh");
    });
  });
});
