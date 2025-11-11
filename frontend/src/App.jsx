import { useState } from 'react';
import { Header } from './components/Header';
import { MarketList } from './components/MarketList';
import { Portfolio } from './components/Portfolio';
import { useMarkets } from './hooks/useMarkets';

function App() {
  const { markets, loading, error, refetch } = useMarkets();
  const [activeTab, setActiveTab] = useState('markets');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('markets')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'markets'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Markets
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Portfolio
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'markets' ? (
          <MarketList 
            markets={markets}
            loading={loading}
            error={error}
            refetch={refetch}
          />
        ) : (
          <Portfolio markets={markets} />
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400 text-sm">
          <p className="mb-2">
            FHE Prediction Market - Privacy-Preserving Predictions
          </p>
          <p className="text-gray-500">
            Powered by ZAMA FHEVM | Inspired by Opinion Trade
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;