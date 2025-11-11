const { ethers } = require("hardhat");

async function main() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Mock USD", "mUSD", ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  const PredictionMarketAMM = await ethers.getContractFactory("PredictionMarketAMM");
  const amm = await PredictionMarketAMM.deploy(await mockToken.getAddress());
  await amm.waitForDeployment();
  console.log("PredictionMarketAMM deployed to:", await amm.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
