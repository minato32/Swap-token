// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OApp, Origin, MessagingFee, MessagingReceipt} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITokenVault {
    function releaseTokens(bytes32 _depositId, address _recipient) external;
    function releaseBridgedTokens(address _token, uint256 _amount, address _recipient) external;
}

/**
 * @title BridgeAdapter
 * @author CrossChain Swap System
 * @notice Handles cross-chain messaging via LayerZero V2 OApp standard
 */
contract BridgeAdapter is OApp, ReentrancyGuard {
    /// @notice Tracks processed nonces to prevent replay attacks
    mapping(uint32 => mapping(uint64 => bool)) public processedNonces;

    /// @notice Address of the SwapRouter contract
    address public swapRouter;

    /// @notice Address of the TokenVault contract on this chain
    address public tokenVault;

    /// @notice Maps source chain token addresses to local equivalents
    mapping(address => address) public tokenMapping;

    /// @notice Maximum tokens releasable per incoming message per local token (S-07)
    mapping(address => uint256) public maxReleasablePerMessage;

    event MessageSent(
        uint32 indexed dstEid,
        address indexed recipient,
        uint64 nonce,
        bytes payload
    );

    event MessageReceived(
        uint32 indexed srcEid,
        address indexed recipient,
        address token,
        uint256 amount,
        uint64 nonce
    );

    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event TokenVaultUpdated(address indexed oldVault, address indexed newVault);
    event MaxReleasableUpdated(address indexed token, uint256 limit);

    error ZeroAddress();
    error NonceAlreadyProcessed();
    error OnlySwapRouter();
    error TokenVaultNotSet();
    error NoTokenMapping();
    error AmountExceedsLimit();

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    /**
     * @notice Send a cross-chain message to release tokens on the destination chain
     * @param _dstEid LayerZero V2 endpoint ID of the destination chain
     * @param _token Token address being bridged
     * @param _amount Amount of tokens to release on destination
     * @param _recipient Address that receives tokens on the destination chain
     * @param _depositId Unique deposit identifier for vault tracking
     * @param _refundAddress Address to receive any excess LayerZero messaging fee refund
     * @param _options LayerZero messaging options
     */
    function sendBridgeMessage(
        uint32 _dstEid,
        address _token,
        uint256 _amount,
        address _recipient,
        bytes32 _depositId,
        address _refundAddress,
        bytes calldata _options
    ) external payable nonReentrant returns (MessagingReceipt memory receipt) {
        if (msg.sender != swapRouter) revert OnlySwapRouter();

        bytes memory payload = abi.encode(_token, _amount, _recipient, _depositId);

        receipt = _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(_refundAddress)
        );

        emit MessageSent(_dstEid, _recipient, receipt.nonce, payload);
    }

    /**
     * @notice Internal handler for incoming LayerZero messages
     * @dev Called by OApp base after endpoint and peer validation
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        if (tokenVault == address(0)) revert TokenVaultNotSet();
        if (processedNonces[_origin.srcEid][_origin.nonce]) revert NonceAlreadyProcessed();
        processedNonces[_origin.srcEid][_origin.nonce] = true;

        _processMessage(_origin.srcEid, _origin.nonce, _message);
    }

    /**
     * @notice Estimate the LayerZero messaging fee for a bridge operation
     * @param _dstEid Destination endpoint ID
     * @param _token Token address for payload encoding
     * @param _amount Token amount for payload encoding
     * @param _recipient Recipient address for payload encoding
     * @param _depositId Deposit ID for payload encoding
     * @param _options LayerZero messaging options
     */
    function quoteBridgeFee(
        uint32 _dstEid,
        address _token,
        uint256 _amount,
        address _recipient,
        bytes32 _depositId,
        bytes calldata _options
    ) external view returns (MessagingFee memory) {
        bytes memory payload = abi.encode(_token, _amount, _recipient, _depositId);
        return _quote(_dstEid, payload, _options, false);
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
     * @notice Set the TokenVault contract address on this chain
     * @param _tokenVault Address of the deployed TokenVault
     */
    function setTokenVault(address _tokenVault) external onlyOwner {
        if (_tokenVault == address(0)) revert ZeroAddress();
        address old = tokenVault;
        tokenVault = _tokenVault;
        emit TokenVaultUpdated(old, _tokenVault);
    }

    /**
     * @notice Set the per-message release cap for a local token
     * @param _localToken Local token address
     * @param _limit Maximum amount releasable in a single incoming message (0 = unlimited)
     */
    function setMaxReleasablePerMessage(address _localToken, uint256 _limit) external onlyOwner {
        if (_localToken == address(0)) revert ZeroAddress();
        maxReleasablePerMessage[_localToken] = _limit;
        emit MaxReleasableUpdated(_localToken, _limit);
    }

    /**
     * @notice Map a source chain token to its local equivalent
     * @param _sourceToken Token address on the source chain
     * @param _localToken Equivalent token address on this chain
     */
    function setTokenMapping(address _sourceToken, address _localToken) external onlyOwner {
        if (_sourceToken == address(0) || _localToken == address(0)) revert ZeroAddress();
        tokenMapping[_sourceToken] = _localToken;
    }

    function _processMessage(uint32 srcEid, uint64 nonce, bytes calldata message) internal {
        (address token, uint256 amount, address recipient, ) =
            abi.decode(message, (address, uint256, address, bytes32));

        address localToken = tokenMapping[token];
        if (localToken == address(0)) revert NoTokenMapping();

        uint256 limit = maxReleasablePerMessage[localToken];
        if (limit > 0 && amount > limit) revert AmountExceedsLimit();

        ITokenVault(tokenVault).releaseBridgedTokens(localToken, amount, recipient);

        emit MessageReceived(srcEid, recipient, localToken, amount, nonce);
    }

    receive() external payable {}
}
