import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("BridgeAdapter", function () {
  const DEST_EID = 40267;
  const SRC_EID = 40161;
  const LZ_FEE = ethers.parseEther("0.01");
  const DEPOSIT_ID = ethers.keccak256(ethers.toUtf8Bytes("test-deposit-1"));

  async function deployFixture() {
    const [owner, swapRouterSigner, user] = await ethers.getSigners();

    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const lzEndpoint = await MockLzEndpoint.deploy();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = await BridgeAdapter.deploy(
      await lzEndpoint.getAddress(),
      owner.address
    );

    await bridgeAdapter.setSwapRouter(swapRouterSigner.address);

    const peerBytes32 = ethers.zeroPadValue(await bridgeAdapter.getAddress(), 32);
    await bridgeAdapter.setPeer(DEST_EID, peerBytes32);
    await bridgeAdapter.setPeer(SRC_EID, peerBytes32);

    return { bridgeAdapter, lzEndpoint, owner, swapRouterSigner, user };
  }

  async function deployFullFixture() {
    const [owner, user, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");

    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const lzEndpoint = await MockLzEndpoint.deploy();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = await BridgeAdapter.deploy(
      await lzEndpoint.getAddress(),
      owner.address
    );

    const TokenVault = await ethers.getContractFactory("TokenVault");
    const tokenVault = await TokenVault.deploy();

    await tokenVault.setBridgeAdapter(await bridgeAdapter.getAddress());
    await bridgeAdapter.setTokenVault(await tokenVault.getAddress());

    const peerBytes32 = ethers.zeroPadValue(await bridgeAdapter.getAddress(), 32);
    await bridgeAdapter.setPeer(SRC_EID, peerBytes32);

    const prefundAmount = ethers.parseEther("5000");
    await token.mint(await tokenVault.getAddress(), prefundAmount);

    return { bridgeAdapter, lzEndpoint, tokenVault, token, owner, user, treasury };
  }

  describe("sendBridgeMessage", function () {
    it("should send a cross-chain message", async function () {
      const { bridgeAdapter, swapRouterSigner, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(swapRouterSigner).sendBridgeMessage(
          DEST_EID,
          user.address,
          ethers.parseEther("100"),
          user.address,
          DEPOSIT_ID,
          "0x",
          { value: LZ_FEE }
        )
      ).to.emit(bridgeAdapter, "MessageSent");
    });

    it("should revert if not called by SwapRouter", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).sendBridgeMessage(
          DEST_EID,
          user.address,
          ethers.parseEther("100"),
          user.address,
          DEPOSIT_ID,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(bridgeAdapter, "OnlySwapRouter");
    });

    it("should revert if peer not set", async function () {
      const { bridgeAdapter, swapRouterSigner, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(swapRouterSigner).sendBridgeMessage(
          99999,
          user.address,
          ethers.parseEther("100"),
          user.address,
          DEPOSIT_ID,
          "0x",
          { value: LZ_FEE }
        )
      ).to.be.revertedWithCustomError(bridgeAdapter, "NoPeer");
    });
  });

  describe("lzReceive (via simulateReceive)", function () {
    it("should release tokens to recipient on valid message", async function () {
      const { bridgeAdapter, lzEndpoint, tokenVault, token, owner, user } =
        await loadFixture(deployFullFixture);

      const amount = ethers.parseEther("100");
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("receive-test-1"));

      await tokenVault.setSwapRouter(owner.address);
      await token.connect(owner).approve(await tokenVault.getAddress(), amount);
      await token.mint(owner.address, amount);
      await tokenVault.lockTokens(depositId, await token.getAddress(), amount, owner.address);

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "address", "bytes32"],
        [await token.getAddress(), amount, user.address, depositId]
      );

      const senderBytes32 = ethers.zeroPadValue(await bridgeAdapter.getAddress(), 32);

      const balanceBefore = await token.balanceOf(user.address);

      await lzEndpoint.simulateReceive(
        await bridgeAdapter.getAddress(),
        SRC_EID,
        senderBytes32,
        1n,
        payload
      );

      const balanceAfter = await token.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("should reject replayed messages", async function () {
      const { bridgeAdapter, lzEndpoint, tokenVault, token, owner, user } =
        await loadFixture(deployFullFixture);

      const amount = ethers.parseEther("50");
      const depositId = ethers.keccak256(ethers.toUtf8Bytes("replay-test"));

      await tokenVault.setSwapRouter(owner.address);
      await token.mint(owner.address, amount);
      await token.connect(owner).approve(await tokenVault.getAddress(), amount);
      await tokenVault.lockTokens(depositId, await token.getAddress(), amount, owner.address);

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "address", "bytes32"],
        [await token.getAddress(), amount, user.address, depositId]
      );

      const senderBytes32 = ethers.zeroPadValue(await bridgeAdapter.getAddress(), 32);

      await lzEndpoint.simulateReceive(
        await bridgeAdapter.getAddress(), SRC_EID, senderBytes32, 1n, payload
      );

      await expect(
        lzEndpoint.simulateReceive(
          await bridgeAdapter.getAddress(), SRC_EID, senderBytes32, 1n, payload
        )
      ).to.be.revertedWithCustomError(bridgeAdapter, "NonceAlreadyProcessed");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner sets peer", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);
      const peerBytes32 = ethers.zeroPadValue(user.address, 32);

      await expect(
        bridgeAdapter.connect(user).setPeer(DEST_EID, peerBytes32)
      ).to.be.revertedWithCustomError(bridgeAdapter, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner sets swap router", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).setSwapRouter(user.address)
      ).to.be.revertedWithCustomError(bridgeAdapter, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner sets token vault", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).setTokenVault(user.address)
      ).to.be.revertedWithCustomError(bridgeAdapter, "OwnableUnauthorizedAccount");
    });
  });
});
