// Format probability from basis points (10000 = 100%)
export const formatProbability = (basisPoints) => {
  if (!basisPoints) return '50.0';
  return (Number(basisPoints) / 100).toFixed(1);
};

// Parse USDC amount to wei (6 decimals)
export const parseUSDC = (amount) => {
  return BigInt(Math.floor(parseFloat(amount) * 1e6));
};

// Format USDC from wei
export const formatUSDC = (wei) => {
  return (Number(wei) / 1e6).toFixed(2);
};

// ✅ 修复 Payout 计算：投入金额 / 概率
export const calculatePayout = (amount, probability) => {
  if (!amount || !probability || parseFloat(probability) === 0) return '0.00';
  
  const investAmount = parseFloat(amount);
  const prob = parseFloat(probability) / 100; // 转换为小数
  
  // Payout = 投入金额 / 概率
  const payout = investAmount / prob;
  
  return payout.toFixed(2);
};

// ✅ 修复 Profit 计算：Payout - 投入金额
export const calculateProfit = (amount, probability) => {
  if (!amount || !probability || parseFloat(probability) === 0) return '0.00';
  
  const investAmount = parseFloat(amount);
  const payout = parseFloat(calculatePayout(amount, probability));
  
  // Profit = Payout - 投入金额
  const profit = payout - investAmount;
  
  return profit.toFixed(2);
};

// Convert probability to basis points
export const probabilityToBasisPoints = (probability) => {
  return Math.round(parseFloat(probability) * 100);
};

// Format address
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format volume
export const formatVolume = (volume) => {
  if (!volume) return '$0';
  const num = Number(volume) / 1e6;
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
};

// Get time remaining
export const getTimeRemaining = (endTime) => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(endTime) - now;
  
  if (remaining <= 0) return 'Ended';
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};