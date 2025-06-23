import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { u8aEq, u8aToHex } from '@polkadot/util';
import config from '../config';

// Cache with TTL to prevent memory leaks
const createCache = (ttlMs = 30000) => {
  const cache = new Map();
  
  return {
    get: (key) => {
      const item = cache.get(key);
      if (!item) return null;
      if (Date.now() - item.timestamp > ttlMs) {
        cache.delete(key);
        return null;
      }
      return item.data;
    },
    set: (key, data) => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear: () => cache.clear()
  };
};

const queuedKeysCache = createCache(30000); // 30 second TTL

const ValidatorKeysPopup = ({ api, stashAddress }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queuedKeyData, setQueuedKeyData] = useState(null);
  const [nextKeyData, setNextKeyData] = useState(null);
  const [activeGrandpa, setActiveGrandpa] = useState([]);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Memoized decoded stash address to prevent repeated decoding
  const decodedStashAddress = useMemo(() => {
    if (!stashAddress) return null;
    try {
      return decodeAddress(stashAddress);
    } catch (error) {
      console.error('Failed to decode stash address:', error);
      return null;
    }
  }, [stashAddress]);

  // Memoized stash public key hex
  const stashPubKeyHex = useMemo(() => {
    if (!decodedStashAddress) return null;
    return u8aToHex(decodedStashAddress);
  }, [decodedStashAddress]);

  // Memoized active grandpa set for efficient lookups
  const activeGrandpaSet = useMemo(() => {
    return new Set(activeGrandpa.map(a => a.pubKey));
  }, [activeGrandpa]);

  // Debounced toggle function to prevent rapid API calls
  const togglePopup = useCallback(async () => {
    if (showPopup) {
      setShowPopup(false);
      return;
    }

    if (!api || !stashAddress || !decodedStashAddress) {
      setError('API or stash address not available.');
      return;
    }

    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    setShowPopup(true);

    try {
      const cacheKey = `queuedKeys_${stashAddress}`;
      let cachedQueuedKeys = queuedKeysCache.get(cacheKey);

      // Fetch queued keys (with caching)
      if (!cachedQueuedKeys) {
        const rawQueued = await api.query.session.queuedKeys();
        cachedQueuedKeys = rawQueued.toJSON();
        queuedKeysCache.set(cacheKey, cachedQueuedKeys);
      }

      // Find queued keys for this stash
      const foundQueued = cachedQueuedKeys.find(([addr]) => {
        try {
          return u8aEq(decodeAddress(addr), decodedStashAddress);
        } catch {
          return false;
        }
      });
      
      setQueuedKeyData(foundQueued?.[1] ?? null);

      // Fetch next keys
      try {
        const next = await api.query.session.nextKeys(stashAddress);
        const nextData = next?.toJSON() ?? null;
        setNextKeyData(nextData);
      } catch (nextError) {
        console.error('Error fetching next keys:', nextError);
        setNextKeyData(null);
      }

      // Fetch active grandpa authorities using runtime API call
      try {
        const grandpaAuthorities = await api.call.grandpaApi.grandpaAuthorities();

        const list = grandpaAuthorities.map(([authorityId]) => {
          const pubKeyHex = u8aToHex(authorityId);
          const address = encodeAddress(authorityId, config.SS58_PREFIX);
          return { address, pubKey: pubKeyHex };
        });

        setActiveGrandpa(list);
      } catch (grandpaError) {
        console.error('Error fetching grandpa authorities:', grandpaError);
        setActiveGrandpa([]);
      }

      setLastFetchTime(Date.now());
    } catch (err) {
      console.error('Failed to fetch validator keys:', err);
      if (isMountedRef.current) {
        setError(`Failed to fetch validator keys: ${err.message || 'Unknown error'}`);
      }
    } finally {
      // Always reset loading state, regardless of component mount status
      isLoadingRef.current = false;
      // Use a timeout to ensure the state update happens even if component is unmounting
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, [api, stashAddress, decodedStashAddress, showPopup]);

  // Memoized render functions to prevent unnecessary re-renders
  const renderActive = useCallback(() => {
    if (!queuedKeyData?.grandpa && !nextKeyData?.grandpa) return null;

    const matchingGrandpaKeyQueued = queuedKeyData?.grandpa;
    const matchingGrandpaKeyNext = nextKeyData?.grandpa;

    // Find an active grandpa authority that matches either the queued or next grandpa key
    const matchingAuthority = activeGrandpa.find(({ pubKey }) => 
      pubKey === matchingGrandpaKeyQueued || pubKey === matchingGrandpaKeyNext
    );

    if (!matchingAuthority) return null;

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
  }, [queuedKeyData, nextKeyData, activeGrandpa]);

  const renderRow = useCallback((label, kd) => {
    if (!kd || !stashPubKeyHex) return null;

    // Check for mismatches using the memoized set for better performance
    const mismatchGrandpa = kd.grandpa && !activeGrandpaSet.has(kd.grandpa);
    const mismatchImonline = kd.imonline && kd.imonline !== stashPubKeyHex;

    // Determine colors based on mismatches
    const grandpaColor = mismatchGrandpa ? 'text-orange-400' : 'text-white';
    const imonlineColor = mismatchImonline ? 'text-red-500' : 'text-white';

    // Determine titles based on mismatches
    const grandpaTitle = mismatchGrandpa ? 'Is not an active GRANDPA voter' : 'OK';
    const imonlineTitle = mismatchImonline ? 'Incorrect ImOnline Key' : 'OK';

    return (
      <div className="mb-2">
        <strong>{label}:</strong><br/>
        grandpa: <span className={grandpaColor} title={grandpaTitle}>{kd.grandpa || 'N/A'}</span><br/>
        imonline: <span className={imonlineColor} title={imonlineTitle}>{kd.imonline || 'N/A'}</span>
      </div>
    );
  }, [stashPubKeyHex, activeGrandpaSet]);

  // Memoized button text
  const buttonText = useMemo(() => {
    if (loading) return '🔑 Loading...';
    return showPopup ? '🔑 Hide' : '🔑 Keys';
  }, [showPopup, loading]);

  // Memoized last updated text
  const lastUpdatedText = useMemo(() => {
    if (!lastFetchTime) return null;
    const now = Date.now();
    const diff = Math.floor((now - lastFetchTime) / 1000);
    if (diff < 60) return `Updated ${diff}s ago`;
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
    return `Updated ${Math.floor(diff / 3600)}h ago`;
  }, [lastFetchTime]);

  // Reset on stashAddress change
  useEffect(() => {
    setQueuedKeyData(null);
    setNextKeyData(null);
    setActiveGrandpa([]);
    setError(null);
    setLastFetchTime(0);
  }, [stashAddress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="mt-2">
      <button
        className="text-xs text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={togglePopup}
        disabled={loading}
        aria-label={showPopup ? 'Hide validator keys' : 'Show validator keys'}
        aria-expanded={showPopup}
        aria-busy={loading}
      >
        {buttonText}
      </button>

      {showPopup && (
        <div 
          className="mt-2 text-xs bg-gray-800 border border-[0.5px] text-white p-3 rounded shadow-md"
          role="region"
          aria-label="Validator keys information"
        >
          {loading && <div className="text-gray-400">Loading validator keys...</div>}
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {!loading && !error && (
            <>
              {renderActive()}
              {renderRow('↑ Queued Keys', queuedKeyData)}
              {renderRow('↑ Next Keys', nextKeyData)}
              {lastUpdatedText && (
                <div className="text-gray-400 text-xs mt-2">
                  {lastUpdatedText}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidatorKeysPopup;

