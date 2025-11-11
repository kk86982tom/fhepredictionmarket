import { useState } from 'react';
import { formatProbability, formatVolume, getTimeRemaining } from '../utils/formatting';

export const MarketCard = ({ market, onSelect }) => {
  const [showQuickTrade, setShowQuickTrade] = useState(false);

  const isActive = market.state === 0;
  const probability = market.yesPrice ? formatProbability(market.yesPrice) : '50.0';
  const noProb = (100 - parseFloat(probability)).toFixed(1);
  const timeLeft = getTimeRemaining(market.endTime);

  return (
    <div className="relative">
      <div 
        className="card p-6 cursor-pointer animate-fade-in bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-purple-500 transition-all"
        onClick={() => !showQuickTrade && onSelect(market)}
      >
        {/* Header with Icon and Category */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{market.icon || '📊'}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isActive 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-700 text-gray-400'
            }`}>
              {market.category || 'General'}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {timeLeft}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 min-h-[56px]">
          {market.question}
        </h3>

        {/* Description (if available) */}
        {market.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {market.description}
          </p>
        )}

        {/* Probability Display - Large Numbers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <div className="text-xs text-gray-400 mb-1">YES</div>
            <div className="text-2xl font-bold text-green-400">{probability}%</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
            <div className="text-xs text-gray-400 mb-1">NO</div>
            <div className="text-2xl font-bold text-red-400">{noProb}%</div>
          </div>
        </div>

        {/* Probability Bars */}
        <div className="space-y-2 mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-sm text-gray-400 pt-3 border-t border-gray-700">
          <span>Volume</span>
          <span className="font-semibold text-white">{formatVolume(market.totalVolume)}</span>
        </div>

        {/* Trade Button */}
        {isActive && (
          <button 
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(market);
            }}
          >
            Trade Now
          </button>
        )}
      </div>
    </div>
  );
};