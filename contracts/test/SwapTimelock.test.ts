import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SwapTimelock", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();

    const SwapTimelock = await ethers.getContractFactory("SwapTimelock");
    const timelock = await SwapTimelock.deploy();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TKN");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(owner.address);

    const timelockAddress = await timelock.getAddress();
    await feeManager.transferOwnership(timelockAddress);

    return { timelock, feeManager, token, owner, user };
  }

  describe("schedule", function () {
    it("should schedule an operation", async function () {
      const { timelock, feeManager } = await loadFixture(deployFixture);

      const feeManagerAddress = await feeManager.getAddress();
      const data = feeManager.interface.encodeFunctionData("setTreasury", [
        "0x0000000000000000000000000000000000000001",
      ]);

      await expect(
        timelock.schedule(feeManagerAddress, data)
      ).to.emit(timelock, "OperationScheduled");
    });

    it("should revert on zero address target", async function () {
      const { timelock } = await loadFixture(deployFixture);

      await expect(
        timelock.schedule(ethers.ZeroAddress, "0x")
      ).to.be.revertedWithCustomError(timelock, "ZeroAddress");
    });
  });

  describe("execute", function () {
    it("should execute after 24-hour delay", async function () {
      const { timelock, feeManager } = await loadFixture(deployFixture);

      const feeManagerAddress = await feeManager.getAddress();
      const newTreasury = "0x0000000000000000000000000000000000000001";
      const data = feeManager.interface.encodeFunctionData("setTreasury", [newTreasury]);

      const tx = await timelock.schedule(feeManagerAddress, data);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return timelock.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "OperationScheduled";
        } catch { return false; }
      });
      const parsed = timelock.interface.parseLog({ topics: [...event!.topics], data: event!.data });
      const operationId = parsed?.args[0];

      await time.increase(24 * 60 * 60 + 1);

      await expect(
        timelock.execute(operationId)
      ).to.emit(timelock, "OperationExecuted");

      expect(await feeManager.treasury()).to.equal(newTreasury);
    });

    it("should revert if delay has not passed", async function () {
      const { timelock, feeManager } = await loadFixture(deployFixture);

      const feeManagerAddress = await feeManager.getAddress();
      const data = feeManager.interface.encodeFunctionData("setTreasury", [
        "0x0000000000000000000000000000000000000001",
      ]);

      const tx = await timelock.schedule(feeManagerAddress, data);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return timelock.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "OperationScheduled";
        } catch { return false; }
      });
      const parsed = timelock.interface.parseLog({ topics: [...event!.topics], data: event!.data });
      const operationId = parsed?.args[0];

      await expect(
        timelock.execute(operationId)
      ).to.be.revertedWithCustomError(timelock, "OperationNotReady");
    });

    it("should revert if operation expired", async function () {
      const { timelock, feeManager } = await loadFixture(deployFixture);

      const feeManagerAddress = await feeManager.getAddress();
      const data = feeManager.interface.encodeFunctionData("setTreasury", [
        "0x0000000000000000000000000000000000000001",
      ]);

      const tx = await timelock.schedule(feeManagerAddress, data);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return timelock.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "OperationScheduled";
        } catch { return false; }
      });
      const parsed = timelock.interface.parseLog({ topics: [...event!.topics], data: event!.data });
      const operationId = parsed?.args[0];

      await time.increase(72 * 60 * 60 + 1);

      await expect(
        timelock.execute(operationId)
      ).to.be.revertedWithCustomError(timelock, "OperationExpired");
    });
  });

  describe("cancel", function () {
    it("should cancel a scheduled operation", async function () {
      const { timelock, feeManager } = await loadFixture(deployFixture);

      const feeManagerAddress = await feeManager.getAddress();
      const data = feeManager.interface.encodeFunctionData("setTreasury", [
        "0x0000000000000000000000000000000000000001",
      ]);

      const tx = await timelock.schedule(feeManagerAddress, data);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return timelock.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "OperationScheduled";
        } catch { return false; }
      });
      const parsed = timelock.interface.parseLog({ topics: [...event!.topics], data: event!.data });
      const operationId = parsed?.args[0];

      await expect(
        timelock.cancel(operationId)
      ).to.emit(timelock, "OperationCancelled");
    });
  });

  describe("access control", function () {
    it("should revert if non-owner schedules", async function () {
      const { timelock, feeManager, user } = await loadFixture(deployFixture);

      await expect(
        timelock.connect(user).schedule(await feeManager.getAddress(), "0x")
      ).to.be.revertedWithCustomError(timelock, "OwnableUnauthorizedAccount");
    });
  });
});
