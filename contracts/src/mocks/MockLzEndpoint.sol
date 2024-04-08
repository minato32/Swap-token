// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockLzEndpoint
 * @notice Test-only mock of LayerZero endpoint
 */
contract MockLzEndpoint {
    event MockSend(uint16 dstChainId, bytes destination, bytes payload);

    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable,
        address,
        bytes calldata
    ) external payable {
        emit MockSend(_dstChainId, _destination, _payload);
    }

    function estimateFees(
        uint16,
        address,
        bytes calldata,
        bool,
        bytes calldata
    ) external pure returns (uint256 nativeFee, uint256 zroFee) {
        return (0.01 ether, 0);
    }
}
