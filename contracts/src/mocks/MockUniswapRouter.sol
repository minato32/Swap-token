// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title MockUniswapRouter
 * @notice Test-only mock of Uniswap V3 SwapRouter02 for same-chain swap testing
 */
contract MockUniswapRouter {
    using SafeERC20 for IERC20;

    uint256 public exchangeRateNumerator = 1;
    uint256 public exchangeRateDenominator = 1;

    event MockSwap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address recipient);

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        amountOut = (params.amountIn * exchangeRateNumerator) / exchangeRateDenominator;
        require(amountOut >= params.amountOutMinimum, "Too little received");

        IMockERC20(params.tokenOut).mint(params.recipient, amountOut);

        emit MockSwap(params.tokenIn, params.tokenOut, params.amountIn, amountOut, params.recipient);
    }

    function setExchangeRate(uint256 _numerator, uint256 _denominator) external {
        exchangeRateNumerator = _numerator;
        exchangeRateDenominator = _denominator;
    }
}
