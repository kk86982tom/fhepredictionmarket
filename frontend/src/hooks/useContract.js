import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  CONTRACTS, 
  NETWORK,
  AMM_ABI,
  USDC_ABI
} from '../utils/contracts';

export const useContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize provider
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      });

      // Check if already connected
      web3Provider.listAccounts().then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          web3Provider.getSigner().then(setSigner);
        }
      });

      web3Provider.getNetwork().then(network => {
        setChainId(Number(network.chainId));
      });
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setAccount(accounts[0]);
      
      const web3Signer = await provider.getSigner();
      setSigner(web3Signer);

      // Check network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (currentChainId !== NETWORK.chainId) {
        await switchNetwork();
      }
    } catch (err) {
      setError(err.message);
      console.error('Connect error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  // Switch to correct network
  const switchNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK.chainId.toString(16)}` }],
      });
    } catch (err) {
      // Network not added, try to add it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${NETWORK.chainId.toString(16)}`,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          throw addError;
        }
      } else {
        throw err;
      }
    }
  }, []);

  // ✅ 使用 useCallback 包装所有返回的函数
  const getContract = useCallback((address, abi, withSigner = false) => {
    if (!provider) return null;
    
    if (withSigner && signer) {
      return new ethers.Contract(address, abi, signer);
    }
    
    return new ethers.Contract(address, abi, provider);
  }, [provider, signer]);

  // ✅ 使用 useCallback
  const getMarketContract = useCallback((withSigner = false) => {
    return getContract(
      CONTRACTS.PREDICTION_MARKET, 
      AMM_ABI,
      withSigner
    );
  }, [getContract]);

  // ✅ 使用 useCallback
  const getUSDCContract = useCallback((withSigner = false) => {
    return getContract(CONTRACTS.USDC, USDC_ABI, withSigner);
  }, [getContract]);

  // ✅ 使用 useCallback
  const disconnect = useCallback(() => {
    setAccount(null);
    setSigner(null);
  }, []);

  return {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnect,
    getMarketContract,
    getUSDCContract,
    isCorrectNetwork: chainId === NETWORK.chainId,
    switchNetwork
  };
};