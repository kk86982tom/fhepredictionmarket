const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PredictionMarket", function () {
  let market, conditionalTokens, usdc, oracle;
  let owner, user1, user2;
  let marketId;

  const INITIAL_BALANCE = ethers.parseUnits("10000", 6); // 10,000 USDC
  const QUESTION = "Will Bitcoin reach $100,000?";
  const POLYMARKET_ID = "btc-100k-test";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy MarketFactory (deploys ConditionalTokens)
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const factory = await MarketFactory.deploy(await usdc.getAddress());
    await factory.waitForDeployment();

    // Deploy PredictionMarket
    await factory.deployMarket();
    const marketAddress = await factory.getMarketAt(0);
    market = await ethers.getContractAt("PredictionMarket", marketAddress);

    const conditionalTokensAddress = await factory.conditionalTokens();
    conditionalTokens = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddress);

    // Deploy Oracle
    const PolymarketOracle = await ethers.getContractFactory("PolymarketOracle");
    oracle = await PolymarketOracle.deploy();
    await oracle.waitForDeployment();

    // Setup permissions
    await market.authorizeOracle(await oracle.getAddress());
    await oracle.authorizeUpdater(owner.address);

    // Mint USDC to test users
    await usdc.mint(user1.address, INITIAL_BALANCE);
    await usdc.mint(user2.address, INITIAL_BALANCE);

    // Approve market to spend USDC
    await usdc.connect(user1).approve(await market.getAddress(), ethers.MaxUint256);
    await usdc.connect(user2).approve(await market.getAddress(), ethers.MaxUint256);

    // Create a test market
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    await market.createMarket(QUESTION, endTime, POLYMARKET_ID);
    marketId = 0;
  });

  describe("Market Creation", function () {
    it("should create market with correct parameters", async function () {
      const info = await market.getMarketInfo(marketId);
      expect(info.question).to.equal(QUESTION);
      expect(info.state).to.equal(0); // Active
      expect(info.yesPrice).to.equal(5000); // 50%
    });

    it("should increment market count", async function () {
      const count = await market.marketCount();
      expect(count).to.equal(1);
    });

    it("should fail with invalid end time", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        market.createMarket("Invalid", pastTime, "invalid-id")
      ).to.be.revertedWith("End time must be in future");
    });
  });

  describe("Trading", function () {
    it("should allow buying YES shares", async function () {
      const amount = ethers.parseUnits("100", 6); // 100 USDC
      const price = 5000; // 50%

      await market.connect(user1).placeOrder(marketId, true, amount, price);

      const position = await market.getUserPosition(marketId, user1.address);
      expect(position.yesShares).to.be.gt(0);
    });

    it("should allow buying NO shares", async function () {
      const amount = ethers.parseUnits("100", 6);
      const price = 5000;

      await market.connect(user1).placeOrder(marketId, false, amount, price);

      const position = await market.getUserPosition(marketId, user1.address);
      expect(position.noShares).to.be.gt(0);
    });

    it("should update market volume", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await market.connect(user1).placeOrder(marketId, true, amount, 5000);

      const info = await market.getMarketInfo(marketId);
      expect(info.totalVolume).to.equal(amount);
    });

    it("should fail with zero amount", async function () {
      await expect(
        market.connect(user1).placeOrder(marketId, true, 0, 5000)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should fail with invalid price", async function () {
      const amount = ethers.parseUnits("100", 6);
      await expect(
        market.connect(user1).placeOrder(marketId, true, amount, 50)
      ).to.be.revertedWith("Invalid price");
    });

    it("should fail if market ended", async function () {
      // Fast forward time
      await time.increase(86401); // 1 day + 1 second

      const amount = ethers.parseUnits("100", 6);
      await expect(
        market.connect(user1).placeOrder(marketId, true, amount, 5000)
      ).to.be.revertedWith("Market ended");
    });
  });

  describe("Price Updates", function () {
    it("should allow oracle to update price", async function () {
      const newPrice = 6500; // 65%

      await oracle.updatePrice(await market.getAddress(), marketId, newPrice);

      const info = await market.getMarketInfo(marketId);
      expect(info.yesPrice).to.equal(newPrice);
    });

    it("should fail if not authorized", async function () {
      await expect(
        oracle.connect(user1).updatePrice(await market.getAddress(), marketId, 6500)
      ).to.be.revertedWith("Not authorized");
    });

    it("should fail with invalid price", async function () {
      await expect(
        oracle.updatePrice(await market.getAddress(), marketId, 10000)
      ).to.be.revertedWith("Price out of bounds");
    });

    it("should batch update multiple markets", async function () {
      // Create another market
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      await market.createMarket("Second Market", endTime, "test-2");

      const marketIds = [0, 1];
      const prices = [6000, 4000];

      await oracle.batchUpdatePrices(await market.getAddress(), marketIds, prices);

      const info0 = await market.getMarketInfo(0);
      const info1 = await market.getMarketInfo(1);
      
      expect(info0.yesPrice).to.equal(6000);
      expect(info1.yesPrice).to.equal(4000);
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      // Place some orders
      const amount = ethers.parseUnits("100", 6);
      await market.connect(user1).placeOrder(marketId, true, amount, 5000);
      await market.connect(user2).placeOrder(marketId, false, amount, 5000);

      // Fast forward past end time
      await time.increase(86401);
    });

    it("should resolve market with YES outcome", async function () {
      await oracle.updatePrice(await market.getAddress(), marketId, 5000);
      await market.resolveMarket(marketId, 1); // Outcome.Yes

      const info = await market.getMarketInfo(marketId);
      expect(info.state).to.equal(2); // Resolved
      expect(info.outcome).to.equal(1); // Yes
    });

    it("should allow claiming rewards for winners", async function () {
      await market.resolveMarket(marketId, 1); // YES wins

      const balanceBefore = await usdc.balanceOf(user1.address);
      await market.connect(user1).claimRewards(marketId);
      const balanceAfter = await usdc.balanceOf(user1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should prevent double claiming", async function () {
      await market.resolveMarket(marketId, 1);
      
      await market.connect(user1).claimRewards(marketId);
      
      await expect(
        market.connect(user1).claimRewards(marketId)
      ).to.be.revertedWith("Rewards already claimed");
    });

    it("should fail if market not ended", async function () {
      // Reset time
      await time.increase(-86402);

      await expect(
        market.resolveMarket(marketId, 1)
      ).to.be.revertedWith("Market not ended yet");
    });
  });

  describe("ConditionalTokens", function () {
    it("should correctly calculate token IDs", async function () {
      const yesTokenId = await conditionalTokens.getYesTokenId(marketId);
      const noTokenId = await conditionalTokens.getNoTokenId(marketId);

      expect(yesTokenId).to.equal(0);
      expect(noTokenId).to.equal(1);
    });

    it("should return user position", async function () {
      const amount = ethers.parseUnits("100", 6);
      await market.connect(user1).placeOrder(marketId, true, amount, 5000);

      const position = await conditionalTokens.getPosition(user1.address, marketId);
      expect(position.yesShares).to.be.gt(0);
    });
  });
});