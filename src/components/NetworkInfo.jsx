import React, { useEffect, useState, useCallback, useMemo } from 'react';

const NetworkInfo = ({ api, connected }) => {
  const [info, setInfo] = useState({
    networkName: '',
    specName: '',
    specVersion: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNetworkInfo = useCallback(async () => {
    if (!api || !connected) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [networkName, runtimeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.state.getRuntimeVersion(),
      ]);

      setInfo({
        networkName: networkName.toString(),
        specName: runtimeVersion.specName.toString(),
        specVersion: runtimeVersion.specVersion.toString(),
      });
    } catch (error) {
      console.error('Failed to fetch network info:', error);
      setError('Failed to load network info');
    } finally {
      setLoading(false);
    }
  }, [api, connected]);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  // Memoize the display content to prevent unnecessary re-renders
  const displayContent = useMemo(() => {
    if (loading) {
      return <p className="animate-pulse">Network info...</p>;
    }

    if (error) {
      return <p className="text-red-400 text-xs">Network error</p>;
    }

    return (
      <div className="hidden md:block rounded-lg w-fit bg-gray-900 text-xs text-gray-400">
        <p>{info.networkName}</p>
        <p>{info.specName}/{info.specVersion}</p>
      </div>
    );
  }, [loading, error, info.networkName, info.specName, info.specVersion]);

  return displayContent;
};

export default NetworkInfo;
