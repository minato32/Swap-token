import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SecurityMonitor", function () {
  async function deployFixture() {
    const [owner, user, attacker] = await ethers.getSigners();

    const SecurityMonitor = await ethers.getContractFactory("SecurityMonitor");
    const monitor = await SecurityMonitor.deploy();

    return { monitor, owner, user, attacker };
  }

  describe("recordSwap", function () {
    it("should record a normal swap without flagging", async function () {
      const { monitor, user } = await loadFixture(deployFixture);

      await monitor.recordSwap(user.address, ethers.parseEther("10"));

      const [swapCount, volume, flagged] = await monitor.getUserSummary(user.address);
      expect(swapCount).to.equal(1);
      expect(volume).to.equal(ethers.parseEther("10"));
      expect(flagged).to.be.false;
    });

    it("should flag large swaps", async function () {
      const { monitor, user } = await loadFixture(deployFixture);

      await expect(
        monitor.recordSwap(user.address, ethers.parseEther("1001"))
      ).to.emit(monitor, "LargeSwapDetected");

      const [, , flagged] = await monitor.getUserSummary(user.address);
      expect(flagged).to.be.true;
    });

    it("should flag rapid swaps exceeding window limit", async function () {
      const { monitor, user } = await loadFixture(deployFixture);

      for (let i = 0; i < 10; i++) {
        await monitor.recordSwap(user.address, ethers.parseEther("1"));
      }

      await expect(
        monitor.recordSwap(user.address, ethers.parseEther("1"))
      ).to.emit(monitor, "RapidSwapDetected");
    });

    it("should revert if address is blacklisted", async function () {
      const { monitor, attacker } = await loadFixture(deployFixture);

      await monitor.blacklistAddress(attacker.address);

      await expect(
        monitor.recordSwap(attacker.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(monitor, "AddressIsBlacklisted");
    });
  });

  describe("blacklist", function () {
    it("should blacklist an address", async function () {
      const { monitor, attacker } = await loadFixture(deployFixture);

      await expect(
        monitor.blacklistAddress(attacker.address)
      ).to.emit(monitor, "AddressBlacklisted");

      const [, , , isBlacklisted] = await monitor.getUserSummary(attacker.address);
      expect(isBlacklisted).to.be.true;
    });

    it("should remove from blacklist", async function () {
      const { monitor, attacker } = await loadFixture(deployFixture);

      await monitor.blacklistAddress(attacker.address);
      await monitor.removeFromBlacklist(attacker.address);

      const [, , , isBlacklisted] = await monitor.getUserSummary(attacker.address);
      expect(isBlacklisted).to.be.false;
    });
  });

  describe("access control", function () {
    it("should revert if non-owner blacklists", async function () {
      const { monitor, user, attacker } = await loadFixture(deployFixture);

      await expect(
        monitor.connect(user).blacklistAddress(attacker.address)
      ).to.be.revertedWithCustomError(monitor, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner changes threshold", async function () {
      const { monitor, user } = await loadFixture(deployFixture);

      await expect(
        monitor.connect(user).setLargeSwapThreshold(ethers.parseEther("500"))
      ).to.be.revertedWithCustomError(monitor, "OwnableUnauthorizedAccount");
    });
  });
});
