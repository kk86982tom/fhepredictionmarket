import { useState, useEffect, useCallback, useRef } from 'react';
import { useContract } from './useContract';

export const useMarkets = () => {
  const { getMarketContract, provider } = useContract();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ 使用 ref 防止重复调用
  const isFetchingRef = useRef(false);

  // Fetch all markets
  const fetchMarkets = useCallback(async () => {
    // ✅ 防止并发调用
    if (isFetchingRef.current) {
      console.log('⏸️ Already fetching, skip...');
      return;
    }

    console.log('🚀 fetchMarkets START');
    
    if (!provider) {
      console.warn('⚠️ Provider not ready');
      setLoading(false);
      return;
    }

    const contract = getMarketContract();
    
    if (!contract) {
      console.warn('⚠️ Contract not ready yet');
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);

      const count = await contract.marketCount();
      const marketCount = Number(count);
      
      console.log('📊 Market count from contract:', marketCount);
      console.log('📊 Raw count value:', count);
      
      if (marketCount === 0) {
        setMarkets([]);
        return;
      }

      // Fetch market info inline to avoid dependency issues
      const marketPromises = [];
      for (let i = 0; i < marketCount; i++) {
        marketPromises.push(
          (async () => {
            try {
              const info = await contract.getMarketInfo(i);
              return {
                id: i,
                question: info[0],
                state: 0,
                outcome: 0,
                endTime: Number(info[3]),
                yesPrice: Number(info[1]),
                totalVolume: info[2] ? Number(info[2]) : 0,
                yesReserve: info[4] ? Number(info[4]) : 0,
                noReserve: info[5] ? Number(info[5]) : 0,
                createdAt: 0
              };
            } catch (err) {
              console.error(`Failed to fetch market ${i}:`, err);
              return null;
            }
          })()
        );
      }

      const marketData = await Promise.all(marketPromises);
      const validMarkets = marketData.filter(m => m !== null);
      
      console.log('✅ Markets loaded:', validMarkets.length);
      setMarkets(validMarkets);
      
    } catch (err) {
      console.error('❌ Failed to fetch markets:', err);
      setError(err.message);
    } finally {
      console.log('🏁 Setting loading = false');
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [getMarketContract, provider]); // ✅ 只依赖这两个

  useEffect(() => {
    console.log('📌 useMarkets useEffect triggered');
    fetchMarkets();

    const interval = setInterval(() => {
      console.log('🔄 Auto refresh...');
      fetchMarkets();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets
  };
};