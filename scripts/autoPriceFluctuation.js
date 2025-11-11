const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const MARKETS_CONFIG = path.join(__dirname, "../config/markets.json");
const SYNC_INTERVAL = 30000; // 30 seconds
const PRICE_FLUCTUATION = 5; // ±5% fluctuation

// Get AMM contract address from environment or command line
const AMM_ADDRESS = process.env.AMM_CONTRACT || process.argv[2];

if (!AMM_ADDRESS || AMM_ADDRESS === "0xYourAMMAddress") {
  console.error("❌ Please set AMM contract address:");
  console.error("   export AMM_CONTRACT=0x...");
  console.error("   or: node scripts/autoPriceFluctuation.js 0x...");
  process.exit(1);
}

let syncCount = 0;
let marketBasePrices = []; // Store base prices for each market

/**
 * Generate random price within ±5% of base price
 */
function generateFluctuatedPrice(basePrice) {
  // Generate random fluctuation between -5% and +5%
  const fluctuation = (Math.random() - 0.5) * 2 * PRICE_FLUCTUATION;
  const newPrice = basePrice * (1 + fluctuation / 100);
  
  // Clamp between 1% and 99%
  return Math.max(100, Math.min(9900, Math.round(newPrice)));
}

/**
 * Smooth price transition (prevents huge jumps)
 */
function smoothTransition(currentPrice, targetPrice, maxChange = 200) {
  const diff = targetPrice - currentPrice;
  const change = Math.min(Math.abs(diff), maxChange) * Math.sign(diff);
  return Math.round(currentPrice + change);
}

/**
 * Main auto-fluctuation function
 */
async function autoFluctuatePrices() {
  syncCount++;

  if (!fs.existsSync(MARKETS_CONFIG)) {
    console.error("❌ config/markets.json not found!");
    console.error("   Create it with your custom market definitions");
    process.exit(1);
  }

  const markets = JSON.parse(fs.readFileSync(MARKETS_CONFIG, "utf8"));
  const [deployer] = await hre.ethers.getSigners();

  let amm;
  try {
    amm = await hre.ethers.getContractAt("PredictionMarketAMM", AMM_ADDRESS, deployer);

    const marketCount = await amm.marketCount();
    
    if (syncCount === 1) {
      console.log(`\n🎲 Auto Price Fluctuation Started`);
      console.log(`📍 AMM Contract: ${AMM_ADDRESS}`);
      console.log(`📊 Markets: ${marketCount}`);
      console.log(`📈 Fluctuation Range: ±${PRICE_FLUCTUATION}%`);
      console.log(`⏰ Update Interval: ${SYNC_INTERVAL / 1000}s\n`);
      
      // Initialize base prices
      marketBasePrices = markets.map(m => m.basePrice);
    }
  } catch (err) {
    console.error(`❌ Cannot connect to contract: ${err.message}`);
    process.exit(1);
  }

  try {
    let updated = 0;
    let skipped = 0;

    console.log(`[${new Date().toLocaleTimeString()}] Update #${syncCount}`);

    for (let i = 0; i < Math.min(markets.length, marketBasePrices.length); i++) {
      const basePrice = marketBasePrices[i];
      
      try {
        // Get current on-chain price
        const info = await amm.getMarketInfo(i);
        const currentPrice = Number(info.yesPrice);

        // Generate target price with fluctuation
        const targetPrice = generateFluctuatedPrice(basePrice);
        
        // Smooth transition to avoid huge jumps
        const newPrice = smoothTransition(currentPrice, targetPrice);

        // Skip if change is too small (< 0.5%)
        const priceDiff = Math.abs(newPrice - currentPrice);
        if (priceDiff < 50) {
          skipped++;
          continue;
        }

        // Update price on-chain
        const tx = await amm.updatePrice(i, newPrice, {
          gasLimit: 100000
        });

        const change = newPrice - currentPrice;
        const symbol = change > 0 ? "↑" : "↓";
        const changePercent = ((change / currentPrice) * 100).toFixed(2);

        console.log(`  ✅ Market ${i}: ${currentPrice/100}% → ${newPrice/100}% ${symbol} ${Math.abs(changePercent)}%`);
        console.log(`     ${markets[i].question.substring(0, 50)}...`);
        console.log(`     Base: ${basePrice/100}% | Tx: ${tx.hash.substring(0, 10)}...`);

        await tx.wait();
        updated++;

      } catch (err) {
        if (err.message.includes("insufficient funds")) {
          console.error(`  ❌ Insufficient gas! Please add ETH to ${deployer.address}`);
          break;
        } else if (!err.message.includes("Invalid market")) {
          console.warn(`  ⚠️  Market ${i} update failed: ${err.shortMessage || err.message.substring(0, 50)}`);
        }
      }
    }

    console.log(`  📊 Updated: ${updated} | Skipped: ${skipped} | Next: ${SYNC_INTERVAL/1000}s\n`);

  } catch (err) {
    console.error(`❌ Auto-fluctuation error: ${err.message}`);
  }
}

// Graceful exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Auto-fluctuation service stopped');
  process.exit(0);
});

// Start
console.log('⏳ Initializing auto price fluctuation...');
autoFluctuatePrices();
setInterval(autoFluctuatePrices, SYNC_INTERVAL);