import { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { formatUSDC } from '../utils/formatting';

export const Portfolio = ({ markets }) => {
  const { account, getMarketContract } = useContract();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  const [selling, setSelling] = useState({});
  const [sellAmount, setSellAmount] = useState(''); // ✅ 改为单个字符串
  const [showSellModal, setShowSellModal] = useState(null);

  // Fetch user positions
  useEffect(() => {
    if (!account || !getMarketContract || markets.length === 0) return;

    const fetchPositions = async () => {
      setLoading(true);
      try {
        const contract = getMarketContract();
        const positionPromises = markets.map(async (market) => {
          try {
            const yesShares = await contract.userYesShares(market.id, account);
            const noShares = await contract.userNoShares(market.id, account);
            
            if (yesShares > 0n || noShares > 0n) {
              return { market, yesShares, noShares };
            }
          } catch (err) {
            console.error(`Failed to fetch position for market ${market.id}:`, err);
          }
          return null;
        });

        const results = await Promise.all(positionPromises);
        setPositions(results.filter(p => p !== null));
      } catch (err) {
        console.error('Failed to fetch positions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [account, getMarketContract, markets]);

  // ✅ 打开卖出弹窗时重置输入
  const openSellModal = (modalData) => {
    console.log('Opening sell modal:', modalData);
    setSellAmount(''); // 重置为空
    setShowSellModal(modalData);
  };

  // ✅ 处理输入变化
  const handleAmountChange = (value) => {
    console.log('Amount changed:', value);
    
    // 只允许数字和小数点
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellAmount(value);
    }
  };

  // ✅ 设置百分比
  const setPercentageAmount = (percentage) => {
    if (!showSellModal) return;
    
    const maxValue = parseFloat(formatUSDC(showSellModal.max));
    const amount = (maxValue * percentage / 100).toFixed(2);
    
    console.log('Setting percentage:', percentage, 'Amount:', amount);
    setSellAmount(amount);
  };

  // Sell shares
  const handleSell = async () => {
    if (!showSellModal) return;
    
    console.log('Selling - Amount:', sellAmount, 'Modal:', showSellModal);

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const maxValue = parseFloat(formatUSDC(showSellModal.max));
    if (parseFloat(sellAmount) > maxValue) {
      alert(`Amount cannot exceed ${maxValue} USDC`);
      return;
    }

    if (!getMarketContract) return;

    const key = `${showSellModal.marketId}-${showSellModal.type}`;
    setSelling(prev => ({ ...prev, [key]: true }));

    try {
      const contract = getMarketContract(true);
      const sharesWei = BigInt(Math.floor(parseFloat(sellAmount) * 1e6));
      
      console.log('Calling sellShares with:', {
        marketId: showSellModal.marketId,
        sellYes: showSellModal.type === 'yes',
        sharesAmount: sharesWei.toString()
      });
      
      const tx = await contract.sellShares(
        showSellModal.marketId, 
        showSellModal.type === 'yes', 
        sharesWei
      );
      
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      
      alert('✅ Shares sold successfully!');
      setShowSellModal(null);
      setSellAmount('');
      
      window.location.reload();
    } catch (err) {
      console.error('Failed to sell shares:', err);
      alert('❌ Failed to sell: ' + (err.reason || err.message));
    } finally {
      setSelling(prev => ({ ...prev, [key]: false }));
    }
  };

  // Claim rewards
  const handleClaim = async (marketId) => {
    if (!getMarketContract) return;

    setClaiming(prev => ({ ...prev, [marketId]: true }));

    try {
      const contract = getMarketContract(true);
      const tx = await contract.claimWinnings(marketId);
      await tx.wait();
      
      alert('✅ Rewards claimed successfully!');
      window.location.reload();
    } catch (err) {
      console.error('Failed to claim rewards:', err);
      alert('❌ Failed to claim: ' + (err.reason || err.message));
    } finally {
      setClaiming(prev => ({ ...prev, [marketId]: false }));
    }
  };

  if (!account) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">Connect your wallet to view portfolio</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-500 text-lg font-medium">No active positions</p>
        <p className="text-sm text-gray-400 mt-2">
          Start trading to see your positions here
        </p>
      </div>
    );
  }

  const isSelling = showSellModal ? selling[`${showSellModal.marketId}-${showSellModal.type}`] : false;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Positions</h2>
      
      <div className="space-y-4">
        {positions.map(({ market, yesShares, noShares }) => {
          const isResolved = market.state === 2;
          const canClaim = isResolved && (yesShares > 0n || noShares > 0n);
          const isActive = market.state === 0;

          return (
            <div 
              key={market.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 mb-3">
                {market.question}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-3">
                {yesShares > 0n && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">YES Shares</p>
                    <p className="text-lg font-bold text-green-600 mb-2">
                      {formatUSDC(yesShares)} USDC
                    </p>
                    {isActive && (
                      <button
                        onClick={() => openSellModal({ 
                          marketId: market.id, 
                          type: 'yes', 
                          max: yesShares,
                          question: market.question 
                        })}
                        className="w-full py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors font-medium"
                      >
                        Sell YES
                      </button>
                    )}
                  </div>
                )}

                {noShares > 0n && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">NO Shares</p>
                    <p className="text-lg font-bold text-red-600 mb-2">
                      {formatUSDC(noShares)} USDC
                    </p>
                    {isActive && (
                      <button
                        onClick={() => openSellModal({ 
                          marketId: market.id, 
                          type: 'no', 
                          max: noShares,
                          question: market.question 
                        })}
                        className="w-full py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors font-medium"
                      >
                        Sell NO
                      </button>
                    )}
                  </div>
                )}
              </div>

              {canClaim && (
                <button
                  onClick={() => handleClaim(market.id)}
                  disabled={claiming[market.id]}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {claiming[market.id] ? 'Claiming...' : '🎉 Claim Rewards'}
                </button>
              )}

              {isResolved && (
                <div className="mt-2 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    market.outcome === 1 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    Market Resolved - Outcome: {market.outcome === 1 ? 'YES' : 'NO'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSellModal(null);
            setSellAmount('');
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()} // ✅ 防止点击内容区关闭
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Sell {showSellModal.type.toUpperCase()} Shares
              </h3>
              <button
                onClick={() => {
                  setShowSellModal(null);
                  setSellAmount('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {showSellModal.question}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (max: {formatUSDC(showSellModal.max)} USDC)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={sellAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-4 py-3 pr-16 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-mono"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">
                  USDC
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setPercentageAmount(pct)}
                    type="button"
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 font-medium transition-colors active:bg-gray-300"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {sellAmount && parseFloat(sellAmount) > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">You will receive</span>
                  <span className="font-semibold text-gray-900">
                    ~{(parseFloat(sellAmount) * 0.997).toFixed(2)} USDC
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  (0.3% fee applied)
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSell}
                disabled={
                  isSelling ||
                  !sellAmount ||
                  parseFloat(sellAmount) <= 0 ||
                  parseFloat(sellAmount) > parseFloat(formatUSDC(showSellModal.max))
                }
                type="button"
                className={`flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  showSellModal.type === 'yes' 
                    ? 'bg-green-500 hover:bg-green-600 active:bg-green-700' 
                    : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                }`}
              >
                {isSelling ? 'Selling...' : 'Confirm Sell'}
              </button>
              <button
                onClick={() => {
                  setShowSellModal(null);
                  setSellAmount('');
                }}
                disabled={isSelling}
                type="button"
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors active:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};