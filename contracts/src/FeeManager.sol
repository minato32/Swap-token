// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeManager
 * @author CrossChain Swap System
 * @notice Collects and manages swap fees for the protocol treasury
 */
contract FeeManager is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Protocol fee in basis points (30 = 0.3%)
    uint256 public constant FEE_BPS = 30;

    /// @notice Maximum fee cap in basis points (100 = 1%)
    uint256 public constant MAX_FEE_BPS = 100;

    /// @notice Address that receives withdrawn fees
    address public treasury;

    /// @notice Address of the SwapRouter contract
    address public swapRouter;

    /// @notice Accumulated fees per token
    mapping(address => uint256) public collectedFees;

    event FeeCollected(address indexed token, uint256 amount);
    event FeeWithdrawn(address indexed token, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error ZeroAddress();
    error ZeroAmount();
    error TreasuryNotSet();
    error InsufficientFees();
    error OnlySwapRouter();

    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);

    /**
     * @notice Initialize with a treasury address
     * @param _treasury Address that receives withdrawn fees
     */
    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    /**
     * @notice Calculate the fee for a given amount
     * @param _amount The input amount
     * @return The fee amount
     */
    function calculateFee(uint256 _amount) external pure returns (uint256) {
        return (_amount * FEE_BPS) / 10_000;
    }

    /**
     * @notice Record collected fees for a token
     * @param _token Address of the ERC20 token
     * @param _amount Amount of fees collected
     */
    function collectFee(address _token, uint256 _amount) external {
        if (msg.sender != swapRouter) revert OnlySwapRouter();
        if (_token == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();

        collectedFees[_token] += _amount;

        emit FeeCollected(_token, _amount);
    }

    /**
     * @notice Withdraw collected fees to the treasury
     * @param _token Address of the ERC20 token to withdraw
     */
    function withdrawFees(address _token) external onlyOwner {
        if (treasury == address(0)) revert TreasuryNotSet();

        uint256 amount = collectedFees[_token];
        if (amount == 0) revert InsufficientFees();

        collectedFees[_token] = 0;

        IERC20(_token).safeTransfer(treasury, amount);

        emit FeeWithdrawn(_token, treasury, amount);
    }

    /**
     * @notice Update the treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    /**
     * @notice Set the SwapRouter contract address
     * @param _swapRouter Address of the deployed SwapRouter
     */
    function setSwapRouter(address _swapRouter) external onlyOwner {
        if (_swapRouter == address(0)) revert ZeroAddress();
        address old = swapRouter;
        swapRouter = _swapRouter;
        emit SwapRouterUpdated(old, _swapRouter);
    }
}
