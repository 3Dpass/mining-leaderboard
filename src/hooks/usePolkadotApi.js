import { useEffect, useRef, useState, useCallback } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';

export const usePolkadotApi = () => {
  const apiRef = useRef(null);
  const providerRef = useRef(null);
  const [api, setApi] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [endpoint, setEndpoint] = useState(() => {
    // Check if a custom endpoint exists in localStorage
    const saved = localStorage.getItem('customRpcEndpoint');
    return saved || config.websocketEndpoint;
  });

  const [error, setError] = useState(null);

  // Helper function to extract error message from various error types
  const extractErrorMessage = useCallback((err) => {
    if (!err) return 'Unknown error';
    
    // Handle Event objects (common with WebSocket errors)
    if (err instanceof Event) {
      return err.type === 'error' ? 'WebSocket connection failed' : `WebSocket ${err.type}`;
    }
    
    // Handle Error objects
    if (err instanceof Error) {
      return err.message;
    }
    
    // Handle objects with message property
    if (typeof err === 'object' && err.message) {
      return err.message;
    }
    
    // Handle strings
    if (typeof err === 'string') {
      return err;
    }
    
    // Handle other objects by converting to string
    if (typeof err === 'object') {
      return err.toString();
    }
    
    return 'Unknown error';
  }, []);

  // Cleanup function to properly disconnect
  const cleanup = useCallback(async () => {
    try {
      if (apiRef.current) {
        await apiRef.current.disconnect();
        apiRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current = null;
      }
    } catch (err) {
      console.warn('Error during cleanup:', err);
    }
  }, []);

  const connect = useCallback(async (currentEndpoint) => {
    if (isConnecting) {
      console.log("Already connecting, skipping...");
      return;
    }

    console.log("Connecting to WebSocket:", currentEndpoint);

    setIsConnecting(true);
    setError(null);
    setConnected(false);

    // Cleanup existing connections
    await cleanup();

    const provider = new WsProvider(currentEndpoint, 1000, {}, 5000); // Add timeout and reconnect settings
    providerRef.current = provider;

    provider.on('error', (err) => {
      const errorMessage = extractErrorMessage(err);
      // console.error("WebSocket error:", err); // Suppressed normal WebSocket error logging
      setError(`Connection error: ${errorMessage}`);
      setConnected(false);
      setIsConnecting(false);
    });

    provider.on('disconnected', () => {
      console.warn(`WebSocket disconnected from ${currentEndpoint}`);
      setConnected(false);
      setIsConnecting(false);
      // Don't set error for disconnections - this is normal behavior
    });

    provider.on('connected', () => {
      console.log("WebSocket connected");
      setConnected(true);
      setIsConnecting(false);
    });

    try {
      const apiInstance = await ApiPromise.create({ 
        provider,
        throwOnConnect: true,
        noInitWarn: true
      });
      
      await apiInstance.isReady;

      const actualGenesisHash = apiInstance.genesisHash.toHex();
      if (actualGenesisHash !== config.genesisHash) {
        const msg = `Unexpected genesis hash: expected ${config.genesisHash}, got ${actualGenesisHash}`;
        console.error(msg);
        setError(msg);
        await cleanup();
        return;
      }

      apiRef.current = apiInstance;
      setApi(apiInstance);
      setConnected(true);
      setIsConnecting(false);
      console.log("Connected to WebSocket successfully");
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      // console.error("Failed to connect:", err); // Suppressed normal WebSocket connection error logging
      setError(`Connection failed: ${errorMessage}`);
      setIsConnecting(false);
      await cleanup();
    }
  }, [cleanup, extractErrorMessage, isConnecting]);

  useEffect(() => {
    let isMounted = true;

    const initiateConnection = async () => {
      if (isMounted) {
        await connect(endpoint);
      }
    };

    initiateConnection();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [connect, endpoint, cleanup]);

  const reconnect = useCallback((newEndpoint) => {
    console.log("Reconnecting with new endpoint:", newEndpoint);
    setEndpoint(newEndpoint);
    // Store in localStorage
    if (newEndpoint !== config.websocketEndpoint) {
      localStorage.setItem('customRpcEndpoint', newEndpoint);
    } else {
      localStorage.removeItem('customRpcEndpoint');
    }
  }, []);

  return { 
    api, 
    connected, 
    isConnecting,
    reconnect, 
    error,
    endpoint 
  };
};
