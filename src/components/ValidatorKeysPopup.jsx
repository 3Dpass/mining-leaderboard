import React, { useState } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';

// Module-level cache so it persists across component instances
let cachedQueuedKeys = null;

const ValidatorKeysPopup = ({ stashAddress }) => {
  const { api } = usePolkadotApi();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queuedKeyData, setQueuedKeyData] = useState(null);
  const [nextKeyData, setNextKeyData] = useState(null);

  const togglePopup = async () => {
    if (showPopup) {
      setShowPopup(false);
      return;
    }

    if (!api || !stashAddress) return;

    setShowPopup(true);
    setLoading(true);

    try {
      // Load queued keys from cache or query
      if (!cachedQueuedKeys) {
        const rawQueued = await api.query.session.queuedKeys();
        cachedQueuedKeys = rawQueued.toJSON(); // Vec<[AccountId, Keys]>
      }

      // Find validator's keys from cached list
      const foundQueued = cachedQueuedKeys.find(([address]) => address === stashAddress);
      setQueuedKeyData(foundQueued?.[1] ?? null);

      // Fetch next session keys (always query since it's per-address)
      const nextKeys = await api.query.session.nextKeys(stashAddress);
      setNextKeyData(nextKeys?.toJSON() ?? null);
    } catch (err) {
      console.error('Failed to fetch validator keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderKeyRow = (label, keyData) => (
    <div className="mb-2">
      <strong>{label}:</strong><br />
      grandpa: {keyData?.grandpa || 'N/A'}<br />
      imonline: {keyData?.imonline || 'N/A'}
    </div>
  );

  return (
    <div className="mt-2">
      <button
        onClick={togglePopup}
        className="text-xs text-indigo-400 hover:underline"
      >
        {showPopup ? '🔑 Keys' : '🔑 Keys'}
      </button>

      {showPopup && (
        <div className="mt-2 text-xs bg-gray-800 text-white p-3 rounded shadow-md">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              {renderKeyRow('Queued Keys', queuedKeyData)}
              {renderKeyRow('Next Keys', nextKeyData)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidatorKeysPopup;
