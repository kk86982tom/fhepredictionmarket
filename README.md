# FHE Prediction Market

A privacy-preserving prediction market powered by ZAMA's FHEVM technology with real-time price synchronization from Polymarket.

## Features

- 🔒 **Privacy-First**: Encrypted trading using Fully Homomorphic Encryption (FHE)
- 📊 **Real-Time Prices**: Synced with Polymarket for accurate market probabilities
- 🎯 **Binary Markets**: Simple YES/NO outcome predictions
- 💰 **Outcome Tokens**: ERC1155-based conditional tokens
- 🔮 **Oracle Integration**: Automated price updates and market resolution

## Architecture

```
contracts/
├── PredictionMarket.sol       # Core market logic
├── ConditionalTokens.sol      # YES/NO outcome tokens
├── MarketFactory.sol          # Market deployment factory
├── PolymarketOracle.sol       # Price sync oracle
└── MockERC20.sol              # Test USDC token

scripts/
├── deploy.js                  # Deploy all contracts
├── createMarkets.js           # Create sample markets
└── syncPolymarket.js          # Continuous price sync service

test/
└── PredictionMarket.test.js   # Comprehensive test suite
```

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### 3. Run Local Node

```bash
npm run node
```

### 4. Deploy Contracts (new terminal)

```bash
npm run deploy:local
```

### 5. Create Sample Markets

```bash
node scripts/createMarkets.js
```

### 6. Start Price Sync Service

```bash
# Use simulated prices for local testing
SIMULATE_PRICES=true node scripts/syncPolymarket.js
```

### 7. Run Tests

```bash
npm test
```

## Deployment

### Sepolia Testnet

**Prerequisites:**
1. Get Sepolia ETH from faucet: https://sepoliafaucet.com
2. Get Alchemy/Infura API key: https://www.alchemy.com
3. Export your MetaMask private key (DO NOT share!)

**Steps:**

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and SEPOLIA_RPC_URL

# 2. Deploy contracts
npm run deploy:sepolia

# 3. Create markets
node scripts/createMarkets.js --network sepolia

# 4. Start price sync (keep running)
node scripts/syncPolymarket.js --network sepolia

# 5. Verify contracts (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

**Expected Output:**
```
🚀 Starting deployment...
Deploying contracts with account: 0x...
✅ Mock USDC deployed to: 0x...
✅ MarketFactory deployed to: 0x...
✅ ConditionalTokens deployed to: 0x...
✅ PredictionMarket deployed to: 0x...
✅ PolymarketOracle deployed to: 0x...
📄 Deployment info saved to: deployments/sepolia.json
```

### Local Development

### Configuration

Update `hardhat.config.js` with your network settings:

```javascript
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## Market Categories

The system supports 5 prediction categories:

1. **Crypto** - Cryptocurrency price predictions
2. **Politics** - Election and political outcomes
3. **Sports** - Major sporting event results
4. **Economics** - Fed decisions, inflation, GDP
5. **Technology** - Product launches, AI developments

## Smart Contract API

### Create Market

```solidity
function createMarket(
    string calldata question,
    uint256 endTime,
    string calldata polymarketId
) external returns (uint256 marketId)
```

### Place Order

```solidity
function placeOrder(
    uint256 marketId,
    bool buyYes,
    uint256 amount,
    uint256 price
) external
```

### Update Price (Oracle)

```solidity
function updatePrice(
    uint256 marketId,
    uint256 yesPrice
) external
```

### Resolve Market

```solidity
function resolveMarket(
    uint256 marketId,
    Outcome outcome
) external
```

### Claim Rewards

```solidity
function claimRewards(uint256 marketId) external
```

## Price Synchronization

The system syncs prices from Polymarket every 30 seconds:

```javascript
// Fetch price from Polymarket API
const response = await axios.get(`${POLYMARKET_API}/prices`, {
  params: { market: polymarketId }
});

// Update on-chain
await oracle.updatePrice(marketAddress, marketId, yesPrice);
```

## Testing

Run the full test suite:

```bash
npm test
```

Test coverage includes:
- Market creation and validation
- Order placement and execution
- Price updates and synchronization
- Market resolution and payouts
- Token minting and transfers
- Oracle authorization

## Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control for oracles and admins
- ✅ Price slippage protection (5% tolerance)
- ✅ Input validation on all parameters
- ✅ SafeERC20 for token transfers

## Roadmap

- [ ] Integrate ZAMA FHEVM SDK for encrypted orders
- [ ] Add liquidity pools for better price discovery
- [ ] Implement order book matching engine
- [ ] Deploy to Zama devnet
- [ ] Build frontend interface
- [ ] Add Chainlink oracle integration
- [ ] Support multiple collateral tokens

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For questions or issues, please open a GitHub issue.