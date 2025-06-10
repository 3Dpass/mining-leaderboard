import React, { useState, useEffect } from 'react';
// import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aEq } from '@polkadot/util';

let cachedQueuedKeys = null;

const ValidatorKeysPopup = ({ api, stashAddress }) => {
///  const { api } = usePolkadotApi();
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
    if (!cachedQueuedKeys) {
      const rawQueued = await api.query.session.queuedKeys();
      cachedQueuedKeys = rawQueued.toJSON();
    }

    const stashDecoded = decodeAddress(stashAddress);

    const foundQueued = cachedQueuedKeys.find(([addr]) => {
      try {
        const decoded = decodeAddress(addr);
        return u8aEq(decoded, stashDecoded);
      } catch {
        return false;
      }
    });

    setQueuedKeyData(foundQueued?.[1] ?? null);

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

  // Reset key data when stashAddress changes
  useEffect(() => {
    if (stashAddress) {
      setQueuedKeyData(null);
      setNextKeyData(null);
    }
  }, [stashAddress]);

  return (
    <div className="mt-2">
      <button
  onClick={togglePopup}
  className="text-xs text-indigo-400 hover:underline"
  disabled={loading}
  aria-controls="validator-keys-popup"
>
  {showPopup ? '🔑 Keys' : '🔑 Keys'}
</button>


      {showPopup && (
        <div className="mt-2 text-xs bg-gray-800 border text-white p-3 rounded shadow-md">
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