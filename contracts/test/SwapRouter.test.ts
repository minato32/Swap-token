import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SwapRouter", function () {
  const DEST_EID = 40267;
  const LZ_FEE = ethers.parseEther("0.01");

  async function deployFixture() {
    const [owner, user, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");
    const toToken = await MockERC20.deploy("Dest Token", "DTKN");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(treasury.address);

    const TokenVault = await ethers.getContractFactory("TokenVault");
    const tokenVault = await TokenVault.deploy();

    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const lzEndpoint = await MockLzEndpoint.deploy();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = await BridgeAdapter.deploy(
      await lzEndpoint.getAddress(),
      owner.address
    );

    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy();

    await swapRouter.setBridgeAdapter(await bridgeAdapter.getAddress());
    await swapRouter.setTokenVault(await tokenVault.getAddress());
    await swapRouter.setFeeManager(await feeManager.getAddress());
    await tokenVault.setSwapRouter(await swapRouter.getAddress());
    await tokenVault.setBridgeAdapter(await bridgeAdapter.getAddress());
    await bridgeAdapter.setSwapRouter(await swapRouter.getAddress());
    await bridgeAdapter.setTokenVault(await tokenVault.getAddress());
    await feeManager.setSwapRouter(await swapRouter.getAddress());

    const peerBytes32 = ethers.zeroPadValue(await bridgeAdapter.getAddress(), 32);
    await bridgeAdapter.setPeer(DEST_EID, peerBytes32);

    const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
    const mockUniswapRouter = await MockUniswapRouter.deploy();
    await swapRouter.setUniswapRouter(await mockUniswapRouter.getAddress());

    const mintAmount = ethers.parseEther("10000");
    await token.mint(user.address, mintAmount);
    await token.connect(user).approve(await swapRouter.getAddress(), mintAmount);

    return { swapRouter, token, toToken, feeManager, tokenVault, bridgeAdapter, lzEndpoint, mockUniswapRouter, owner, user, treasury };
  }

  describe("swapAndBridge", function () {
    it("should execute a successful swap with default 0.15% tier", async function () {
      const { swapRouter, token, toToken, user, feeManager, tokenVault } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("998");

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          amount,
          DEST_EID,
          user.address,
          minOut,
          "0x",
          { value: LZ_FEE }
        )
      ).to.emit(swapRouter, "SwapInitiated");

      const expectedFee = (amount * 15n) / 10000n;
      const expectedAfterFee = amount - expectedFee;

      expect(await token.balanceOf(await feeManager.getAddress())).to.equal(expectedFee);
      expect(await token.balanceOf(await tokenVault.getAddress())).to.equal(expectedAfterFee);
    });

    it("should use pair-specific fee tier when set", async function () {
      const { swapRouter, token, toToken, user, feeManager, tokenVault } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await feeManager.setPairFee(await token.getAddress(), await toToken.getAddress(), 5n);

      const expectedFee = (amount * 5n) / 10000n;
      const minOut = amount - expectedFee;

      await swapRouter.connect(user).swapAndBridge(
        await token.getAddress(),
        await toToken.getAddress(),
        amount,
        DEST_EID,
        user.address,
        minOut,
        "0x",
        { value: LZ_FEE }
      );

      expect(await token.balanceOf(await feeManager.getAddress())).to.equal(expectedFee);
      expect(await token.balanceOf(await tokenVault.getAddress())).to.equal(amount - expectedFee);
    });

    it("should create a deposit record in TokenVault", async function () {
      const { swapRouter, token, toToken, user, tokenVault } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("997");

      const tx = await swapRouter.connect(user).swapAndBridge(
        await token.getAddress(),
        await toToken.getAddress(),
        amount,
        DEST_EID,
        user.address,
        minOut,
        "0x",
        { value: LZ_FEE }
      );

      const receipt = await tx.wait();
      const swapLog = receipt?.logs.find(
        (log) => swapRouter.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "SwapInitiated"
      );
      const parsed = swapRouter.interface.parseLog({ topics: [...swapLog!.topics], data: swapLog!.data });
      const depositId = parsed!.args.depositId;

      const deposit = await tokenVault.deposits(depositId);
      expect(deposit.amount).to.be.gt(0n);
      expect(deposit.sender).to.equal(user.address);
      expect(deposit.released).to.be.false;
      expect(deposit.refunded).to.be.false;
    });

    it("should update FeeManager accounting", async function () {
      const { swapRouter, token, toToken, user, feeManager } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("997");
      const expectedFee = (amount * 15n) / 10000n;

      await swapRouter.connect(user).swapAndBridge(
        await token.getAddress(),
        await toToken.getAddress(),
        amount,
        DEST_EID,
        user.address,
        minOut,
        "0x",
        { value: LZ_FEE }
      );

      expect(await feeManager.collectedFees(await token.getAddress())).to.equal(expectedFee);
    });

    it("should revert on slippage exceeded", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("999");

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          amount,
          DEST_EID,
          user.address,
          minOut,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "SlippageExceeded");
    });

    it("should revert on zero amount", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          0n,
          DEST_EID,
          user.address,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAmount");
    });

    it("should revert on zero destEid", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("100"),
          0,
          user.address,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "InvalidDestEid");
    });
  });

  describe("swapOnChain", function () {
    it("should execute a same-chain swap with zero protocol fee", async function () {
      const { swapRouter, token, toToken, user, feeManager } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const minOut = ethers.parseEther("990");

      await expect(
        swapRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          amount,
          minOut,
          3000
        )
      ).to.emit(swapRouter, "SwapExecuted");

      expect(await token.balanceOf(await feeManager.getAddress())).to.equal(0n);
      expect(await toToken.balanceOf(user.address)).to.equal(amount);
    });

    it("should pass full amount to Uniswap with no fee deduction", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await swapRouter.connect(user).swapOnChain(
        await token.getAddress(),
        await toToken.getAddress(),
        amount,
        0n,
        3000
      );

      expect(await toToken.balanceOf(user.address)).to.equal(amount);
    });

    it("should revert on zero amount", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          0n,
          0n,
          3000
        )
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAmount");
    });

    it("should revert if Uniswap router not set", async function () {
      const { token, toToken, user, feeManager, owner } = await loadFixture(deployFixture);

      const SwapRouter = await ethers.getContractFactory("SwapRouter");
      const freshRouter = await SwapRouter.deploy();
      await freshRouter.setFeeManager(await feeManager.getAddress());

      const amount = ethers.parseEther("100");
      await token.mint(user.address, amount);
      await token.connect(user).approve(await freshRouter.getAddress(), amount);

      await expect(
        freshRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          amount,
          0n,
          3000
        )
      ).to.be.revertedWithCustomError(freshRouter, "UniswapRouterNotSet");
    });

    it("should revert on slippage exceeded", async function () {
      const { swapRouter, token, toToken, user, mockUniswapRouter } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await mockUniswapRouter.setExchangeRate(1, 2);

      await expect(
        swapRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          amount,
          ethers.parseEther("99"),
          3000
        )
      ).to.be.revertedWith("Too little received");
    });
  });

  describe("validation & edge cases", function () {
    it("should revert if swap amount exceeds max", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);

      await swapRouter.setMaxSwapAmount(ethers.parseEther("500"));
      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("501"),
          DEST_EID,
          user.address,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "SwapAmountTooLarge");
    });

    it("should revert if contract is paused", async function () {
      const { swapRouter, token, toToken, user, owner } = await loadFixture(deployFixture);

      await swapRouter.connect(owner).pause();
      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("100"),
          DEST_EID,
          user.address,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "EnforcedPause");
    });

    it("should revert swapOnChain if contract is paused", async function () {
      const { swapRouter, token, toToken, user, owner } = await loadFixture(deployFixture);

      await swapRouter.connect(owner).pause();
      await expect(
        swapRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("100"),
          0n,
          3000
        )
      ).to.be.revertedWithCustomError(swapRouter, "EnforcedPause");
    });

    it("should resume after unpause", async function () {
      const { swapRouter, token, toToken, user, owner } = await loadFixture(deployFixture);

      await swapRouter.connect(owner).pause();
      await swapRouter.connect(owner).unpause();

      await expect(
        swapRouter.connect(user).swapOnChain(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("10"),
          0n,
          3000
        )
      ).to.emit(swapRouter, "SwapExecuted");
    });

    it("should revert on zero token address", async function () {
      const { swapRouter, toToken, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapAndBridge(
          ethers.ZeroAddress,
          await toToken.getAddress(),
          ethers.parseEther("100"),
          DEST_EID,
          user.address,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAddress");
    });

    it("should revert on zero recipient address", async function () {
      const { swapRouter, token, toToken, user } = await loadFixture(deployFixture);

      await expect(
        swapRouter.connect(user).swapAndBridge(
          await token.getAddress(),
          await toToken.getAddress(),
          ethers.parseEther("100"),
          DEST_EID,
          ethers.ZeroAddress,
          0n,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAddress");
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
