// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeManager
 * @author CrossChain Swap System
 * @notice Uniswap V3-style tiered fee system for cross-chain swaps
 */
contract FeeManager is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Maximum fee cap in basis points (100 = 1%)
    uint256 public constant MAX_FEE_BPS = 100;

    /// @notice Default fee tier applied to cross-chain pairs without explicit assignment (15 = 0.15%)
    uint256 public defaultFeeBps = 15;

    /// @notice Valid fee tiers that can be assigned to pairs
    mapping(uint256 => bool) public validFeeTiers;

    /// @notice Fee tier assigned per token pair (sorted pair key => BPS)
    mapping(bytes32 => uint256) public pairFeeBps;

    /// @notice Whether a pair has an explicitly assigned tier
    mapping(bytes32 => bool) public pairFeeSet;

    /// @notice Address that receives withdrawn fees
    address public treasury;

    /// @notice Address of the SwapRouter contract
    address public swapRouter;

    /// @notice Accumulated fees per token
    mapping(address => uint256) public collectedFees;

    event FeeCollected(address indexed token, uint256 amount);
    event FeeWithdrawn(address indexed token, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event PairFeeSet(address indexed tokenA, address indexed tokenB, uint256 feeBps);
    event DefaultFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeTierAdded(uint256 feeBps);
    event FeeTierRemoved(uint256 feeBps);

    error ZeroAddress();
    error ZeroAmount();
    error TreasuryNotSet();
    error InsufficientFees();
    error OnlySwapRouter();
    error InvalidFeeTier();
    error CannotRemoveDefaultTier();

    /**
     * @notice Initialize with treasury and the 4 Uniswap-style fee tiers
     * @param _treasury Address that receives withdrawn fees
     */
    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;

        validFeeTiers[1] = true;
        validFeeTiers[5] = true;
        validFeeTiers[15] = true;
        validFeeTiers[30] = true;
        validFeeTiers[100] = true;
    }

    /**
     * @notice Get the fee rate for a token pair
     * @param _tokenA First token address
     * @param _tokenB Second token address
     * @return feeBps The fee in basis points for this pair
     */
    function getFeeBps(address _tokenA, address _tokenB) external view returns (uint256) {
        bytes32 key = _pairKey(_tokenA, _tokenB);
        if (pairFeeSet[key]) {
            return pairFeeBps[key];
        }
        return defaultFeeBps;
    }

    /**
     * @notice Calculate the fee for a specific token pair and amount
     * @param _tokenA First token address
     * @param _tokenB Second token address
     * @param _amount The input amount
     * @return The fee amount
     */
    function calculateFee(address _tokenA, address _tokenB, uint256 _amount) external view returns (uint256) {
        bytes32 key = _pairKey(_tokenA, _tokenB);
        uint256 feeBps = pairFeeSet[key] ? pairFeeBps[key] : defaultFeeBps;
        return (_amount * feeBps) / 10_000;
    }

    /**
     * @notice Assign a fee tier to a token pair
     * @param _tokenA First token address
     * @param _tokenB Second token address
     * @param _feeBps Fee tier in basis points (must be a valid tier)
     */
    function setPairFee(address _tokenA, address _tokenB, uint256 _feeBps) external onlyOwner {
        if (_tokenA == address(0) || _tokenB == address(0)) revert ZeroAddress();
        if (!validFeeTiers[_feeBps]) revert InvalidFeeTier();

        bytes32 key = _pairKey(_tokenA, _tokenB);
        pairFeeBps[key] = _feeBps;
        pairFeeSet[key] = true;

        emit PairFeeSet(_tokenA, _tokenB, _feeBps);
    }

    /**
     * @notice Update the default fee applied to pairs without explicit tiers
     * @param _feeBps New default fee in basis points (must be a valid tier)
     */
    function setDefaultFee(uint256 _feeBps) external onlyOwner {
        if (!validFeeTiers[_feeBps]) revert InvalidFeeTier();
        uint256 old = defaultFeeBps;
        defaultFeeBps = _feeBps;
        emit DefaultFeeUpdated(old, _feeBps);
    }

    /**
     * @notice Add a new valid fee tier
     * @param _feeBps Fee tier in basis points to add
     */
    function addFeeTier(uint256 _feeBps) external onlyOwner {
        if (_feeBps == 0 || _feeBps > MAX_FEE_BPS) revert InvalidFeeTier();
        validFeeTiers[_feeBps] = true;
        emit FeeTierAdded(_feeBps);
    }

    /**
     * @notice Remove a valid fee tier
     * @param _feeBps Fee tier in basis points to remove
     */
    function removeFeeTier(uint256 _feeBps) external onlyOwner {
        if (_feeBps == defaultFeeBps) revert CannotRemoveDefaultTier();
        validFeeTiers[_feeBps] = false;
        emit FeeTierRemoved(_feeBps);
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

    /**
     * @notice Generate a deterministic key for a token pair (sorted by address)
     * @param _tokenA First token
     * @param _tokenB Second token
     * @return Pair key as bytes32
     */
    function _pairKey(address _tokenA, address _tokenB) internal pure returns (bytes32) {
        (address t0, address t1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        return keccak256(abi.encodePacked(t0, t1));
    }
}
