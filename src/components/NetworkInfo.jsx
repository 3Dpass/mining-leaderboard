import React, { useEffect, useState } from 'react';

const NetworkInfo = ({ api, connected }) => {
  const [info, setInfo] = useState({
    networkName: '',
    specName: '',
    specVersion: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      if (!api || !connected) return;

      try {
        const [networkName, runtimeVersion] = await Promise.all([
          api.rpc.system.chain(),
          api.rpc.state.getRuntimeVersion(),
        ]);

        setInfo({
          networkName: networkName.toString(),
          specName: runtimeVersion.specName.toString(),
          specVersion: runtimeVersion.specVersion.toString(),
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch network info:', error);
        setLoading(false);
      }
    };

    fetchNetworkInfo();
  }, [api, connected]);

  if (loading) return <p>Network info...</p>;

  return (
    <div className="hidden md:block rounded-lg w-fit bg-gray-900 text-xs text-gray-400">
      <p>{info.networkName}</p>
      <p>{info.specName}/{info.specVersion}</p>
    </div>
  );
};

export default NetworkInfo;
