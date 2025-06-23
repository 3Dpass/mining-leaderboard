import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Dialog } from "@blueprintjs/core";
import config from '../../config';

const DialogGrandpaRoundState = ({ isOpen, onClose, api, connected }) => {
  const [roundState, setRoundState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchRoundState = useCallback(async () => {
    if (!api || !connected || !isMountedRef.current) return;
    
    try {
      setError(null);
      const state = await api.rpc.grandpa.roundState();
      
      if (!isMountedRef.current) return;
      
      // Convert the state to a plain object with proper error handling
      const plainState = {
        best: {
          round: state.best?.round?.toNumber() ?? 0,
          totalWeight: state.best?.totalWeight?.toNumber() ?? 0,
          thresholdWeight: state.best?.thresholdWeight?.toNumber() ?? 0,
          prevotes: {
            currentWeight: state.best?.prevotes?.currentWeight?.toNumber() ?? 0,
            missing: Array.from(state.best?.prevotes?.missing ?? []).map(addr => addr.toString())
          },
          precommits: {
            currentWeight: state.best?.precommits?.currentWeight?.toNumber() ?? 0,
            missing: Array.from(state.best?.precommits?.missing ?? []).map(addr => addr.toString())
          }
        }
      };
      
      setRoundState(plainState);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch Grandpa round state:', error);
      if (isMountedRef.current) {
        setError(error.message || 'Failed to fetch round state');
        setLoading(false);
      }
    }
  }, [api, connected]);

  // Setup interval for periodic updates
  const setupInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (isOpen && api && connected) {
      intervalRef.current = setInterval(fetchRoundState, config.DIALOG_GRANDPA_ROUNDSTATE_REFRESH_INTERVAL); // Refresh every 6 seconds
    }
  }, [isOpen, api, connected, fetchRoundState]);

  // Cleanup interval
  const cleanupInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!isOpen) {
      setLoading(true);
      setError(null);
      setRoundState(null);
      cleanupInterval();
      return;
    }

    if (!api || !connected) {
      setError('Not connected to network');
      setLoading(false);
      return;
    }

    fetchRoundState();
    setupInterval();

    return () => {
      isMountedRef.current = false;
      cleanupInterval();
    };
  }, [isOpen, api, connected, fetchRoundState, setupInterval, cleanupInterval]);

  // Memoize the threshold calculation to avoid recalculation on every render
  const thresholdInfo = useMemo(() => {
    if (!roundState) return null;
    
    const { totalWeight, thresholdWeight } = roundState.best;
    const prevotesReached = roundState.best.prevotes.currentWeight >= thresholdWeight;
    const precommitsReached = roundState.best.precommits.currentWeight >= thresholdWeight;
    
    return {
      totalWeight,
      thresholdWeight,
      prevotesReached,
      precommitsReached
    };
  }, [roundState]);

  // Memoize the missing addresses to avoid recreating arrays on every render
  const prevotesMissing = useMemo(() => 
    roundState?.best?.prevotes?.missing ?? [], 
    [roundState?.best?.prevotes?.missing]
  );
  
  const precommitsMissing = useMemo(() => 
    roundState?.best?.precommits?.missing ?? [], 
    [roundState?.best?.precommits?.missing]
  );

  // Memoize the dialog content to prevent unnecessary re-renders
  const dialogContent = useMemo(() => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-400">
          <div className="font-semibold mb-2">Error:</div>
          <div className="text-sm">{error}</div>
        </div>
      );
    }

    if (!roundState || !thresholdInfo) {
      return <div className="text-red-400">Failed to load round state</div>;
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Current Round</div>
            <div className="font-semibold text-white">#{roundState.best.round}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Threshold</div>
            <div className="font-semibold text-white">
              {thresholdInfo.totalWeight}/{thresholdInfo.thresholdWeight}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">Prevotes</div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-semibold text-white">
              <span className={
                thresholdInfo.prevotesReached
                  ? 'text-green-400 font-semibold'
                  : 'text-white font-semibold'
              }>
                {roundState.best.prevotes.currentWeight}/{thresholdInfo.totalWeight}
              </span>
            </div>
            {prevotesMissing.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">
                  Missing ({prevotesMissing.length}):
                </div>
                <div className="max-h-32 overflow-y-auto text-xs font-mono">
                  {prevotesMissing.map((address, index) => (
                    <div key={`prevote-${address}-${index}`} className="text-gray-400">{address}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">Precommits</div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-semibold text-white">
              <span className={
                thresholdInfo.precommitsReached
                  ? 'text-green-400 font-semibold'
                  : 'text-white font-semibold'
              }>
                {roundState.best.precommits.currentWeight}/{thresholdInfo.totalWeight}
              </span>
            </div>
            {precommitsMissing.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">
                  Missing ({precommitsMissing.length}):
                </div>
                <div className="max-h-32 overflow-y-auto text-xs font-mono">
                  {precommitsMissing.map((address, index) => (
                    <div key={`precommit-${address}-${index}`} className="text-gray-400">{address}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [loading, error, roundState, thresholdInfo, prevotesMissing, precommitsMissing]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="custom-rpc-dialog"
      style={{
        backgroundColor: "#1f2937",
        border: "2px solid #4B5563",
        borderRadius: "8px",
      }}
      canEscapeKeyClose
      canOutsideClickClose
      title="GRANDPA Round State"
    >
      <div className="bg-gray-800 text-gray-400 rounded p-4">
        {dialogContent}
      </div>
    </Dialog>
  );
};

export default DialogGrandpaRoundState; 