import { useEffect, useRef, useState, useCallback } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';

export const usePolkadotApi = () => {
  const apiRef = useRef(null);
  const [api, setApi] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [endpoint, setEndpoint] = useState(() => {
    // Check if a custom endpoint exists in localStorage
    const saved = localStorage.getItem('customRpcEndpoint');
    return saved || config.websocketEndpoint;
  });
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const connectIdRef = useRef(0);

  // Exponential backoff settings
  const INITIAL_DELAY = 3000; // 3 seconds
  const MAX_DELAY = 60000; // 60 seconds
  const MAX_ATTEMPTS = 10;

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const scheduleReconnect = useCallback((currentEndpoint, attempt) => {
    if (attempt >= MAX_ATTEMPTS) {
      setReconnecting(false);
      setError(`Failed to reconnect after ${MAX_ATTEMPTS} attempts.`);
      return;
    }
    setReconnecting(true);
    const delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt), MAX_DELAY);
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(attempt + 1);
      connect(currentEndpoint, attempt + 1);
    }, delay);
  }, []);

  const connect = useCallback(async (currentEndpoint, attempt = 0) => {
    clearReconnectTimeout();
    setConnecting(true);
    setError(null);
    setConnected(false);
    // Increment connection id to track latest connection
    const thisConnectId = ++connectIdRef.current;
    // Clean up previous API instance if any
    if (apiRef.current) {
      try {
        await apiRef.current.disconnect();
      } catch (e) {}
      apiRef.current = null;
      setApi(null);
    }
    const provider = new WsProvider(currentEndpoint);
    // Event listeners
    const handleError = (err) => {
      if (connectIdRef.current !== thisConnectId) return;
      setError(`Error: ${err.message}`);
      setConnected(false);
      setConnecting(false);
      scheduleReconnect(currentEndpoint, attempt);
    };
    const handleDisconnected = () => {
      if (connectIdRef.current !== thisConnectId) return;
      setConnected(false);
      setError(`Disconnected from ${currentEndpoint}`);
      setConnecting(false);
      scheduleReconnect(currentEndpoint, attempt);
    };
    provider.on('error', handleError);
    provider.on('disconnected', handleDisconnected);
    try {
      const apiInstance = await ApiPromise.create({ provider });
      await apiInstance.isReady;
      if (connectIdRef.current !== thisConnectId) {
        await apiInstance.disconnect();
        setConnecting(false);
        return;
      }
      const actualGenesisHash = apiInstance.genesisHash.toHex();
      if (actualGenesisHash !== config.genesisHash) {
        setError(`Unexpected genesis hash: expected ${config.genesisHash}, got ${actualGenesisHash}`);
        await apiInstance.disconnect();
        setConnecting(false);
        scheduleReconnect(currentEndpoint, attempt);
        return;
      }
      apiRef.current = apiInstance;
      setApi(apiInstance);
      setConnected(true);
      setError(null);
      setConnecting(false);
      setReconnecting(false);
      setReconnectAttempts(0);
    } catch (err) {
      if (connectIdRef.current === thisConnectId) {
        setError(`Connection failed: ${err.message}`);
        setConnected(false);
        setConnecting(false);
        scheduleReconnect(currentEndpoint, attempt);
      }
    }
  }, [scheduleReconnect]);

  useEffect(() => {
    let isMounted = true;
    const initiateConnection = async () => {
      if (isMounted) {
        connect(endpoint, 0);
      }
    };
    initiateConnection();
    return () => {
      isMounted = false;
      connectIdRef.current++;
      clearReconnectTimeout();
      if (apiRef.current) {
        apiRef.current.disconnect();
        apiRef.current = null;
      }
    };
  }, [endpoint, connect]);

  const reconnect = (newEndpoint) => {
    setEndpoint(newEndpoint);
    setReconnectAttempts(0);
    setReconnecting(false);
    clearReconnectTimeout();
  };

  return { api, connected, connecting, reconnect, error, reconnecting, reconnectAttempts };
};
