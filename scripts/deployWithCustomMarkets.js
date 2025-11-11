const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying AMM with Custom Markets\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Step 1: Deploy Mock USDC
  console.log("📝 Deploying Mock USDC...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC:", usdcAddress, "\n");

  // Step 2: Deploy AMM
  console.log("📝 Deploying PredictionMarketAMM...");
  const AMM = await hre.ethers.getContractFactory("PredictionMarketAMM");
  const amm = await AMM.deploy(usdcAddress);
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log("✅ AMM Contract:", ammAddress, "\n");

  // Step 3: Mint test USDC
  console.log("💰 Minting test USDC...");
  const mintAmount = hre.ethers.parseUnits("100000", 6); // 100,000 USDC
  await usdc.mint(deployer.address, mintAmount);
  console.log("✅ Minted 100,000 USDC to deployer\n");

  // Step 4: Load custom markets
  const marketsFile = path.join(__dirname, "../config/markets.json");
  if (!fs.existsSync(marketsFile)) {
    console.error("❌ config/markets.json not found!");
    process.exit(1);
  }

  const markets = JSON.parse(fs.readFileSync(marketsFile, "utf8"));
  console.log(`📊 Creating ${markets.length} custom markets...\n`);

  // Step 5: Create markets with initial liquidity
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    const endTime = Math.floor(new Date(market.endDate).getTime() / 1000);
    
    console.log(`${i + 1}. ${market.icon} ${market.question}`);
    console.log(`   Category: ${market.category}`);
    console.log(`   Base Price: ${market.basePrice / 100}%`);
    console.log(`   End Date: ${market.endDate}`);

    try {
      const initialLiquidity = hre.ethers.parseUnits("10000", 6); // 10,000 USDC per market
      
      const tx = await amm.createMarketWithLiquidity(
        market.question,
        endTime,
        initialLiquidity / 2n, // yesReserve
        initialLiquidity / 2n, // noReserve
        market.basePrice
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ Created | Tx: ${receipt.hash.substring(0, 10)}...\n`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}\n`);
    }
  }

  // Step 6: Save deployment info
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      USDC: usdcAddress,
      AMM: ammAddress
    },
    markets: markets.length
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = path.join(deploymentsDir, `${hre.network.name}-custom.json`);
  fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("-" .repeat(60));
  console.log(`Mock USDC:     ${usdcAddress}`);
  console.log(`AMM Contract:  ${ammAddress}`);
  console.log("-" .repeat(60));
  console.log(`\n📊 Created ${markets.length} markets`);
  console.log(`💰 Initial liquidity: 10,000 USDC per market`);
  console.log(`\n📝 Deployment saved to: ${filename}\n`);

  console.log("🔧 SETUP INSTRUCTIONS:");
  console.log("-" .repeat(60));
  console.log("1. Update frontend/.env:");
  console.log(`   VITE_AMM_CONTRACT=${ammAddress}`);
  console.log(`   VITE_USDC=${usdcAddress}`);
  console.log("");
  console.log("2. Start auto price fluctuation:");
  console.log(`   export AMM_CONTRACT=${ammAddress}`);
  console.log("   npm run fluctuate");
  console.log("");
  console.log("3. Start frontend:");
  console.log("   npm run dev");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });