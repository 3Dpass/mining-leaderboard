import React, { useEffect, useState, useCallback } from 'react';
import TimeAgo from 'react-timeago';
import config from '../config';

function formatMP3D(value) {
  const number = typeof value === 'bigint' ? Number(value) : parseFloat(value);
  // First convert to P3D (divide by 10^12), then to millions (divide by 10^6)
  const inMillions = (number / 10 ** config.BALANCE_FORMAT.DEFAULT_DECIMALS) / 1e6;
  return inMillions.toFixed(config.BALANCE_FORMAT.MP3D_DECIMALS) + ' M' + config.FORMAT_BALANCE.unit;
}

const NetworkState = ({ api }) => {
  const [networkState, setNetworkState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full network state (excluding finalized block)
  const loadNetworkState = useCallback(async () => {
    if (!api) return;

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

    setNetworkState(prev => ({
      ...prev,
      totalIssuance: BigInt(totalIssuance.toString()),
      bestNumber: bestNumber.toBigInt(),
      timestamp: Number(timestamp.toString()),
      targetBlockTime: Number(targetBlockTime.toString()) / 1000, // ms to sec
    }));

    setIsLoading(false);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    let unsubNewHeads;
    let unsubFinalizedHeads;

    // Subscribe to new best blocks
    api.rpc.chain.subscribeNewHeads(async () => {
      await loadNetworkState();
    }).then(unsub => {
      unsubNewHeads = unsub;
    });

    // Subscribe to finalized blocks separately
    api.rpc.chain.subscribeFinalizedHeads((header) => {
      const finalizedNumber = header.number.toBigInt();

      setNetworkState(prev => ({
        ...prev,
        bestFinalized: finalizedNumber
      }));
    }).then(unsub => {
      unsubFinalizedHeads = unsub;
    });

    return () => {
      unsubNewHeads?.();
      unsubFinalizedHeads?.();
    };
  }, [api, loadNetworkState]);

  if (!networkState) {
    return <div className="mb-1 w-full max-w-4xl h-[80px] animate-pulse bg-gray-800 border border-[0.5px] rounded" />;
  }

  const { bestNumber, bestFinalized, timestamp, targetBlockTime, totalIssuance } = networkState;

  return (
    <div className={`border border-[0.5px] grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-4 bg-gray-900 text-gray-300 p-4 rounded-md shadow mb-1 ${isLoading ? 'opacity-50' : ''}`}>
      <div>
        <div className="text-xs text-gray-500">Best Block</div>
        <div className="font-semibold">{bestNumber?.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Finalized</div>
        <div className="font-semibold">{bestFinalized?.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Latest Block</div>
        <div className="font-semibold"><TimeAgo date={timestamp} live={true} /></div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Target Time</div>
        <div className="font-semibold">{targetBlockTime}s</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Total Issuance</div>
        <div className="font-semibold">{formatMP3D(totalIssuance)}</div>
      </div>
    </div>
  );
};

export default NetworkState;
