// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ILayerZeroEndpoint} from "../BridgeAdapter.sol";

/**
 * @title MockLzEndpoint
 * @notice Test-only mock of LayerZero endpoint
 */
contract MockLzEndpoint is ILayerZeroEndpoint {
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

    function withdraw(address payable _to) external {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
