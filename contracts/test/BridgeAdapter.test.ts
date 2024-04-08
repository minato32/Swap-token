import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("BridgeAdapter", function () {
  async function deployFixture() {
    const [owner, swapRouterSigner, user] = await ethers.getSigners();

    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const lzEndpoint = await MockLzEndpoint.deploy();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = await BridgeAdapter.deploy(await lzEndpoint.getAddress());

    await bridgeAdapter.setSwapRouter(swapRouterSigner.address);

    const trustedRemote = ethers.solidityPacked(
      ["address", "address"],
      [user.address, await bridgeAdapter.getAddress()]
    );
    await bridgeAdapter.setTrustedRemote(10109, trustedRemote);

    return { bridgeAdapter, lzEndpoint, owner, swapRouterSigner, user };
  }

  describe("lzSend", function () {
    it("should send a cross-chain message", async function () {
      const { bridgeAdapter, swapRouterSigner, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(swapRouterSigner).lzSend(
          10109,
          user.address,
          ethers.parseEther("100"),
          user.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.emit(bridgeAdapter, "MessageSent");

      expect(await bridgeAdapter.outboundNonce()).to.equal(1n);
    });

    it("should revert if not called by SwapRouter", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).lzSend(
          10109,
          user.address,
          ethers.parseEther("100"),
          user.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWithCustomError(bridgeAdapter, "OnlySwapRouter");
    });

    it("should revert if trusted remote not set", async function () {
      const { bridgeAdapter, swapRouterSigner, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(swapRouterSigner).lzSend(
          10110, // chain with no trusted remote
          user.address,
          ethers.parseEther("100"),
          user.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWithCustomError(bridgeAdapter, "TrustedRemoteNotSet");
    });

    it("should increment nonce on each send", async function () {
      const { bridgeAdapter, swapRouterSigner, user } = await loadFixture(deployFixture);

      await bridgeAdapter.connect(swapRouterSigner).lzSend(
        10109, user.address, ethers.parseEther("100"), user.address,
        { value: ethers.parseEther("0.01") }
      );

      await bridgeAdapter.connect(swapRouterSigner).lzSend(
        10109, user.address, ethers.parseEther("200"), user.address,
        { value: ethers.parseEther("0.01") }
      );

      expect(await bridgeAdapter.outboundNonce()).to.equal(2n);
    });
  });

  describe("lzReceive", function () {
    it("should reject calls from non-endpoint", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "address", "uint64"],
        [user.address, ethers.parseEther("100"), user.address, 1n]
      );

      await expect(
        bridgeAdapter.connect(user).lzReceive(10109, "0x", 1n, payload)
      ).to.be.revertedWithCustomError(bridgeAdapter, "OnlyLzEndpoint");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner sets trusted remote", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).setTrustedRemote(10109, "0x1234")
      ).to.be.revertedWithCustomError(bridgeAdapter, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner sets swap router", async function () {
      const { bridgeAdapter, user } = await loadFixture(deployFixture);

      await expect(
        bridgeAdapter.connect(user).setSwapRouter(user.address)
      ).to.be.revertedWithCustomError(bridgeAdapter, "OwnableUnauthorizedAccount");
    });
  });
});
