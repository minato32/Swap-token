// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TokenVault
 * @author CrossChain Swap System
 * @notice Locks ERC20 tokens during cross-chain swaps with a 30-minute refund timeout
 */
contract TokenVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Duration after which a deposit becomes refundable
    uint256 public constant LOCK_DURATION = 30 minutes;

    /// @notice Address of the SwapRouter contract
    address public swapRouter;

    /// @notice Address of the BridgeAdapter contract
    address public bridgeAdapter;

    /// @notice Maximum total deposit allowed per token (prevents concentration risk)
    mapping(address => uint256) public maxDepositCap;

    /// @notice Current total locked amount per token
    mapping(address => uint256) public totalLocked;

    struct Deposit {
        address token;
        uint256 amount;
        address sender;
        uint256 timestamp;
        bool released;
        bool refunded;
    }

    /// @notice Mapping of deposit ID to deposit details
    mapping(bytes32 => Deposit) public deposits;

    event TokensLocked(
        bytes32 indexed depositId,
        address indexed token,
        uint256 amount,
        address sender
    );

    event TokensReleased(
        bytes32 indexed depositId,
        address indexed recipient,
        uint256 amount
    );

    event TokensRefunded(
        bytes32 indexed depositId,
        address indexed sender,
        uint256 amount
    );

    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event BridgeAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);

    error ZeroAddress();
    error ZeroAmount();
    error OnlySwapRouter();
    error OnlyBridgeAdapter();
    error DepositAlreadyExists();
    error DepositNotFound();
    error DepositAlreadyReleased();
    error DepositAlreadyRefunded();
    error LockNotExpired();
    error OnlyDepositor();
    error DepositCapExceeded();

    event MaxDepositCapUpdated(address indexed token, uint256 oldCap, uint256 newCap);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Lock tokens in the vault during a cross-chain swap
     * @param _depositId Unique identifier for this deposit
     * @param _token Address of the ERC20 token being locked
     * @param _amount Amount of tokens to lock
     * @param _sender Original sender who initiated the swap
     */
    function lockTokens(
        bytes32 _depositId,
        address _token,
        uint256 _amount,
        address _sender
    ) external nonReentrant whenNotPaused {
        if (msg.sender != swapRouter) revert OnlySwapRouter();
        if (_token == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();
        if (deposits[_depositId].timestamp != 0) revert DepositAlreadyExists();

        uint256 cap = maxDepositCap[_token];
        if (cap > 0 && totalLocked[_token] + _amount > cap) revert DepositCapExceeded();

        totalLocked[_token] += _amount;

        deposits[_depositId] = Deposit({
            token: _token,
            amount: _amount,
            sender: _sender,
            timestamp: block.timestamp,
            released: false,
            refunded: false
        });

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        emit TokensLocked(_depositId, _token, _amount, _sender);
    }

    /**
     * @notice Release locked tokens to the recipient after successful bridge delivery
     * @param _depositId Unique identifier of the deposit
     * @param _recipient Address to receive the tokens
     */
    function releaseTokens(
        bytes32 _depositId,
        address _recipient
    ) external nonReentrant {
        if (msg.sender != bridgeAdapter) revert OnlyBridgeAdapter();
        if (_recipient == address(0)) revert ZeroAddress();

        Deposit storage deposit = deposits[_depositId];
        if (deposit.timestamp == 0) revert DepositNotFound();
        if (deposit.released) revert DepositAlreadyReleased();
        if (deposit.refunded) revert DepositAlreadyRefunded();

        deposit.released = true;
        totalLocked[deposit.token] -= deposit.amount;

        IERC20(deposit.token).safeTransfer(_recipient, deposit.amount);

        emit TokensReleased(_depositId, _recipient, deposit.amount);
    }

    /**
     * @notice Refund locked tokens to the original sender after timeout expires
     * @param _depositId Unique identifier of the deposit
     */
    function refund(bytes32 _depositId) external nonReentrant {
        Deposit storage deposit = deposits[_depositId];
        if (deposit.timestamp == 0) revert DepositNotFound();
        if (deposit.released) revert DepositAlreadyReleased();
        if (deposit.refunded) revert DepositAlreadyRefunded();
        if (msg.sender != deposit.sender) revert OnlyDepositor();
        if (block.timestamp < deposit.timestamp + LOCK_DURATION) revert LockNotExpired();

        deposit.refunded = true;
        totalLocked[deposit.token] -= deposit.amount;

        IERC20(deposit.token).safeTransfer(deposit.sender, deposit.amount);

        emit TokensRefunded(_depositId, deposit.sender, deposit.amount);
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
     * @notice Set the maximum deposit cap for a token
     * @param _token Address of the ERC20 token
     * @param _cap Maximum total deposit allowed (0 = unlimited)
     */
    function setMaxDepositCap(address _token, uint256 _cap) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        uint256 old = maxDepositCap[_token];
        maxDepositCap[_token] = _cap;
        emit MaxDepositCapUpdated(_token, old, _cap);
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
