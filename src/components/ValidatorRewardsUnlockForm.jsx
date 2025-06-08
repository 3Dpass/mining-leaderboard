import React, { useState, useEffect } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../hooks/useWallet';
import { usePolkadotApi } from '../hooks/usePolkadotApi';

const SS58_PREFIX = 71;

const ValidatorRewardsUnlockForm = () => {
  const { api } = usePolkadotApi();
  const { accounts, account, connect, injector } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(0);
  const [stillLocked, setStillLocked] = useState(0);

  useEffect(() => {
    const fetchRewardLocks = async () => {
      if (!account || !api) return;

      try {
        const rewardLocks = await api.query.rewards.rewardLocks(account);
        let totalAvailable = 0;
        let totalLocked = 0;

        // Get the current block height
        const currentBlockHeight = (await api.rpc.chain.getBlock()).block.header.number.toNumber();

        // Calculate available and still locked funds
        rewardLocks.forEach((amount, blockHeight) => {
          const amountInP3D = amount.toBn().toNumber() / 1e12; // Convert from 12 decimals
          totalLocked += amountInP3D;

          // If the block height is less than or equal to the current block, it's available
          if (blockHeight <= currentBlockHeight) {
            totalAvailable += amountInP3D;
          }
        });

        setAvailable(totalAvailable);
        setStillLocked(totalLocked - totalAvailable);
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };

    fetchRewardLocks();
  }, [account, api]);

  const handleSubmit = async () => {
    if (!account || !api || !injector) return;

    try {
      setSubmitting(true);
      setError(null);
      setTxHash(null);

      const tx = api.tx.rewards.unlock();

      const unsub = await tx.signAndSend(account, { signer: injector }, ({ status, txHash }) => {
        if (status.isInBlock) {
          setTxHash(txHash.toString());
          setSubmitting(false);
          unsub();
        }
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-xl font-bold">💰 Claim Vested Rewards</h2>

      <div>
        <label className="block mb-1">Select account:</label>
        <select
          onChange={e => connect(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white w-full"
        >
          <option value="">Select account</option>
          {accounts.map(({ address, meta }) => (
            <option key={address} value={address}>
              {meta.name || 'Unknown'} ({encodeAddress(address, SS58_PREFIX).slice(0, 5)}…)
            </option>
          ))}
        </select>
      </div>

      <div className="text-white">
       
        <p>Available: {" "}
           <span className="text-left text-green-500">{available.toFixed(2)}</span>  P3D</p>
         <span className="text-left text-sm text-gray-500">
           <p>Still Locked: {stillLocked.toFixed(2)} P3D</p>
         </span>
       
      </div>

      <button
        disabled={submitting || !account}
        onClick={handleSubmit}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Unlock Rewards'}
      </button>

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorRewardsUnlockForm;
