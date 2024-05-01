// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ITokenVault {
    function lockTokens(bytes32 _depositId, address _token, uint256 _amount, address _sender) external;
}

interface IBridgeAdapter {
    function sendBridgeMessage(
        uint32 _dstEid,
        address _token,
        uint256 _amount,
        address _recipient,
        bytes32 _depositId,
        address _refundAddress,
        bytes calldata _options
    ) external payable;
}

interface IFeeManager {
    function getFeeBps(address _tokenA, address _tokenB) external view returns (uint256);
    function collectFee(address _token, uint256 _amount) external;
}

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title SwapRouter
 * @author CrossChain Swap System
 * @notice Main entry point for cross-chain and same-chain token swaps
 */
contract SwapRouter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Address of the BridgeAdapter contract
    address public bridgeAdapter;

    /// @notice Address of the TokenVault contract
    address public tokenVault;

    /// @notice Address of the FeeManager contract
    address public feeManager;

    /// @notice Address of the Uniswap V3 SwapRouter02 for same-chain swaps
    address public uniswapRouter;

    /// @notice Maximum allowed slippage in basis points (100 = 1%)
    uint256 public maxSlippageBps = 100;

    /// @notice Maximum swap amount per transaction (prevents whale manipulation)
    uint256 public maxSwapAmount = 1_000_000 * 1e18;

    /// @notice Counter for generating unique deposit IDs
    uint256 public depositNonce;

    event SwapInitiated(
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint32 destEid,
        address recipient,
        uint256 amountAfterFee,
        bytes32 depositId,
        uint256 timestamp
    );

    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint24 poolFee,
        uint256 timestamp
    );

    event BridgeAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);
    event UniswapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event TokenVaultUpdated(address indexed oldVault, address indexed newVault);
    event FeeManagerUpdated(address indexed oldManager, address indexed newManager);
    event MaxSlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    event MaxSwapAmountUpdated(uint256 oldAmount, uint256 newAmount);

    error ZeroAmount();
    error ZeroAddress();
    error InvalidDestEid();
    error SlippageExceeded(uint256 amountAfterFee, uint256 minAmountOut);
    error BridgeAdapterNotSet();
    error TokenVaultNotSet();
    error FeeManagerNotSet();
    error SlippageTooHigh();
    error SwapAmountTooLarge();
    error UniswapRouterNotSet();

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert ZeroAmount();
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @notice Initiate a cross-chain token swap
     * @param token The ERC20 token address to swap (source chain)
     * @param toToken The destination token address (used for fee tier lookup)
     * @param amount The amount of tokens to swap
     * @param destEid The LayerZero V2 endpoint ID of the destination chain
     * @param recipient The address that receives tokens on the destination chain
     * @param minAmountOut The minimum acceptable output amount (slippage protection)
     * @param options LayerZero messaging options (pass empty bytes for defaults)
     */
    function swapAndBridge(
        address token,
        address toToken,
        uint256 amount,
        uint32 destEid,
        address recipient,
        uint256 minAmountOut,
        bytes calldata options
    ) external payable nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > maxSwapAmount) revert SwapAmountTooLarge();
        if (token == address(0)) revert ZeroAddress();
        if (toToken == address(0)) revert ZeroAddress();
        if (recipient == address(0)) revert ZeroAddress();
        if (destEid == 0) revert InvalidDestEid();
        if (bridgeAdapter == address(0)) revert BridgeAdapterNotSet();
        if (tokenVault == address(0)) revert TokenVaultNotSet();
        if (feeManager == address(0)) revert FeeManagerNotSet();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 feeBps = IFeeManager(feeManager).getFeeBps(token, toToken);
        uint256 feeAmount = (amount * feeBps) / 10_000;
        uint256 amountAfterFee = amount - feeAmount;

        if (amountAfterFee < minAmountOut) {
            revert SlippageExceeded(amountAfterFee, minAmountOut);
        }

        if (feeAmount > 0) {
            IERC20(token).safeTransfer(feeManager, feeAmount);
            IFeeManager(feeManager).collectFee(token, feeAmount);
        }

        depositNonce++;
        bytes32 depositId = keccak256(
            abi.encodePacked(block.chainid, msg.sender, token, amountAfterFee, depositNonce, block.timestamp)
        );

        IERC20(token).forceApprove(tokenVault, amountAfterFee);
        ITokenVault(tokenVault).lockTokens(depositId, token, amountAfterFee, msg.sender);

        IBridgeAdapter(bridgeAdapter).sendBridgeMessage{value: msg.value}(
            destEid, token, amountAfterFee, recipient, depositId, msg.sender, options
        );

        emit SwapInitiated(
            msg.sender,
            token,
            amount,
            destEid,
            recipient,
            amountAfterFee,
            depositId,
            block.timestamp
        );
    }

    /**
     * @notice Execute a same-chain token swap via Uniswap V3
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @param amount The amount of input tokens
     * @param minAmountOut The minimum acceptable output amount (slippage protection)
     * @param poolFee The Uniswap V3 pool fee tier (500, 3000, or 10000)
     */
    function swapOnChain(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minAmountOut,
        uint24 poolFee
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > maxSwapAmount) revert SwapAmountTooLarge();
        if (tokenIn == address(0) || tokenOut == address(0)) revert ZeroAddress();
        if (uniswapRouter == address(0)) revert UniswapRouterNotSet();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);

        IERC20(tokenIn).forceApprove(uniswapRouter, amount);

        uint256 amountOut = ISwapRouter02(uniswapRouter).exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                amountIn: amount,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenIn).forceApprove(uniswapRouter, 0);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amount, amountOut, poolFee, block.timestamp);
    }

    /**
     * @notice Set the Uniswap V3 SwapRouter02 address for same-chain swaps
     * @param _uniswapRouter Address of the Uniswap V3 SwapRouter02
     */
    function setUniswapRouter(address _uniswapRouter) external onlyOwner {
        if (_uniswapRouter == address(0)) revert ZeroAddress();
        address old = uniswapRouter;
        uniswapRouter = _uniswapRouter;
        emit UniswapRouterUpdated(old, _uniswapRouter);
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
