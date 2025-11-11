// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAMM
 * @notice Interface for Prediction Market AMM
 */
interface IAMM {
    struct Market {
        string question;
        uint256 endTime;
        uint256 yesReserve;
        uint256 noReserve;
        uint256 totalYesShares;
        uint256 totalNoShares;
        bool resolved;
        bool outcome;
    }

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 endTime
    );

    event Trade(
        address indexed user,
        uint256 indexed marketId,
        bool buyYes,
        uint256 usdcIn,
        uint256 sharesOut
    );

    event PriceUpdated(
        uint256 indexed marketId,
        uint256 yesPrice
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome
    );

    function marketCount() external view returns (uint256);

    function createMarketWithLiquidity(
        string memory question,
        uint256 endTime,
        uint256 initialYesReserve,
        uint256 initialNoReserve,
        uint256 initialYesPrice
    ) external returns (uint256);

    function buyShares(
        uint256 marketId,
        bool buyYes,
        uint256 usdcAmount
    ) external;

    function updatePrice(
        uint256 marketId,
        uint256 yesPrice
    ) external;

    function getMarketInfo(
        uint256 marketId
    ) external view returns (
        string memory question,
        uint256 yesPrice,
        uint256 totalVolume,
        uint256 endTime,
        uint256 yesReserve,
        uint256 noReserve
    );

    function userYesShares(uint256 marketId, address user) external view returns (uint256);
    
    function userNoShares(uint256 marketId, address user) external view returns (uint256);
}