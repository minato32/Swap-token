// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MessagingParams, MessagingFee, MessagingReceipt, Origin} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

interface IOAppReceiver {
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

/**
 * @title MockLzEndpoint
 * @notice Minimal mock of LayerZero EndpointV2 for testing OApp-based contracts
 */
contract MockLzEndpoint {
    uint64 public nonce;
    uint256 public constant MOCK_FEE = 0.01 ether;

    event MockSend(uint32 dstEid, bytes32 receiver, bytes message, bytes options);
    event DelegateSet(address delegate);

    function send(
        MessagingParams calldata _params,
        address
    ) external payable returns (MessagingReceipt memory receipt) {
        nonce++;

        bytes32 guid = keccak256(
            abi.encodePacked(nonce, _params.dstEid, _params.receiver, _params.message)
        );

        emit MockSend(_params.dstEid, _params.receiver, _params.message, _params.options);

        return MessagingReceipt({
            guid: guid,
            nonce: nonce,
            fee: MessagingFee({nativeFee: msg.value, lzTokenFee: 0})
        });
    }

    function quote(
        MessagingParams calldata,
        address
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({nativeFee: MOCK_FEE, lzTokenFee: 0});
    }

    function setDelegate(address _delegate) external {
        emit DelegateSet(_delegate);
    }

    function lzToken() external pure returns (address) {
        return address(0);
    }

    function nativeToken() external pure returns (address) {
        return address(0);
    }

    /**
     * @notice Simulate a cross-chain message delivery for testing
     * @param _oapp Address of the destination OApp (BridgeAdapter)
     * @param _srcEid Source endpoint ID
     * @param _sender Sender address as bytes32
     * @param _message Encoded payload
     */
    function simulateReceive(
        address _oapp,
        uint32 _srcEid,
        bytes32 _sender,
        uint64 _nonce,
        bytes calldata _message
    ) external {
        bytes32 guid = keccak256(abi.encodePacked(_nonce, _srcEid, _sender, _message));

        Origin memory origin = Origin({
            srcEid: _srcEid,
            sender: _sender,
            nonce: _nonce
        });

        IOAppReceiver(_oapp).lzReceive(origin, guid, _message, msg.sender, "");
    }

    receive() external payable {}
}
