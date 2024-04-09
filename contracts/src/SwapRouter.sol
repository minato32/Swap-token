// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SwapRouter
 * @author CrossChain Swap System
 * @notice Main entry point for cross-chain token swaps
 */
contract SwapRouter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Address of the BridgeAdapter contract
    address public bridgeAdapter;

    /// @notice Address of the TokenVault contract
    address public tokenVault;

    /// @notice Address of the FeeManager contract
    address public feeManager;

    /// @notice Maximum allowed slippage in basis points (100 = 1%)
    uint256 public maxSlippageBps = 100;

    /// @notice Maximum swap amount per transaction (prevents whale manipulation)
    uint256 public maxSwapAmount = 1_000_000 * 1e18;

    event SwapInitiated(
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 amountAfterFee,
        uint256 timestamp
    );

    event BridgeAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);
    event TokenVaultUpdated(address indexed oldVault, address indexed newVault);
    event FeeManagerUpdated(address indexed oldManager, address indexed newManager);
    event MaxSlippageUpdated(uint256 oldSlippage, uint256 newSlippage);

    error ZeroAmount();
    error ZeroAddress();
    error InvalidChainId();
    error SlippageExceeded(uint256 amountAfterFee, uint256 minAmountOut);
    error BridgeAdapterNotSet();
    error TokenVaultNotSet();
    error FeeManagerNotSet();
    error SlippageTooHigh();
    error SwapAmountTooLarge();

    event MaxSwapAmountUpdated(uint256 oldAmount, uint256 newAmount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Initiate a cross-chain token swap
     * @param token The ERC20 token address to swap
     * @param amount The amount of tokens to swap
     * @param destChainId The destination chain ID
     * @param recipient The address that receives tokens on the destination chain
     * @param minAmountOut The minimum acceptable output amount (slippage protection)
     */
    function swapAndBridge(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > maxSwapAmount) revert SwapAmountTooLarge();
        if (token == address(0)) revert ZeroAddress();
        if (recipient == address(0)) revert ZeroAddress();
        if (destChainId == 0 || destChainId == block.chainid) revert InvalidChainId();
        if (bridgeAdapter == address(0)) revert BridgeAdapterNotSet();
        if (tokenVault == address(0)) revert TokenVaultNotSet();
        if (feeManager == address(0)) revert FeeManagerNotSet();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 feeAmount = _calculateFee(amount);
        uint256 amountAfterFee = amount - feeAmount;

        if (amountAfterFee < minAmountOut) {
            revert SlippageExceeded(amountAfterFee, minAmountOut);
        }

        if (feeAmount > 0) {
            IERC20(token).safeTransfer(feeManager, feeAmount);
        }

        IERC20(token).safeTransfer(tokenVault, amountAfterFee);

        emit SwapInitiated(
            msg.sender,
            token,
            amount,
            destChainId,
            recipient,
            amountAfterFee,
            block.timestamp
        );
    }

    /**
     * @notice Calculate the swap fee
     * @param amount The input amount
     * @return The fee amount (30 basis points = 0.3%)
     */
    function _calculateFee(uint256 amount) internal pure returns (uint256) {
        return (amount * 30) / 10_000;
    }

    /**
     * @notice Set the BridgeAdapter contract address
     * @param _bridgeAdapter Address of the deployed BridgeAdapter
     */
    function setBridgeAdapter(address _bridgeAdapter) external onlyOwner {
        if (_bridgeAdapter == address(0)) revert ZeroAddress();
        address old = bridgeAdapter;
        bridgeAdapter = _bridgeAdapter;
        emit BridgeAdapterUpdated(old, _bridgeAdapter);
    }

    /**
     * @notice Set the TokenVault contract address
     * @param _tokenVault Address of the deployed TokenVault
     */
    function setTokenVault(address _tokenVault) external onlyOwner {
        if (_tokenVault == address(0)) revert ZeroAddress();
        address old = tokenVault;
        tokenVault = _tokenVault;
        emit TokenVaultUpdated(old, _tokenVault);
    }

    /**
     * @notice Set the FeeManager contract address
     * @param _feeManager Address of the deployed FeeManager
     */
    function setFeeManager(address _feeManager) external onlyOwner {
        if (_feeManager == address(0)) revert ZeroAddress();
        address old = feeManager;
        feeManager = _feeManager;
        emit FeeManagerUpdated(old, _feeManager);
    }

    /**
     * @notice Update the maximum slippage tolerance
     * @param _maxSlippageBps New max slippage in basis points (max 500 = 5%)
     */
    function setMaxSlippage(uint256 _maxSlippageBps) external onlyOwner {
        if (_maxSlippageBps > 500) revert SlippageTooHigh();
        uint256 old = maxSlippageBps;
        maxSlippageBps = _maxSlippageBps;
        emit MaxSlippageUpdated(old, _maxSlippageBps);
    }

    /**
     * @notice Update the maximum swap amount per transaction
     * @param _maxSwapAmount New maximum swap amount
     */
    function setMaxSwapAmount(uint256 _maxSwapAmount) external onlyOwner {
        if (_maxSwapAmount == 0) revert ZeroAmount();
        uint256 old = maxSwapAmount;
        maxSwapAmount = _maxSwapAmount;
        emit MaxSwapAmountUpdated(old, _maxSwapAmount);
    }

    /// @notice Pause the contract in case of emergency
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume contract operations
    function unpause() external onlyOwner {
        _unpause();
    }
}
