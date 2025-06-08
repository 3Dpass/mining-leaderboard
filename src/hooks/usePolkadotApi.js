import { useEffect, useRef, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';

export const usePolkadotApi = () => {
  const apiRef = useRef(null);
  const [api, setApi] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      if (!apiRef.current) {
        const provider = new WsProvider(config.websocketEndpoint);
        const apiInstance = await ApiPromise.create({ provider });
        await apiInstance.isReady;
        apiRef.current = apiInstance;
        setApi(apiInstance);
        setConnected(true);
      } else {
        setApi(apiRef.current);
        setConnected(true);
      }
    };

    connect();

    return () => {
      // Do not disconnect here to persist the instance across views
    };
  }, []);

  return { api, connected };
};
