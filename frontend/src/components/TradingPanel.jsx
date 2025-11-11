import { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { 
  formatProbability, 
  parseUSDC, 
  calculatePayout, 
  calculateProfit
} from '../utils/formatting';

export const TradingPanel = ({ market, onClose, onSuccess }) => {
  const { account, getMarketContract, getUSDCContract } = useContract();
  const [side, setSide] = useState('yes');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  const probability = side === 'yes' 
    ? formatProbability(market.yesPrice)
    : (100 - parseFloat(formatProbability(market.yesPrice))).toFixed(1);

  const payout = amount ? calculatePayout(amount, probability) : '0.00';
  const profit = amount ? calculateProfit(amount, probability) : '0.00';

  // 检查 USDC 授权额度
  useEffect(() => {
    const checkAllowance = async () => {
      if (!account || !amount || !getUSDCContract || !getMarketContract) return;

      try {
        const usdcContract = getUSDCContract();
        const marketContract = getMarketContract();
        const allowance = await usdcContract.allowance(
          account, 
          await marketContract.getAddress()
        );

        const requiredAmount = parseUSDC(amount);
        setNeedsApproval(allowance < requiredAmount);
      } catch (err) {
        console.error('Failed to check allowance:', err);
      }
    };

    checkAllowance();
  }, [account, amount, getUSDCContract, getMarketContract]);

  // ✅ 输入修复：只允许数字和小数点
  const handleAmountChange = (value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // 授权 USDC
  const handleApprove = async () => {
    if (!getUSDCContract || !getMarketContract) return;
    setLoading(true);
    setError(null);

    try {
      const usdcContract = getUSDCContract(true);
      const marketContract = getMarketContract();
      const tx = await usdcContract.approve(
        await marketContract.getAddress(),
        parseUSDC('1000000')
      );
      await tx.wait();
      setNeedsApproval(false);
    } catch (err) {
      setError(err.message);
      console.error('Approval failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 执行交易
  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const marketContract = getMarketContract(true);
      const amountWei = parseUSDC(amount);
      const buyYes = side === 'yes';

      console.log('Buying shares:', {
        marketId: market.id,
        buyYes,
        amount: amountWei.toString()
      });

      const tx = await marketContract.buyShares(
        market.id,
        buyYes,
        amountWei
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.reason || err.message);
      console.error('Trade failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">Trade Market</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Market Question */}
        <p className="text-sm text-gray-700 mb-6">{market.question}</p>

        {/* YES / NO 选择 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setSide('yes')}
            className={`py-3 rounded-lg font-medium transition-all ${
              side === 'yes'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            YES {formatProbability(market.yesPrice)}%
          </button>
          <button
            onClick={() => setSide('no')}
            className={`py-3 rounded-lg font-medium transition-all ${
              side === 'no'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            NO {(100 - parseFloat(formatProbability(market.yesPrice))).toFixed(1)}%
          </button>
        </div>

        {/* ✅ 金额输入框（修复显示问题） */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            autoComplete="off"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                       text-lg text-gray-900 placeholder-gray-400 bg-white"
            // ❌ 不禁用输入框
            disabled={false}
          />
          <div className="flex gap-2 mt-2">
            {['10', '50', '100'].map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 rounded 
                           hover:bg-gray-200 text-sm font-medium"
                disabled={loading}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Info */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Probability</span>
              <span className="font-semibold text-gray-900">{probability}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Potential Payout</span>
              <span className="font-semibold text-gray-900">${payout}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Potential Profit</span>
              <span className={`font-semibold ${
                parseFloat(profit) > 0 ? 'text-green-600' : 'text-gray-900'
              }`}>
                ${profit}
              </span>
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="w-full py-3 bg-yellow-500 text-white rounded-lg font-medium 
                         hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Approving...' : 'Approve USDC'}
            </button>
          ) : (
            <button
              onClick={handleTrade}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className={`w-full py-3 rounded-lg font-medium text-white 
                         disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'yes'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {loading ? 'Processing...' : `Buy ${side.toUpperCase()}`}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium 
                       hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
