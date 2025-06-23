import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import TimeAgo from 'react-timeago';
import config from '../config';

function formatMP3D(value) {
  const number = typeof value === 'bigint' ? Number(value) : parseFloat(value);
  // First convert to P3D (divide by 10^12), then to millions (divide by 10^6)
  const inMillions = (number / 10 ** config.BALANCE_FORMAT.DEFAULT_DECIMALS) / 1e6;
  return inMillions.toFixed(config.BALANCE_FORMAT.MP3D_DECIMALS) + ' M' + config.FORMAT_BALANCE.unit;
}

const NetworkState = ({ api, connected }) => {
  const [networkState, setNetworkState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for subscription cleanup
  const unsubNewHeadsRef = useRef(null);
  const unsubFinalizedHeadsRef = useRef(null);
  const isMountedRef = useRef(true);

  // Fetch full network state (excluding finalized block)
  const loadNetworkState = useCallback(async () => {
    if (!api || !connected) return;

    try {
      setError(null);
      setIsLoading(true);

      const [
        totalIssuance,
        timestamp,
        bestNumber,
        targetBlockTime
      ] = await Promise.all([
        api.query.balances.totalIssuance(),
        api.query.timestamp.now(),
        api.derive.chain.bestNumber(),
        api.consts.difficulty.targetBlockTime
      ]);

      if (!isMountedRef.current) return;

      setNetworkState(prev => ({
        ...prev,
        totalIssuance: BigInt(totalIssuance.toString()),
        bestNumber: bestNumber.toBigInt(),
        timestamp: Number(timestamp.toString()),
        targetBlockTime: Number(targetBlockTime.toString()) / 1000, // ms to sec
      }));
    } catch (err) {
      console.error('Failed to load network state:', err);
      if (isMountedRef.current) {
        setError('Failed to load network state');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [api, connected]);

  // Setup subscriptions
  const setupSubscriptions = useCallback(async () => {
    if (!api || !connected) return;

    try {
      // Subscribe to new best blocks
      const unsubNewHeads = await api.rpc.chain.subscribeNewHeads(async () => {
        if (isMountedRef.current) {
          await loadNetworkState();
        }
      });
      unsubNewHeadsRef.current = unsubNewHeads;

      // Subscribe to finalized blocks separately
      const unsubFinalizedHeads = await api.rpc.chain.subscribeFinalizedHeads((header) => {
        if (!isMountedRef.current) return;
        
        const finalizedNumber = header.number.toBigInt();
        setNetworkState(prev => ({
          ...prev,
          bestFinalized: finalizedNumber
        }));
      });
      unsubFinalizedHeadsRef.current = unsubFinalizedHeads;
    } catch (err) {
      console.error('Failed to setup subscriptions:', err);
      setError('Failed to setup network subscriptions');
    }
  }, [api, connected, loadNetworkState]);

  // Cleanup subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (unsubNewHeadsRef.current) {
      unsubNewHeadsRef.current();
      unsubNewHeadsRef.current = null;
    }
    if (unsubFinalizedHeadsRef.current) {
      unsubFinalizedHeadsRef.current();
      unsubFinalizedHeadsRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (api && connected) {
      loadNetworkState();
      setupSubscriptions();
    }

    return () => {
      isMountedRef.current = false;
      cleanupSubscriptions();
    };
  }, [api, connected, loadNetworkState, setupSubscriptions, cleanupSubscriptions]);

  // Memoize the formatted values to prevent unnecessary recalculations
  const formattedValues = useMemo(() => {
    if (!networkState) return null;

    const { bestNumber, bestFinalized, timestamp, targetBlockTime, totalIssuance } = networkState;
    
    return {
      bestNumber: bestNumber?.toLocaleString() || '0',
      bestFinalized: bestFinalized?.toLocaleString() || '0',
      targetBlockTime: `${targetBlockTime || 0}s`,
      totalIssuance: formatMP3D(totalIssuance || 0),
      timestamp: timestamp || Date.now()
    };
  }, [networkState]);

  // Memoize the loading state display
  const loadingDisplay = useMemo(() => (
    <div className="mb-1 w-full max-w-4xl h-[80px] animate-pulse bg-gray-800 border border-[0.5px] rounded" />
  ), []);

  if (!networkState || !formattedValues) {
    return loadingDisplay;
  }

  return (
    <div className={`border border-[0.5px] grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-4 bg-gray-900 text-gray-300 p-4 rounded-md shadow mb-1 ${isLoading ? 'opacity-50' : ''}`}>
      <div>
        <div className="text-xs text-gray-500">Best Block</div>
        <div className="font-semibold">{formattedValues.bestNumber}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Finalized</div>
        <div className="font-semibold">{formattedValues.bestFinalized}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Latest Block</div>
        <div className="font-semibold">
          <TimeAgo date={formattedValues.timestamp} live={true} />
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Target Time</div>
        <div className="font-semibold">{formattedValues.targetBlockTime}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Total Issuance</div>
        <div className="font-semibold">{formattedValues.totalIssuance}</div>
      </div>
      {error && (
        <div className="col-span-full text-red-400 text-xs mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default NetworkState;
