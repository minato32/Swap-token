// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}

/**
 * @title BridgeAdapter
 * @author CrossChain Swap System
 * @notice Handles cross-chain messaging via LayerZero protocol
 */
contract BridgeAdapter is Ownable, ReentrancyGuard {
    /// @notice The LayerZero endpoint contract on this chain
    ILayerZeroEndpoint public lzEndpoint;

    /// @notice Mapping of LayerZero chain ID to trusted remote contract address
    mapping(uint16 => bytes) public trustedRemotes;

    /// @notice Tracks processed nonces to prevent replay attacks
    mapping(uint16 => mapping(uint64 => bool)) public processedNonces;

    /// @notice Counter for outgoing message nonces
    uint64 public outboundNonce;

    /// @notice Address of the SwapRouter contract
    address public swapRouter;

    event MessageSent(
        uint16 indexed dstChainId,
        address indexed sender,
        uint64 nonce,
        bytes payload
    );

    event MessageReceived(
        uint16 indexed srcChainId,
        address indexed recipient,
        address token,
        uint256 amount,
        uint64 nonce
    );

    event TrustedRemoteSet(uint16 indexed chainId, bytes trustedRemote);
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);

    error ZeroAddress();
    error InvalidSourceChain();
    error UntrustedRemote();
    error NonceAlreadyProcessed();
    error OnlyLzEndpoint();
    error OnlySwapRouter();
    error InsufficientFee();
    error TrustedRemoteNotSet();

    /**
     * @notice Initialize the BridgeAdapter with a LayerZero endpoint
     * @param _lzEndpoint Address of the LayerZero endpoint on this chain
     */
    constructor(address _lzEndpoint) Ownable(msg.sender) {
        if (_lzEndpoint == address(0)) revert ZeroAddress();
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
    }

    /**
     * @notice Send a cross-chain message to release tokens on destination chain
     * @param _dstChainId LayerZero chain ID of the destination
     * @param _token Token address to release on the destination chain
     * @param _amount Amount of tokens to release
     * @param _recipient Address that receives the tokens on the destination chain
     */
    function lzSend(
        uint16 _dstChainId,
        address _token,
        uint256 _amount,
        address _recipient
    ) external payable nonReentrant {
        if (msg.sender != swapRouter) revert OnlySwapRouter();
        if (trustedRemotes[_dstChainId].length == 0) revert TrustedRemoteNotSet();

        outboundNonce++;

        bytes memory payload = abi.encode(_token, _amount, _recipient, outboundNonce);

        lzEndpoint.send{value: msg.value}(
            _dstChainId,
            trustedRemotes[_dstChainId],
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );

        emit MessageSent(_dstChainId, _recipient, outboundNonce, payload);
    }

    /**
     * @notice Receive a cross-chain message from LayerZero
     * @param _srcChainId The source chain that sent the message
     * @param _srcAddress The contract address that sent the message
     * @param _payload The encoded message data
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64,
        bytes calldata _payload
    ) external nonReentrant {
        if (msg.sender != address(lzEndpoint)) revert OnlyLzEndpoint();

        bytes memory trusted = trustedRemotes[_srcChainId];
        if (trusted.length == 0) revert UntrustedRemote();
        if (keccak256(_srcAddress) != keccak256(trusted)) revert UntrustedRemote();

        (
            address token,
            uint256 amount,
            address recipient,
            uint64 messageNonce
        ) = abi.decode(_payload, (address, uint256, address, uint64));

        if (processedNonces[_srcChainId][messageNonce]) revert NonceAlreadyProcessed();
        processedNonces[_srcChainId][messageNonce] = true;

        emit MessageReceived(_srcChainId, recipient, token, amount, messageNonce);
    }

    /**
     * @notice Estimate the LayerZero messaging fee
     * @param _dstChainId LayerZero chain ID of the destination
     * @param _token Token address for the message payload
     * @param _amount Token amount for the message payload
     * @param _recipient Recipient address for the message payload
     * @return nativeFee The estimated fee in native token
     * @return zroFee The estimated fee in ZRO token
     */
    function estimateFee(
        uint16 _dstChainId,
        address _token,
        uint256 _amount,
        address _recipient
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        bytes memory payload = abi.encode(_token, _amount, _recipient, outboundNonce + 1);
        return lzEndpoint.estimateFees(
            _dstChainId,
            address(this),
            payload,
            false,
            bytes("")
        );
    }

    /**
     * @notice Set the trusted contract address on a remote chain
     * @param _chainId LayerZero chain ID
     * @param _trustedRemote Encoded address of the BridgeAdapter on that chain
     */
    function setTrustedRemote(uint16 _chainId, bytes calldata _trustedRemote) external onlyOwner {
        if (_chainId == 0) revert InvalidSourceChain();
        trustedRemotes[_chainId] = _trustedRemote;
        emit TrustedRemoteSet(_chainId, _trustedRemote);
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

    receive() external payable {}
}
