import { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { formatAddress, formatUSDC } from '../utils/formatting';

export const Header = () => {
  const { 
    account, 
    isConnecting, 
    connectWallet, 
    disconnect, 
    isCorrectNetwork,
    switchNetwork,
    getUSDCContract
  } = useContract();

  const [balance, setBalance] = useState('0');
  const [showMenu, setShowMenu] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Fetch USDC balance
  useEffect(() => {
    if (account && getUSDCContract) {
      const fetchBalance = async () => {
        try {
          const contract = getUSDCContract();
          const bal = await contract.balanceOf(account);
          setBalance(formatUSDC(bal));
        } catch (err) {
          console.error('Failed to fetch balance:', err);
        }
      };

      fetchBalance();
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [account, getUSDCContract]);

  // Claim test USDC from faucet
  const handleFaucet = async () => {
    if (!getUSDCContract) return;

    setClaiming(true);
    try {
      const contract = getUSDCContract(true);
      const amount = BigInt(1000 * 1e6); // 1000 USDC
      
      const tx = await contract.faucet(amount);
      await tx.wait();
      
      alert('Successfully claimed 1000 test USDC!');
      
      // Refresh balance
      const bal = await contract.balanceOf(account);
      setBalance(formatUSDC(bal));
    } catch (err) {
      console.error('Faucet failed:', err);
      alert('Failed to claim: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                FHE Prediction Market
              </h1>
              <p className="text-xs text-gray-500">
                Privacy-Preserving Predictions
              </p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {/* Network Warning */}
            {account && !isCorrectNetwork && (
              <button
                onClick={switchNetwork}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Wrong Network - Switch to Sepolia
              </button>
            )}

            {/* Get Test USDC Button */}
            {account && isCorrectNetwork && (
              <button
                onClick={handleFaucet}
                disabled={claiming}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {claiming ? 'Claiming...' : '💰 Get Test USDC'}
              </button>
            )}

            {/* Balance */}
            {account && isCorrectNetwork && (
              <div className="hidden sm:flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                <span className="text-sm font-medium text-gray-400">
                  Balance:
                </span>
                <span className="text-sm font-bold text-white">
                  ${balance} USDC
                </span>
              </div>
            )}

            {/* Connect/Account Button */}
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-white">
                    {formatAddress(account)}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 border border-gray-700 animate-fade-in">
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                      {formatAddress(account)}
                    </div>
                    <div className="px-4 py-2 text-sm text-white">
                      ${balance} USDC
                    </div>
                    <button
                      onClick={() => {
                        disconnect();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};