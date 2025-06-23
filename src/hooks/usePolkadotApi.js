import { useEffect, useRef, useState, useCallback } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';

export const usePolkadotApi = () => {
  const apiRef = useRef(null);
  const [api, setApi] = useState(null);
  const [connected, setConnected] = useState(false);
  //const [endpoint, setEndpoint] = useState(config.websocketEndpoint);
  
  const [endpoint, setEndpoint] = useState(() => {
  // Check if a custom endpoint exists in localStorage
  const saved = localStorage.getItem('customRpcEndpoint');
  return saved || config.websocketEndpoint;
 });

  const [error, setError] = useState(null);

  const connect = useCallback(async (currentEndpoint) => {
    console.log("Connecting to WebSocket:", currentEndpoint);

    setError(null);
    setConnected(false);

    const provider = new WsProvider(currentEndpoint);

    provider.on('error', (err) => {
      console.error("WebSocket error:", error ?? "Unknown error");
      setError(`Error: ${err.message}`);
      setConnected(false);
    });

    provider.on('disconnected', () => {
      console.warn(`WebSocket disconnected from ${currentEndpoint}`);
      setConnected(false);
      setError(`Disconnected from ${currentEndpoint}`);
    });

    try {
      const apiInstance = await ApiPromise.create({ provider });
      await apiInstance.isReady;

      const actualGenesisHash = apiInstance.genesisHash.toHex();
      if (actualGenesisHash !== config.genesisHash) {
        const msg = `Unexpected genesis hash: expected ${config.genesisHash}, got ${actualGenesisHash}`;
        console.error(msg);
        setError(msg);
        await apiInstance.disconnect();
        return;
      }

      apiRef.current = apiInstance;
      setApi(apiInstance);
      setConnected(true);
      console.log("Connected to WebSocket");
    } catch (err) {
      console.error("Failed to connect:", err.message);
      setError(`Connection failed: ${err.message}`);
    }
  }, []);

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
      if (apiRef.current) {
        console.log("Cleanup: Disconnecting WebSocket...");
        apiRef.current.disconnect();
      }
    };
  }, [connect]);

  const reconnect = (newEndpoint) => {
    console.log("Reconnecting with new endpoint:", newEndpoint);
    setEndpoint(newEndpoint);
  };

  return { api, connected, reconnect, error };
};
