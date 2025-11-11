// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionMarketAMM
 * @notice Automated Market Maker for binary prediction markets with privacy features
 * @dev Simplified AMM for YES/NO markets with external price oracle support
 */
contract PredictionMarketAMM is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    uint256 public marketCount;
    uint256 public constant FEE_RATE = 30; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant PRICE_PRECISION = 10000; // 100.00%

    struct Market {
        string question;
        uint256 endTime;
        uint256 yesReserve;
        uint256 noReserve;
        uint256 totalYesShares;
        uint256 totalNoShares;
        bool resolved;
        bool outcome; // true = YES wins, false = NO wins
    }

    Market[] public markets;
    
    // marketId => user => shares
    mapping(uint256 => mapping(address => uint256)) public userYesShares;
    mapping(uint256 => mapping(address => uint256)) public userNoShares;

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 endTime
    );

    event Trade(
        address indexed user,
        uint256 indexed marketId,
        bool buyYes,
        uint256 usdcAmount,
        uint256 sharesAmount
    );

    event PriceUpdated(
        uint256 indexed marketId,
        uint256 yesPrice
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome
    );

    event SharesSold(
        address indexed user,
        uint256 indexed marketId,
        bool soldYes,
        uint256 sharesAmount,
        uint256 usdcReceived
    );

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new market with initial liquidity
     * @param _question Market question
     * @param _endTime Market end timestamp
     * @param _initialYesReserve Initial YES reserve
     * @param _initialNoReserve Initial NO reserve
     * @param _initialYesPrice Initial YES price in basis points (e.g., 5000 = 50%)
     */
    function createMarketWithLiquidity(
        string memory _question,
        uint256 _endTime,
        uint256 _initialYesReserve,
        uint256 _initialNoReserve,
        uint256 _initialYesPrice
    ) external onlyOwner returns (uint256) {
        require(_endTime > block.timestamp, "End time must be future");
        require(_initialYesPrice >= 100 && _initialYesPrice <= 9900, "Price 0.01-0.99");
        require(_initialYesReserve > 0 && _initialNoReserve > 0, "Reserves must be > 0");

        uint256 total = _initialYesReserve + _initialNoReserve;
        uint256 yesReserve = (total * _initialYesPrice) / PRICE_PRECISION;
        uint256 noReserve = total - yesReserve;

        Market memory market = Market({
            question: _question,
            endTime: _endTime,
            yesReserve: yesReserve,
            noReserve: noReserve,
            totalYesShares: 0,
            totalNoShares: 0,
            resolved: false,
            outcome: false
        });

        markets.push(market);
        uint256 marketId = marketCount;
        marketCount++;

        emit MarketCreated(marketId, _question, _endTime);
        
        return marketId;
    }

    /**
     * @notice Buy outcome shares (YES or NO)
     * @param _marketId Market identifier
     * @param _buyYes True to buy YES, false to buy NO
     * @param _usdcAmount Amount of USDC to spend
     */
    function buyShares(
        uint256 _marketId,
        bool _buyYes,
        uint256 _usdcAmount
    ) external nonReentrant {
        require(_marketId < marketCount, "Invalid market");
        Market storage market = markets[_marketId];
        require(block.timestamp < market.endTime, "Market ended");
        require(!market.resolved, "Market resolved");
        require(_usdcAmount > 0, "Amount must be > 0");

        // Calculate shares based on AMM formula
        uint256 amountInWithFee = (_usdcAmount * (FEE_DENOMINATOR - FEE_RATE)) / FEE_DENOMINATOR;
        
        uint256 reserveIn = _buyYes ? market.noReserve : market.yesReserve;
        uint256 reserveOut = _buyYes ? market.yesReserve : market.noReserve;

        uint256 k = market.yesReserve * market.noReserve;
        uint256 newReserveIn = reserveIn + amountInWithFee;
        uint256 newReserveOut = k / newReserveIn;
        uint256 sharesOut = reserveOut - newReserveOut;

        require(sharesOut > 0, "Insufficient liquidity");

        // Update reserves
        if (_buyYes) {
            market.yesReserve = newReserveOut;
            market.noReserve = newReserveIn;
            market.totalYesShares += sharesOut;
            userYesShares[_marketId][msg.sender] += sharesOut;
        } else {
            market.yesReserve = newReserveIn;
            market.noReserve = newReserveOut;
            market.totalNoShares += sharesOut;
            userNoShares[_marketId][msg.sender] += sharesOut;
        }

        // Transfer USDC from user
        require(usdc.transferFrom(msg.sender, address(this), _usdcAmount), "Transfer failed");

        emit Trade(msg.sender, _marketId, _buyYes, _usdcAmount, sharesOut);
    }

    /**
     * @notice Sell outcome shares back to AMM
     * @param _marketId Market identifier
     * @param _sellYes True to sell YES, false to sell NO
     * @param _sharesAmount Amount of shares to sell
     */
    function sellShares(
        uint256 _marketId,
        bool _sellYes,
        uint256 _sharesAmount
    ) external nonReentrant {
        require(_marketId < marketCount, "Invalid market");
        Market storage market = markets[_marketId];
        require(block.timestamp < market.endTime, "Market ended");
        require(!market.resolved, "Market resolved");
        require(_sharesAmount > 0, "Amount must be > 0");

        // Check user has enough shares
        uint256 userShares = _sellYes ? userYesShares[_marketId][msg.sender] : userNoShares[_marketId][msg.sender];
        require(userShares >= _sharesAmount, "Insufficient shares");

        // Calculate USDC out based on AMM formula (reverse of buy)
        uint256 reserveIn = _sellYes ? market.yesReserve : market.noReserve;
        uint256 reserveOut = _sellYes ? market.noReserve : market.yesReserve;

        uint256 k = market.yesReserve * market.noReserve;
        uint256 newReserveIn = reserveIn + _sharesAmount;
        uint256 newReserveOut = k / newReserveIn;
        uint256 usdcOut = reserveOut - newReserveOut;

        // Apply fee
        uint256 usdcOutWithFee = (usdcOut * (FEE_DENOMINATOR - FEE_RATE)) / FEE_DENOMINATOR;

        require(usdcOutWithFee > 0, "Insufficient output");

        // Update reserves
        if (_sellYes) {
            market.yesReserve = newReserveIn;
            market.noReserve = newReserveOut;
            market.totalYesShares -= _sharesAmount;
            userYesShares[_marketId][msg.sender] -= _sharesAmount;
        } else {
            market.yesReserve = newReserveOut;
            market.noReserve = newReserveIn;
            market.totalNoShares -= _sharesAmount;
            userNoShares[_marketId][msg.sender] -= _sharesAmount;
        }

        // Transfer USDC to user
        require(usdc.transfer(msg.sender, usdcOutWithFee), "Transfer failed");

        emit SharesSold(msg.sender, _marketId, _sellYes, _sharesAmount, usdcOutWithFee);
    }

    /**
     * @notice Update market price (external oracle)
     * @param _marketId Market identifier
     * @param _yesPrice New YES price in basis points
     */
    function updatePrice(
        uint256 _marketId,
        uint256 _yesPrice
    ) external onlyOwner {
        require(_marketId < marketCount, "Invalid market");
        require(_yesPrice >= 100 && _yesPrice <= 9900, "Price out of bounds");
        
        Market storage market = markets[_marketId];
        uint256 total = market.yesReserve + market.noReserve;
        
        if (total == 0) return;

        market.yesReserve = (total * _yesPrice) / PRICE_PRECISION;
        market.noReserve = total - market.yesReserve;

        emit PriceUpdated(_marketId, _yesPrice);
    }

    /**
     * @notice Resolve market and set outcome
     * @param _marketId Market identifier
     * @param _outcome True if YES wins, false if NO wins
     */
    function resolveMarket(
        uint256 _marketId,
        bool _outcome
    ) external onlyOwner {
        require(_marketId < marketCount, "Invalid market");
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.endTime, "Market not ended");
        require(!market.resolved, "Already resolved");

        market.resolved = true;
        market.outcome = _outcome;

        emit MarketResolved(_marketId, _outcome);
    }

    /**
     * @notice Claim winnings after market resolution
     * @param _marketId Market identifier
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        require(_marketId < marketCount, "Invalid market");
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved");

        uint256 winningShares;
        if (market.outcome) {
            winningShares = userYesShares[_marketId][msg.sender];
            userYesShares[_marketId][msg.sender] = 0;
        } else {
            winningShares = userNoShares[_marketId][msg.sender];
            userNoShares[_marketId][msg.sender] = 0;
        }

        require(winningShares > 0, "No winning shares");

        // Transfer winnings (1:1 with USDC)
        require(usdc.transfer(msg.sender, winningShares), "Transfer failed");
    }

    /**
     * @notice Get market information
     * @param _marketId Market identifier
     */
    function getMarketInfo(uint256 _marketId)
        external
        view
        returns (
            string memory question,
            uint256 yesPrice,
            uint256 totalVolume,
            uint256 endTime,
            uint256 yesReserve,
            uint256 noReserve
        )
    {
        require(_marketId < marketCount, "Invalid market");
        Market memory market = markets[_marketId];
        
        uint256 total = market.yesReserve + market.noReserve;
        yesPrice = total == 0 ? 5000 : (market.yesReserve * PRICE_PRECISION) / total;
        totalVolume = market.totalYesShares + market.totalNoShares;

        return (
            market.question,
            yesPrice,
            totalVolume,
            market.endTime,
            market.yesReserve,
            market.noReserve
        );
    }

    /**
     * @notice Get all markets info (for frontend)
     */
    function getAllMarkets()
        external
        view
        returns (
            string[] memory questions,
            uint256[] memory yesPrices,
            uint256[] memory volumes,
            uint256[] memory endTimes
        )
    {
        questions = new string[](marketCount);
        yesPrices = new uint256[](marketCount);
        volumes = new uint256[](marketCount);
        endTimes = new uint256[](marketCount);

        for (uint256 i = 0; i < marketCount; i++) {
            Market memory market = markets[i];
            uint256 total = market.yesReserve + market.noReserve;
            uint256 yesPrice = total == 0 ? 5000 : (market.yesReserve * PRICE_PRECISION) / total;
            
            questions[i] = market.question;
            yesPrices[i] = yesPrice;
            volumes[i] = market.totalYesShares + market.totalNoShares;
            endTimes[i] = market.endTime;
        }
    }

    /**
     * @notice Get user position
     */
    function getUserPosition(uint256 _marketId, address _user)
        external
        view
        returns (uint256 yesShares, uint256 noShares)
    {
        return (
            userYesShares[_marketId][_user],
            userNoShares[_marketId][_user]
        );
    }
}