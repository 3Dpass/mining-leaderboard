import React, { useEffect, useState } from 'react';
import { Dialog, Classes } from "@blueprintjs/core";

const DialogGrandpaRoundState = ({ isOpen, onClose, api, connected }) => {
  const [roundState, setRoundState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !connected || !isOpen) return;

    const fetchRoundState = async () => {
      try {
        const state = await api.rpc.grandpa.roundState();
        // Convert the state to a plain object
        const plainState = {
          best: {
            round: state.best.round.toNumber(),
            totalWeight: state.best.totalWeight.toNumber(),
            thresholdWeight: state.best.thresholdWeight.toNumber(),
            prevotes: {
              currentWeight: state.best.prevotes.currentWeight.toNumber(),
              missing: Array.from(state.best.prevotes.missing).map(addr => addr.toString())
            },
            precommits: {
              currentWeight: state.best.precommits.currentWeight.toNumber(),
              missing: Array.from(state.best.precommits.missing).map(addr => addr.toString())
            }
          }
        };
        setRoundState(plainState);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch Grandpa round state:', error);
        setLoading(false);
      }
    };

    fetchRoundState();
    const interval = setInterval(fetchRoundState, 6000); // Refresh every 6 seconds

    return () => clearInterval(interval);
  }, [api, connected, isOpen]);

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
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        ) : roundState ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Current Round</div>
                <div className="font-semibold text-white">#{roundState.best.round}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Threshold</div>
                <div className="font-semibold text-white">
                  {roundState.best.totalWeight}/{roundState.best.thresholdWeight}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Prevotes</div>
              <div className="bg-gray-900 p-3 rounded">
                <div className="font-semibold text-white">
                  <span className={
                    roundState.best.prevotes.currentWeight >= roundState.best.thresholdWeight
                      ? 'text-green-400 font-semibold'
                      : 'text-white font-semibold'
                  }>
                    {roundState.best.prevotes.currentWeight}/{roundState.best.totalWeight}
                  </span>
                </div>
                {roundState.best.prevotes.missing.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">
                      Missing ({roundState.best.prevotes.missing.length}):
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs font-mono">
                      {roundState.best.prevotes.missing.map((address, index) => (
                        <div key={index} className="text-gray-400">{address}</div>
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
                    roundState.best.precommits.currentWeight >= roundState.best.thresholdWeight
                      ? 'text-green-400 font-semibold'
                      : 'text-white font-semibold'
                  }>
                    {roundState.best.precommits.currentWeight}/{roundState.best.totalWeight}
                  </span>
                </div>
                {roundState.best.precommits.missing.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">
                      Missing ({roundState.best.precommits.missing.length}):
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs font-mono">
                      {roundState.best.precommits.missing.map((address, index) => (
                        <div key={index} className="text-gray-400">{address}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Failed to load round state</div>
        )}
      </div>
    </Dialog>
  );
};

export default DialogGrandpaRoundState; 