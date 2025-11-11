# Complete Setup Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Configure Frontend Environment

Edit `frontend/.env` with your deployed contract addresses:

```bash
VITE_NETWORK_ID=11155111
VITE_NETWORK_NAME=Sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Your deployed contract addresses
VITE_USDC_ADDRESS=0xe20B53Cb18C8e15b3242042117f184d25288BbD0
VITE_MARKET_FACTORY_ADDRESS=0x7eb01c6f0AB1177Fe12c2622A53d7463cCd95251
VITE_CONDITIONAL_TOKENS_ADDRESS=0x0b2ad66697DdF3a7278173F96Cd3D99427c414cd
VITE_PREDICTION_MARKET_ADDRESS=0x78636A641Ee4a5c93D3d657B5A5E82E210E7aB8f
VITE_ORACLE_ADDRESS=0x11A1737dBc900ec989029031F6509046f5A8d0da

VITE_POLYMARKET_API=https://clob.polymarket.com
VITE_APP_NAME=FHE Prediction Market
VITE_PRICE_UPDATE_INTERVAL=30000
```

### Step 3: Create Markets

```bash
node scripts/createMarkets.js
```

### Step 4: Start Price Sync Service (Terminal 1)

```bash
# Use simulated prices for testing
SIMULATE_PRICES=true node scripts/syncPolymarket.js
```

### Step 5: Start Frontend (Terminal 2)

```bash
npm run dev
```

The app will open at http://localhost:3000

## 📱 Using the App

### 1. Connect Wallet
- Click "Connect Wallet" in the header
- Approve MetaMask connection
- Make sure you're on Sepolia network

### 2. Get Test USDC
You can mint test USDC using the contract's faucet function:

```javascript
// In browser console or using ethers
const usdc = new ethers.Contract(
  "0xe20B53Cb18C8e15b3242042117f184d25288BbD0",
  ["function faucet(uint256 amount)"],
  signer
);

// Mint 1000 USDC (1000 * 10^6)
await usdc.faucet("1000000000");
```

### 3. Trade on Markets
- Browse available markets
- Click on a market to open trading panel
- Choose YES or NO
- Enter amount in USDC
- Click "Approve USDC" (first time only)
- Click "Buy YES" or "Buy NO"
- Confirm transaction in MetaMask

### 4. View Portfolio
- Click "Portfolio" tab
- See all your positions
- Claim rewards for resolved markets

## 🌐 Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free)
- Contracts deployed to Sepolia

### Steps

1. **Push code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fhe-prediction-market.git
git push -u origin main
```

2. **Connect to Vercel**
- Go to https://vercel.com
- Click "New Project"
- Import your GitHub repository
- Configure environment variables in Vercel dashboard

3. **Add Environment Variables in Vercel**
Go to Project Settings → Environment Variables and add:
```
VITE_NETWORK_ID=11155111
VITE_NETWORK_NAME=Sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
VITE_USDC_ADDRESS=0xe20B53Cb18C8e15b3242042117f184d25288BbD0
VITE_MARKET_FACTORY_ADDRESS=0x7eb01c6f0AB1177Fe12c2622A53d7463cCd95251
VITE_CONDITIONAL_TOKENS_ADDRESS=0x0b2ad66697DdF3a7278173F96Cd3D99427c414cd
VITE_PREDICTION_MARKET_ADDRESS=0x78636A641Ee4a5c93D3d657B5A5E82E210E7aB8f
VITE_ORACLE_ADDRESS=0x11A1737dBc900ec989029031F6509046f5A8d0da
VITE_POLYMARKET_API=https://clob.polymarket.com
VITE_APP_NAME=FHE Prediction Market
VITE_PRICE_UPDATE_INTERVAL=30000
```

4. **Deploy**
- Click "Deploy"
- Wait for build to complete
- Your app will be live at `https://your-project.vercel.app`

## 🔧 Troubleshooting

### "Wrong Network" Error
- Click "Switch to Sepolia" button in the header
- Or manually switch in MetaMask

### "Insufficient USDC" Error
- Use the faucet function to mint test USDC (see step 2 above)
- Or ask the contract owner to mint USDC to your address

### Transactions Failing
- Make sure you have enough Sepolia ETH for gas
- Get free Sepolia ETH from https://sepoliafaucet.com
- Check that markets are still active (not ended)

### Markets Not Loading
- Check that price sync service is running
- Verify contract addresses in frontend/.env
- Check browser console for errors

### MetaMask Not Connecting
- Make sure MetaMask is installed
- Try refreshing the page
- Clear MetaMask cache if needed

## 📊 Testing Checklist

- [ ] Connect wallet successfully
- [ ] See list of markets
- [ ] Prices are updating (check console logs)
- [ ] Can approve USDC
- [ ] Can place YES order
- [ ] Can place NO order
- [ ] Can view positions in Portfolio
- [ ] Can claim rewards (after market resolves)

## 🎯 Features Implemented

✅ Smart Contracts
- PredictionMarket with order placement
- ConditionalTokens (YES/NO shares)
- PolymarketOracle for price sync
- MarketFactory for deployments

✅ Frontend
- Wallet connection (MetaMask)
- Market listing with live prices
- Trading interface with approval flow
- Portfolio view with positions
- Responsive design (mobile-friendly)

✅ Integration
- Real-time price updates
- Transaction status tracking
- Error handling
- Network detection

## 📝 Next Steps

1. Integrate actual Polymarket API (replace simulated prices)
2. Add FHEVM encryption for private orders
3. Implement order book matching
4. Add market creation UI
5. Enhanced analytics and charts
6. Social features (leaderboards, sharing)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check MetaMask for pending transactions
4. Verify all contract addresses are correct

Happy Trading! 🎲