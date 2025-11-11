const hre = require("hardhat");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const PUBLIC_CLOB_API = "https://clob.polymarket.com/markets";
const MARKETS_FILE = path.join(__dirname, "../markets.json");
const SYNC_INTERVAL = 30000; // 30 seconds

// Get AMM contract address from environment or command line
const AMM_ADDRESS = process.env.AMM_CONTRACT || process.argv[2];

if (!AMM_ADDRESS || AMM_ADDRESS === "0xYourAMMAddress") {
  console.error("❌ Please set AMM contract address:");
  console.error("   export AMM_CONTRACT=0x...");
  console.error("   or: node scripts/syncPolymarket.js 0x...");
  process.exit(1);
}

let syncCount = 0;
let errorCount = 0;

/**
 * Main sync function
 */
async function syncPolymarket() {
  syncCount++;
  
  if (!fs.existsSync(MARKETS_FILE)) {
    console.error("❌ markets.json not found! Run: node scripts/fetchCLOBMarkets.js");
    return;
  }

  const localMarkets = JSON.parse(fs.readFileSync(MARKETS_FILE, "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  
  let amm;
  try {
    amm = await hre.ethers.getContractAt("PredictionMarketAMM", AMM_ADDRESS, deployer);
    
    // Verify contract
    const marketCount = await amm.marketCount();
    if (syncCount === 1) {
      console.log(`\n🚀 Polymarket Real-time Sync Started`);
      console.log(`📍 AMM Contract: ${AMM_ADDRESS}`);
      console.log(`📊 On-chain Markets: ${marketCount}`);
      console.log(`📁 Local Markets: ${localMarkets.length}`);
      console.log(`⏰ Sync Interval: ${SYNC_INTERVAL / 1000}s\n`);
    }
  } catch (err) {
    console.error(`❌ Cannot connect to contract: ${err.message}`);
    errorCount++;
    if (errorCount > 3) process.exit(1);
    return;
  }

  try {
    const res = await axios.get(PUBLIC_CLOB_API, {
      params: {
        limit: 100,
        sort_by: "volume_24h",
        order: "desc",
        closed: false,
        end_date_after: "2025-01-01T00:00:00Z"
      },
      timeout: 15000,
      headers: { 'Accept': 'application/json' }
    });

    const remoteMarkets = res.data?.data || [];
    let synced = 0;
    let skipped = 0;

    console.log(`[${new Date().toLocaleTimeString()}] Sync #${syncCount}`);

    for (let i = 0; i < Math.min(localMarkets.length, 10); i++) {
      const local = localMarkets[i];
      const remote = remoteMarkets.find(m => 
        m.condition_id === local.id || 
        m.market_slug === local.slug
      );

      if (!remote) {
        console.log(`  ⚠️  Market ${i}: No remote data found`);
        continue;
      }

      const yesPriceRaw = parseFloat(
        remote.yes_bid || 
        remote.yes_price || 
        remote.outcome_prices?.[0] || 
        0.5
      );
      
      const yesPrice = Math.max(100, Math.min(9900, Math.round(yesPriceRaw * 10000)));

      try {
        const info = await amm.getMarketInfo(i);
        const currentPrice = Number(info.yesPrice);
        const priceDiff = Math.abs(currentPrice - yesPrice);

        // Skip if price change < 0.5%
        if (priceDiff < 50) {
          skipped++;
          continue;
        }

        const tx = await amm.updatePrice(i, yesPrice, {
          gasLimit: 100000
        });
        
        const change = yesPrice - currentPrice;
        const symbol = change > 0 ? "↑" : "↓";
        
        console.log(`  ✅ Market ${i}: ${currentPrice/100}% → ${yesPrice/100}% ${symbol} ${Math.abs(change/100).toFixed(2)}%`);
        console.log(`     ${local.question.substring(0, 50)}...`);
        console.log(`     Tx: ${tx.hash.substring(0, 10)}...`);
        
        await tx.wait();
        synced++;
        
      } catch (err) {
        if (err.message.includes("insufficient funds")) {
          console.error(`  ❌ Insufficient gas! Please add ETH`);
          break;
        } else if (!err.message.includes("Invalid market")) {
          console.warn(`  ⚠️  Market ${i} update failed: ${err.shortMessage || err.message.substring(0, 50)}`);
        }
      }
    }

    console.log(`  📊 Updated: ${synced} | Skipped: ${skipped} | Next: ${SYNC_INTERVAL/1000}s\n`);
    errorCount = 0; // Reset error count
    
  } catch (err) {
    console.error(`❌ CLOB API request failed: ${err.message}`);
    errorCount++;
    if (errorCount > 5) {
      console.error("Too many consecutive failures, exiting");
      process.exit(1);
    }
  }
}

// Graceful exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Sync service stopped');
  process.exit(0);
});

// Start
console.log('⏳ Initializing...');
syncPolymarket();
setInterval(syncPolymarket, SYNC_INTERVAL);