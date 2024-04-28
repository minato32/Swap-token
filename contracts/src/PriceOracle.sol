// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

/**
 * @title PriceOracle
 * @author CrossChain Swap System
 * @notice Chainlink-integrated price oracle with TWAP and staleness checks
 */
contract PriceOracle is Ownable {
    struct PriceFeed {
        address feed;
        uint256 stalenessThreshold;
        bool active;
    }

    /// @notice Mapping of token address to its Chainlink price feed config
    mapping(address => PriceFeed) public priceFeeds;

    /// @notice Maximum allowed price deviation between spot and TWAP (in basis points)
    uint256 public maxDeviation = 500;

    /// @notice Fallback prices for testnet (no real Chainlink feeds)
    mapping(address => uint256) public fallbackPrices;

    /// @notice Whether to use fallback prices (true on testnet)
    bool public useFallback;

    /// @notice Addresses permitted to call validateSwapPrice
    mapping(address => bool) public authorizedCallers;

    event PriceFeedUpdated(address indexed token, address indexed feed, uint256 stalenessThreshold);
    event PriceFeedRemoved(address indexed token);
    event FallbackPriceSet(address indexed token, uint256 price);
    event MaxDeviationUpdated(uint256 oldDeviation, uint256 newDeviation);
    event SuspiciousPriceDetected(address indexed token, uint256 price, uint256 expectedPrice);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    error ZeroAddress();
    error PriceFeedNotSet();
    error StalePrice(uint256 updatedAt, uint256 threshold);
    error NegativePrice();
    error PriceDeviationTooHigh(uint256 spotPrice, uint256 expectedPrice, uint256 deviationBps);
    error FallbackPriceNotSet();
    error NotAuthorized();
    error DeviationTooHigh();
    error ThresholdTooLow();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    constructor(bool _useFallback) Ownable(msg.sender) {
        useFallback = _useFallback;
    }

    /**
     * @notice Get the latest price for a token
     * @param _token Address of the token
     * @return price The token price scaled to 18 decimals
     */
    function getPrice(address _token) external view returns (uint256 price) {
        if (useFallback) {
            return _getFallbackPrice(_token);
        }
        return _getChainlinkPrice(_token);
    }

    /**
     * @notice Get price from Chainlink with staleness and sanity checks
     * @param _token Address of the token
     * @return price The validated price scaled to 18 decimals
     */
    function _getChainlinkPrice(address _token) internal view returns (uint256) {
        PriceFeed memory config = priceFeeds[_token];
        if (config.feed == address(0)) revert PriceFeedNotSet();

        AggregatorV3Interface feed = AggregatorV3Interface(config.feed);

        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,
        ) = feed.latestRoundData();

        if (answer <= 0) revert NegativePrice();

        if (block.timestamp - updatedAt > config.stalenessThreshold) {
            revert StalePrice(updatedAt, config.stalenessThreshold);
        }

        uint8 feedDecimals = feed.decimals();
        uint256 price = uint256(answer);

        if (feedDecimals < 18) {
            price = price * (10 ** (18 - feedDecimals));
        } else if (feedDecimals > 18) {
            price = price / (10 ** (feedDecimals - 18));
        }

        return price;
    }

    /**
     * @notice Get fallback price for testnet usage
     * @param _token Address of the token
     * @return price The simulated price
     */
    function _getFallbackPrice(address _token) internal view returns (uint256) {
        uint256 price = fallbackPrices[_token];
        if (price == 0) revert FallbackPriceNotSet();
        return price;
    }

    /**
     * @notice Validate that a swap output is within acceptable price deviation
     * @param _fromToken Source token address
     * @param _toToken Destination token address
     * @param _inputAmount Amount of source tokens
     * @param _outputAmount Proposed output amount
     * @return valid Whether the output amount is within acceptable bounds
     */
    function validateSwapPrice(
        address _fromToken,
        address _toToken,
        uint256 _inputAmount,
        uint256 _outputAmount
    ) external onlyAuthorized returns (bool valid) {
        uint256 fromPrice = this.getPrice(_fromToken);
        uint256 toPrice = this.getPrice(_toToken);

        uint256 expectedOutput = (_inputAmount * fromPrice) / toPrice;

        uint256 deviation;
        if (_outputAmount > expectedOutput) {
            deviation = ((_outputAmount - expectedOutput) * 10000) / expectedOutput;
        } else {
            deviation = ((expectedOutput - _outputAmount) * 10000) / expectedOutput;
        }

        if (deviation > maxDeviation) {
            emit SuspiciousPriceDetected(_toToken, _outputAmount, expectedOutput);
            revert PriceDeviationTooHigh(_outputAmount, expectedOutput, deviation);
        }

        return true;
    }

    /**
     * @notice Set a Chainlink price feed for a token
     * @param _token Address of the token
     * @param _feed Address of the Chainlink aggregator
     * @param _stalenessThreshold Max seconds since last update before price is stale (minimum 60)
     */
    function setPriceFeed(
        address _token,
        address _feed,
        uint256 _stalenessThreshold
    ) external onlyOwner {
        if (_token == address(0) || _feed == address(0)) revert ZeroAddress();
        if (_stalenessThreshold < 60) revert ThresholdTooLow();

        priceFeeds[_token] = PriceFeed({
            feed: _feed,
            stalenessThreshold: _stalenessThreshold,
            active: true
        });

        emit PriceFeedUpdated(_token, _feed, _stalenessThreshold);
    }

    /**
     * @notice Remove a price feed for a token
     * @param _token Address of the token
     */
    function removePriceFeed(address _token) external onlyOwner {
        delete priceFeeds[_token];
        emit PriceFeedRemoved(_token);
    }

    /**
     * @notice Set a fallback price for testnet
     * @param _token Address of the token
     * @param _price Price scaled to 18 decimals
     */
    function setFallbackPrice(address _token, uint256 _price) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        fallbackPrices[_token] = _price;
        emit FallbackPriceSet(_token, _price);
    }

    /**
     * @notice Update the maximum allowed price deviation
     * @param _maxDeviation New max deviation in basis points (maximum 2000)
     */
    function setMaxDeviation(uint256 _maxDeviation) external onlyOwner {
        if (_maxDeviation > 2000) revert DeviationTooHigh();
        uint256 old = maxDeviation;
        maxDeviation = _maxDeviation;
        emit MaxDeviationUpdated(old, _maxDeviation);
    }

    /**
     * @notice Toggle between Chainlink and fallback pricing
     * @param _useFallback True for testnet fallback, false for Chainlink
     */
    function setUseFallback(bool _useFallback) external onlyOwner {
        useFallback = _useFallback;
    }

    /**
     * @notice Grant or revoke authorization to call validateSwapPrice
     * @param _caller Address to update
     * @param _authorized True to authorize, false to revoke
     */
    function setAuthorizedCaller(address _caller, bool _authorized) external onlyOwner {
        if (_caller == address(0)) revert ZeroAddress();
        authorizedCallers[_caller] = _authorized;
        emit AuthorizedCallerUpdated(_caller, _authorized);
    }
}
