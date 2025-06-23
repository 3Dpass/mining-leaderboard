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
  const connectIdRef = useRef(0);

  const connect = useCallback(async (currentEndpoint) => {
    console.log('[usePolkadotApi] connect() called with endpoint:', currentEndpoint);
    console.log('[usePolkadotApi] Current connecting state:', connecting);
    // Prevent multiple simultaneous connections
    if (connecting) return;
    setConnecting(true);
    setError(null);
    setConnected(false);

    // Increment connection id to track latest connection
    const thisConnectId = ++connectIdRef.current;
    console.log('[usePolkadotApi] New connection attempt. connectId:', thisConnectId);

    // Clean up previous API instance if any
    if (apiRef.current) {
      try {
        await apiRef.current.disconnect();
        console.log('[usePolkadotApi] Disconnected previous API instance.');
      } catch (e) {
        // ignore
      }
      apiRef.current = null;
      setApi(null);
    }

    const provider = new WsProvider(currentEndpoint);

    // Event listeners
    const handleError = (err) => {
      console.log('[usePolkadotApi] WebSocket error event:', err);
      if (connectIdRef.current !== thisConnectId) return;
      console.error("WebSocket error:", err ?? "Unknown error");
      setError(`Error: ${err.message}`);
      setConnected(false);
    };
    const handleDisconnected = () => {
      console.log('[usePolkadotApi] WebSocket disconnected event for endpoint:', currentEndpoint);
      if (connectIdRef.current !== thisConnectId) return;
      console.warn(`WebSocket disconnected from ${currentEndpoint}`);
      setConnected(false);
      setError(`Disconnected from ${currentEndpoint}`);
    };
    provider.on('error', handleError);
    provider.on('disconnected', handleDisconnected);

    try {
      const apiInstance = await ApiPromise.create({ provider });
      await apiInstance.isReady;
      console.log('[usePolkadotApi] ApiPromise is ready for endpoint:', currentEndpoint);

      // Only proceed if this is the latest connection attempt
      if (connectIdRef.current !== thisConnectId) {
        console.log('[usePolkadotApi] Stale connection attempt, disconnecting. connectId:', thisConnectId);
        await apiInstance.disconnect();
        setConnecting(false);
        return;
      }

      const actualGenesisHash = apiInstance.genesisHash.toHex();
      if (actualGenesisHash !== config.genesisHash) {
        const msg = `Unexpected genesis hash: expected ${config.genesisHash}, got ${actualGenesisHash}`;
        console.error(msg);
        setError(msg);
        await apiInstance.disconnect();
        setConnecting(false);
        return;
      }

      apiRef.current = apiInstance;
      setApi(apiInstance);
      setConnected(true);
      setError(null);
      setConnecting(false);
      console.log("Connected to WebSocket");
      console.log('[usePolkadotApi] Connection established. connectId:', thisConnectId, 'endpoint:', currentEndpoint);
    } catch (err) {
      if (connectIdRef.current === thisConnectId) {
        setError(`Connection failed: ${err.message}`);
        setConnected(false);
        setConnecting(false);
        console.log('[usePolkadotApi] Connection failed:', err.message, 'connectId:', thisConnectId);
      }
    }
  }, []);

  useEffect(() => {
    console.log('[usePolkadotApi] useEffect triggered. endpoint:', endpoint);
    let isMounted = true;
    const initiateConnection = async () => {
      if (isMounted) {
        console.log('[usePolkadotApi] Initiating connection to endpoint:', endpoint);
        await connect(endpoint);
      }
    };
    initiateConnection();
    return () => {
      isMounted = false;
      connectIdRef.current++;
      if (apiRef.current) {
        console.log("Cleanup: Disconnecting WebSocket...");
        apiRef.current.disconnect();
        apiRef.current = null;
      }
      console.log('[usePolkadotApi] Cleanup complete.');
    };
  }, [endpoint]);

  const reconnect = (newEndpoint) => {
    console.log('[usePolkadotApi] reconnect() called with newEndpoint:', newEndpoint);
    setEndpoint(newEndpoint);
  };

  return { api, connected, connecting, reconnect, error };
};
