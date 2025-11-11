import { useState } from 'react';
import { MarketCard } from './MarketCard';
import { TradingPanel } from './TradingPanel';

export const MarketList = ({ markets, loading, error, refetch }) => {
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [filter, setFilter] = useState('all');

  // ✅ 简化过滤逻辑，不依赖 MarketState
  const filteredMarkets = markets.filter(market => {
    if (filter === 'active') return market.state === 0;
    if (filter === 'resolved') return market.state !== 0;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
        <p className="font-bold text-lg">Error loading markets</p>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={refetch} 
          className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg shadow-xl">
        <p className="text-gray-300 text-lg">No markets available</p>
        <button 
          onClick={refetch} 
          className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex space-x-2 bg-gray-800 rounded-lg p-2 shadow-xl">
          {['all', 'active', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-md font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredMarkets.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg shadow-xl">
          <p className="text-gray-300 text-lg">No {filter} markets found</p>
          <button 
            onClick={() => setFilter('all')} 
            className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Show All Markets
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map(market => (
            <MarketCard 
              key={market.id} 
              market={market} 
              onSelect={setSelectedMarket} 
            />
          ))}
        </div>
      )}

      {selectedMarket && (
        <TradingPanel 
          market={selectedMarket} 
          onClose={() => setSelectedMarket(null)} 
          onSuccess={refetch} 
        />
      )}
    </>
  );
};