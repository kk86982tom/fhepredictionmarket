// ✅ 方案1: 如果你的 JSON 文件在 frontend/src/contracts/ 目录
// import PredictionMarketAMMArtifact from '../contracts/PredictionMarketAMM.json';

// ✅ 方案2: 如果你的 JSON 文件在项目根目录的 artifacts/
// 需要先复制到 frontend/public/ 或 frontend/src/

// Contract configuration
export const CONTRACTS = {
  USDC: import.meta.env.VITE_USDC_ADDRESS || import.meta.env.VITE_USDC,
  AMM: import.meta.env.VITE_AMM_CONTRACT,
  PREDICTION_MARKET: import.meta.env.VITE_AMM_CONTRACT,
};

export const NETWORK = {
  chainId: parseInt(import.meta.env.VITE_NETWORK_ID || '11155111'),
  name: import.meta.env.VITE_NETWORK_NAME || 'Sepolia',
  rpcUrl: import.meta.env.VITE_RPC_URL || '',
};

// ✅ 完整的 AMM ABI - 确保包含 sellShares
export const AMM_ABI = [
  // Read functions
  "function marketCount() view returns (uint256)",
  "function markets(uint256) view returns (tuple(string question, uint256 endTime, uint256 yesReserve, uint256 noReserve, uint256 totalYesShares, uint256 totalNoShares, bool resolved, bool outcome))",
  "function getMarketInfo(uint256 marketId) view returns (string question, uint256 yesPrice, uint256 totalVolume, uint256 endTime, uint256 yesReserve, uint256 noReserve)",
  "function getAllMarkets() view returns (string[] questions, uint256[] yesPrices, uint256[] volumes, uint256[] endTimes)",
  "function userYesShares(uint256, address) view returns (uint256)",
  "function userNoShares(uint256, address) view returns (uint256)",
  "function getUserPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)",
  
  // Write functions
  "function buyShares(uint256 _marketId, bool _buyYes, uint256 _usdcAmount)",
  "function sellShares(uint256 _marketId, bool _sellYes, uint256 _sharesAmount)",
  "function claimWinnings(uint256 _marketId)",
  
  // Owner functions
  "function createMarketWithLiquidity(string memory _question, uint256 _endTime, uint256 _initialYesReserve, uint256 _initialNoReserve, uint256 _initialYesPrice) returns (uint256)",
  "function updatePrice(uint256 _marketId, uint256 _yesPrice)",
  "function resolveMarket(uint256 _marketId, bool _outcome)",
  
  // Events
  "event MarketCreated(uint256 indexed marketId, string question, uint256 endTime)",
  "event Trade(address indexed user, uint256 indexed marketId, bool buyYes, uint256 usdcAmount, uint256 sharesAmount)",
  "event SharesSold(address indexed user, uint256 indexed marketId, bool soldYes, uint256 sharesAmount, uint256 usdcReceived)",
  "event PriceUpdated(uint256 indexed marketId, uint256 yesPrice)",
  "event MarketResolved(uint256 indexed marketId, bool outcome)"
];

export const PREDICTION_MARKET_ABI = AMM_ABI;

// USDC ABI
export const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function faucet(uint256 amount)"
];

// Market states
export const MarketState = {
  ACTIVE: 0,
  CLOSED: 1,
  RESOLVED: 2
};

export const Outcome = {
  UNRESOLVED: 0,
  YES: 1,
  NO: 2,
  INVALID: 3
};

export const getStateName = (state) => {
  const names = ['Active', 'Closed', 'Resolved'];
  return names[state] || 'Unknown';
};

export const getOutcomeName = (outcome) => {
  const names = ['Unresolved', 'Yes', 'No', 'Invalid'];
  return names[outcome] || 'Unknown';
};