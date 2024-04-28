// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SecurityMonitor
 * @author CrossChain Swap System
 * @notice Tracks on-chain activity patterns and flags suspicious behavior for off-chain monitoring
 */
contract SecurityMonitor is Ownable {
    /// @notice Threshold for flagging large swaps (in basis points of total volume)
    uint256 public largeSwapThreshold = 1000 * 1e18;

    /// @notice Maximum swaps allowed per address within the cooldown window
    uint256 public maxSwapsPerWindow = 10;

    /// @notice Cooldown window duration
    uint256 public cooldownWindow = 1 hours;

    struct UserActivity {
        uint256 swapCount;
        uint256 totalVolume;
        uint256 windowStart;
        uint256 lastSwapTimestamp;
        bool flagged;
    }

    /// @notice Activity tracking per user address
    mapping(address => UserActivity) public userActivity;

    /// @notice Total swap volume across all users
    uint256 public totalVolume;

    /// @notice Flagged addresses for review
    mapping(address => bool) public blacklisted;

    /// @notice Addresses permitted to call recordSwap (S-06)
    mapping(address => bool) public authorizedCallers;

    event LargeSwapDetected(
        address indexed user,
        uint256 amount,
        uint256 threshold,
        uint256 timestamp
    );

    event RapidSwapDetected(
        address indexed user,
        uint256 swapCount,
        uint256 windowDuration,
        uint256 timestamp
    );

    event AddressFlagged(address indexed user, string reason);
    event AddressUnflagged(address indexed user);
    event AddressBlacklisted(address indexed user);
    event AddressRemovedFromBlacklist(address indexed user);
    event LargeSwapThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event MaxSwapsPerWindowUpdated(uint256 oldMax, uint256 newMax);
    event CooldownWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    error ZeroAddress();
    error AddressIsBlacklisted();
    error NotAuthorized();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Record a swap and check for suspicious patterns
     * @param _user Address of the user performing the swap
     * @param _amount Amount being swapped
     */
    function recordSwap(address _user, uint256 _amount) external onlyAuthorized {
        if (blacklisted[_user]) revert AddressIsBlacklisted();

        UserActivity storage activity = userActivity[_user];

        if (activity.windowStart == 0) {
            activity.windowStart = block.timestamp;
        }

        if (block.timestamp > activity.windowStart + cooldownWindow) {
            activity.swapCount = 0;
            activity.totalVolume = 0;
            activity.windowStart = block.timestamp;
        }

        activity.swapCount++;
        activity.totalVolume += _amount;
        activity.lastSwapTimestamp = block.timestamp;
        totalVolume += _amount;

        if (_amount >= largeSwapThreshold) {
            activity.flagged = true;
            emit LargeSwapDetected(_user, _amount, largeSwapThreshold, block.timestamp);
            emit AddressFlagged(_user, "Large swap detected");
        }

        if (activity.swapCount > maxSwapsPerWindow) {
            activity.flagged = true;
            emit RapidSwapDetected(
                _user,
                activity.swapCount,
                block.timestamp - activity.windowStart,
                block.timestamp
            );
            emit AddressFlagged(_user, "Rapid swap activity detected");
        }
    }

    /**
     * @notice Grant or revoke authorization to call recordSwap
     * @param _caller Address to update
     * @param _authorized True to authorize, false to revoke
     */
    function setAuthorizedCaller(address _caller, bool _authorized) external onlyOwner {
        if (_caller == address(0)) revert ZeroAddress();
        authorizedCallers[_caller] = _authorized;
        emit AuthorizedCallerUpdated(_caller, _authorized);
    }

    /**
     * @notice Check if an address has been flagged for suspicious activity
     * @param _user Address to check
     * @return flagged Whether the address is flagged
     */
    function isFlagged(address _user) external view returns (bool flagged) {
        return userActivity[_user].flagged;
    }

    /**
     * @notice Unflag an address after review
     * @param _user Address to unflag
     */
    function unflagAddress(address _user) external onlyOwner {
        userActivity[_user].flagged = false;
        emit AddressUnflagged(_user);
    }

    /**
     * @notice Blacklist an address to block all swaps
     * @param _user Address to blacklist
     */
    function blacklistAddress(address _user) external onlyOwner {
        if (_user == address(0)) revert ZeroAddress();
        blacklisted[_user] = true;
        emit AddressBlacklisted(_user);
    }

    /**
     * @notice Remove an address from the blacklist
     * @param _user Address to remove
     */
    function removeFromBlacklist(address _user) external onlyOwner {
        blacklisted[_user] = false;
        emit AddressRemovedFromBlacklist(_user);
    }

    /**
     * @notice Update the large swap detection threshold
     * @param _threshold New threshold amount
     */
    function setLargeSwapThreshold(uint256 _threshold) external onlyOwner {
        uint256 old = largeSwapThreshold;
        largeSwapThreshold = _threshold;
        emit LargeSwapThresholdUpdated(old, _threshold);
    }

    /**
     * @notice Update the max swaps allowed per cooldown window
     * @param _maxSwaps New max swap count
     */
    function setMaxSwapsPerWindow(uint256 _maxSwaps) external onlyOwner {
        uint256 old = maxSwapsPerWindow;
        maxSwapsPerWindow = _maxSwaps;
        emit MaxSwapsPerWindowUpdated(old, _maxSwaps);
    }

    /**
     * @notice Update the cooldown window duration
     * @param _window New window duration in seconds
     */
    function setCooldownWindow(uint256 _window) external onlyOwner {
        uint256 old = cooldownWindow;
        cooldownWindow = _window;
        emit CooldownWindowUpdated(old, _window);
    }

    /**
     * @notice Get activity summary for a user
     * @param _user Address to query
     * @return swapCount Number of swaps in current window
     * @return volume Total volume in current window
     * @return flagged Whether the user is flagged
     * @return isBlacklisted Whether the user is blacklisted
     */
    function getUserSummary(address _user)
        external
        view
        returns (
            uint256 swapCount,
            uint256 volume,
            bool flagged,
            bool isBlacklisted
        )
    {
        UserActivity memory activity = userActivity[_user];
        return (
            activity.swapCount,
            activity.totalVolume,
            activity.flagged,
            blacklisted[_user]
        );
    }
}
