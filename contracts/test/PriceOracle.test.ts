import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PriceOracle", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Token A", "TKA");
    const tokenB = await MockERC20.deploy("Token B", "TKB");

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(true);

    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();

    await oracle.setFallbackPrice(tokenAAddress, ethers.parseEther("1"));
    await oracle.setFallbackPrice(tokenBAddress, ethers.parseEther("1"));

    return { oracle, tokenA, tokenB, tokenAAddress, tokenBAddress, owner, user };
  }

  describe("fallback prices", function () {
    it("should return fallback price when set", async function () {
      const { oracle, tokenAAddress } = await loadFixture(deployFixture);

      const price = await oracle.getPrice(tokenAAddress);
      expect(price).to.equal(ethers.parseEther("1"));
    });

    it("should revert if fallback price not set", async function () {
      const { oracle } = await loadFixture(deployFixture);

      await expect(
        oracle.getPrice(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(oracle, "FallbackPriceNotSet");
    });

    it("should allow owner to update fallback price", async function () {
      const { oracle, tokenAAddress } = await loadFixture(deployFixture);

      await oracle.setFallbackPrice(tokenAAddress, ethers.parseEther("2"));
      const price = await oracle.getPrice(tokenAAddress);
      expect(price).to.equal(ethers.parseEther("2"));
    });
  });

  describe("validateSwapPrice", function () {
    it("should accept swap within deviation bounds", async function () {
      const { oracle, tokenAAddress, tokenBAddress } = await loadFixture(deployFixture);
      const input = ethers.parseEther("100");
      const output = ethers.parseEther("99");

      const valid = await oracle.validateSwapPrice.staticCall(
        tokenAAddress, tokenBAddress, input, output
      );
      expect(valid).to.be.true;
    });

    it("should reject swap with excessive deviation", async function () {
      const { oracle, tokenAAddress, tokenBAddress } = await loadFixture(deployFixture);
      const input = ethers.parseEther("100");
      const output = ethers.parseEther("40");

      await expect(
        oracle.validateSwapPrice(tokenAAddress, tokenBAddress, input, output)
      ).to.be.revertedWithCustomError(oracle, "PriceDeviationTooHigh");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner sets fallback price", async function () {
      const { oracle, tokenAAddress, user } = await loadFixture(deployFixture);

      await expect(
        oracle.connect(user).setFallbackPrice(tokenAAddress, ethers.parseEther("5"))
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("should revert if non-owner sets max deviation", async function () {
      const { oracle, user } = await loadFixture(deployFixture);

      await expect(
        oracle.connect(user).setMaxDeviation(1000)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });
  });
});
