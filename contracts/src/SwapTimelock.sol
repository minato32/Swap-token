// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwapTimelock
 * @author CrossChain Swap System
 * @notice Enforces a time delay on critical admin operations to prevent instant malicious changes
 */
contract SwapTimelock is Ownable {
    /// @notice Minimum delay before a queued operation can be executed
    uint256 public constant MIN_DELAY = 24 hours;

    /// @notice Maximum time an operation stays valid after delay passes
    uint256 public constant GRACE_PERIOD = 48 hours;

    struct TimelockOperation {
        address target;
        bytes data;
        uint256 scheduledAt;
        bool executed;
        bool cancelled;
    }

    /// @notice Mapping of operation ID to its details
    mapping(bytes32 => TimelockOperation) public operations;

    event OperationScheduled(
        bytes32 indexed operationId,
        address indexed target,
        bytes data,
        uint256 executionTime
    );

    event OperationExecuted(bytes32 indexed operationId);
    event OperationCancelled(bytes32 indexed operationId);

    error OperationAlreadyScheduled();
    error OperationNotFound();
    error OperationNotReady();
    error OperationExpired();
    error OperationAlreadyExecuted();
    error OperationAlreadyCancelled();
    error ExecutionFailed();
    error ZeroAddress();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Schedule an admin operation with a 24-hour delay
     * @param _target Contract address to call
     * @param _data Encoded function call
     * @return operationId Unique identifier for this operation
     */
    function schedule(
        address _target,
        bytes calldata _data
    ) external onlyOwner returns (bytes32 operationId) {
        if (_target == address(0)) revert ZeroAddress();

        operationId = keccak256(abi.encode(_target, _data, block.timestamp));

        if (operations[operationId].scheduledAt != 0) revert OperationAlreadyScheduled();

        operations[operationId] = TimelockOperation({
            target: _target,
            data: _data,
            scheduledAt: block.timestamp,
            executed: false,
            cancelled: false
        });

        emit OperationScheduled(
            operationId,
            _target,
            _data,
            block.timestamp + MIN_DELAY
        );
    }

    /**
     * @notice Execute a scheduled operation after the delay has passed
     * @param _operationId ID of the operation to execute
     */
    function execute(bytes32 _operationId) external onlyOwner {
        TimelockOperation storage op = operations[_operationId];

        if (op.scheduledAt == 0) revert OperationNotFound();
        if (op.executed) revert OperationAlreadyExecuted();
        if (op.cancelled) revert OperationAlreadyCancelled();

        if (block.timestamp < op.scheduledAt + MIN_DELAY) revert OperationNotReady();
        if (block.timestamp > op.scheduledAt + MIN_DELAY + GRACE_PERIOD) revert OperationExpired();

        op.executed = true;

        (bool success, ) = op.target.call(op.data);
        if (!success) revert ExecutionFailed();

        emit OperationExecuted(_operationId);
    }

    /**
     * @notice Cancel a scheduled operation
     * @param _operationId ID of the operation to cancel
     */
    function cancel(bytes32 _operationId) external onlyOwner {
        TimelockOperation storage op = operations[_operationId];

        if (op.scheduledAt == 0) revert OperationNotFound();
        if (op.executed) revert OperationAlreadyExecuted();

        op.cancelled = true;

        emit OperationCancelled(_operationId);
    }

    /**
     * @notice Check if an operation is ready to execute
     * @param _operationId ID of the operation
     * @return ready Whether the operation can be executed now
     */
    function isReady(bytes32 _operationId) external view returns (bool ready) {
        TimelockOperation memory op = operations[_operationId];

        if (op.scheduledAt == 0 || op.executed || op.cancelled) return false;

        return block.timestamp >= op.scheduledAt + MIN_DELAY &&
               block.timestamp <= op.scheduledAt + MIN_DELAY + GRACE_PERIOD;
    }

    /**
     * @notice Get the remaining time before an operation can be executed
     * @param _operationId ID of the operation
     * @return remaining Seconds until the operation is executable (0 if ready)
     */
    function getTimeRemaining(bytes32 _operationId) external view returns (uint256 remaining) {
        TimelockOperation memory op = operations[_operationId];
        uint256 executionTime = op.scheduledAt + MIN_DELAY;

        if (block.timestamp >= executionTime) return 0;

        return executionTime - block.timestamp;
    }
}
