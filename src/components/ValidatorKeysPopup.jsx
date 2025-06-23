import React, { useState, useEffect } from 'react';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { u8aEq, u8aToHex } from '@polkadot/util';
import config from '../config';

let cachedQueuedKeys = null;

const ValidatorKeysPopup = ({ api, stashAddress, connected }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queuedKeyData, setQueuedKeyData] = useState(null);
  const [nextKeyData, setNextKeyData] = useState(null);
  const [activeGrandpa, setActiveGrandpa] = useState([]);
  const [error, setError] = useState(null);

  const togglePopup = async () => {
    if (showPopup) {
      setShowPopup(false);
      return;
    }

    if (!api || !stashAddress || !connected) {
      setError('API or stash address not available.');
      return;
    }

    setLoading(true);
    setError(null);
    setShowPopup(true);

    try {
      // Fetch queued keys (cache)
      if (!cachedQueuedKeys) {
        const rawQueued = await api.query.session.queuedKeys();
        cachedQueuedKeys = rawQueued.toJSON();
      }

      const stashDecoded = decodeAddress(stashAddress);
      const foundQueued = cachedQueuedKeys.find(([addr]) => {
        try {
          return u8aEq(decodeAddress(addr), stashDecoded);
        } catch {
          return false;
        }
      });
      setQueuedKeyData(foundQueued?.[1] ?? null);

      // Fetch next keys
      const next = await api.query.session.nextKeys(stashAddress);
      setNextKeyData(next?.toJSON() ?? null);

      // Fetch active grandpa authorities using runtime API call
      const grandpaAuthorities = await api.call.grandpaApi.grandpaAuthorities();

      const networkPrefix = config.SS58_PREFIX;

      const list = grandpaAuthorities.map(([authorityId]) => {
        const pubKeyHex = u8aToHex(authorityId);
        const address = encodeAddress(authorityId, config.SS58_PREFIX);
        return { address, pubKey: pubKeyHex };
      });

      setActiveGrandpa(list);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch validator keys. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

const renderActive = () => {
  if (!queuedKeyData || !nextKeyData) return null;

  const matchingGrandpaKeyQueued = queuedKeyData.grandpa; // Get grandpa key from queued keys
  const matchingGrandpaKeyNext = nextKeyData.grandpa; // Get grandpa key from next keys

  // Find an active grandpa authority that matches either the queued or next grandpa key
  const matchingAuthority = activeGrandpa.find(({ pubKey }) => 
    pubKey === matchingGrandpaKeyQueued || pubKey === matchingGrandpaKeyNext
  );

  if (!matchingAuthority) return null; // No matching authority found

  return (
    <div className="mb-1">
       <span className="text-green-400">
        <strong>Active GRANDPA voter:</strong>
        </span><br />
      <div className="text-white">
        address: {matchingAuthority.address}<br />
        pub key: {matchingAuthority.pubKey}<br /><br />
      </div>
    </div>
  );
};


const renderRow = (label, kd) => {
  if (!kd) return null;

  // Decode the stash address to get the public key
  const stashDecoded = decodeAddress(stashAddress);
  const stashPubKeyHex = u8aToHex(stashDecoded); // Convert to hex for comparison

  // Check for mismatches
  const mismatchGrandpa = activeGrandpa.every(a => a.pubKey !== kd.grandpa);
  const mismatchImonline = kd.imonline !== stashPubKeyHex;

  // Determine colors based on mismatches
  const grandpaColor = mismatchGrandpa ? 'text-orange-400' : 'text-white';
  const imonlineColor = mismatchImonline ? 'text-red-500' : 'text-white';

  // Determine titles based on mismatches
  const grandpaTitile = mismatchGrandpa ? 'Is not an active GRANDPA voter' : 'OK';
  const imonlineTitle = mismatchImonline ? 'Incorect ImOnline Key' : 'OK';

  return (
    <div className="mb-2">
      <strong>{label}:</strong><br/>
      grandpa: <span className={grandpaColor} title={grandpaTitile}>{kd.grandpa || 'N/A'}</span><br/>
      imonline: <span className={imonlineColor} title={imonlineTitle}>{kd.imonline || 'N/A'}</span>
    </div>
  );
};

  // Reset on stashAddress change
  useEffect(() => {
    setQueuedKeyData(null);
    setNextKeyData(null);
    setActiveGrandpa([]);
    setError(null);
  }, [stashAddress]);

  return (
    <div className="mt-2">
      <button
        className="text-xs text-indigo-400 hover:underline"
        onClick={togglePopup}
        disabled={loading}
      >
        {showPopup ? '🔑 Hide' : '🔑 Keys'}
      </button>

      {showPopup && (
        <div className="mt-2 text-xs bg-gray-800 border border-[0.5px] text-white p-3 rounded shadow-md">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {!loading && !error && (
            <>
              {renderActive()}
              {renderRow('↑ Queued Keys', queuedKeyData)}
              {renderRow('↑ Next Keys', nextKeyData)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidatorKeysPopup;

