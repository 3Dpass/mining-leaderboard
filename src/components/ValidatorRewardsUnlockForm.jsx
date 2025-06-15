import React, { useState, useEffect, useCallback } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../hooks/useWallet';

const SS58_PREFIX = 71;

const ValidatorRewardsUnlockForm = ({ api }) => {
  const { accounts, account, connect, injector } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(0);
  const [stillLocked, setStillLocked] = useState(0);
  const [vestingSchedule, setVestingSchedule] = useState([]);
  const [showVesting, setShowVesting] = useState(false);
  const [balances, setBalances] = useState({});

  useEffect(() => {
    const fetchBalances = async () => {
      if (!api || accounts.length === 0) return;
      const newBalances = {};
      for (const { address } of accounts) {
        try {
          const { data: { free } } = await api.query.system.account(address);
          const balance = free.toBn().divn(1e6).toNumber() / 1e6;
          newBalances[address] = `${balance.toFixed(3)} P3D`;
        } catch (err) {
          newBalances[address] = 'Error';
        }
      }
      setBalances(newBalances);
    };

    fetchBalances();
  }, [api, accounts]);

  useEffect(() => {
    const fetchRewardLocks = async () => {
      if (!account || !api) return;

      try {
        const rewardLocks = await api.query.rewards.rewardLocks(account);
        let totalAvailable = 0;
        let totalLocked = 0;

        const currentBlockHeight = (await api.rpc.chain.getHeader()).number.toNumber();

        rewardLocks.entries().forEach(([blockBN, amountBN]) => {
          const block = blockBN.toNumber();
          const amount = amountBN.toBn();
          const amountP3D = Number(amount.toString()) / 1e12;

          totalLocked += amountP3D;
          if (block <= currentBlockHeight) {
            totalAvailable += amountP3D;
          }
        });

        setAvailable(totalAvailable);
        setStillLocked(totalLocked - totalAvailable);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch reward locks. Please try again later.');
      }
    };

    fetchRewardLocks();
  }, [account, api]);

  const handleSubmit = useCallback(async () => {
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
      setError('Transaction failed. Please try again.');
      setSubmitting(false);
    }
  }, [account, api, injector]);

  const fetchVestingSchedule = useCallback(async () => {
    if (!account || !api) return;

    try {
      const rewardLocks = await api.query.rewards.rewardLocks(account);
      const schedule = [];

      rewardLocks.entries().forEach(([blockBN, amountBN]) => {
        const blockHeight = blockBN.toNumber();
        const amountRaw = amountBN.toBn().toString();
        const amountP3D = Number(amountRaw) / 1e12;

        schedule.push({
          blockHeight,
          amount: amountP3D,
          raw: amountRaw,
        });
      });

      setVestingSchedule(schedule);
      setShowVesting(true);
    } catch (err) {
      console.error('Error fetching vesting schedule:', err);
      setError('Failed to fetch vesting schedule. Please try again later.');
    }
  }, [account, api]);

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-xl font-bold">💰 Claim Vested Rewards</h2>
      <div className="text-left text-sm text-gray-500">
        <p>Funds become available gradually over 10 days (10% per day)</p>
      </div>

      <div>
        <label className="block mb-1">Select account:</label>
        <select
          onChange={e => connect(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white w-full"
          value={account || ''}
        >
          <option value="">Select account</option>
          {accounts.map(({ address, meta }) => {
            const formattedAddress = encodeAddress(address, SS58_PREFIX);
            const balance = balances[address] || '...';
            return (
              <option key={address} value={address}>
                {meta.name || 'Unknown'} ({formattedAddress.slice(0, 6)}...{formattedAddress.slice(-4)}) - {balance}
              </option>
            );
          })}
        </select>
      </div>

      <div className="text-white">
        <p>To unlock: <span className="text-green-500">{available.toFixed(12)}</span> P3D</p>
        <span className="text-sm text-gray-500">
          <p>Pending: {stillLocked.toFixed(12)} P3D</p>
        </span>
      </div>

      <div className="flex justify-between items-center">
        <button
          disabled={submitting || !account}
          onClick={handleSubmit}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
        >
          {submitting ? 'Submitting...' : 'Unlock'}
        </button>

        <button
          onClick={fetchVestingSchedule}
          className="text-indigo-400 hover:underline ml-4"
        >
          📅 Show Vesting Schedule
        </button>
      </div>

      {showVesting && vestingSchedule.length > 0 && (
       <div className="mt-4">
        <h3 className="text-md font-semibold text-gray-400">Vesting Schedule (#block height → to unlock):</h3>
       <div
         className="max-h-60 overflow-auto border border-gray-600 rounded p-2"
         style={{ maxHeight: '300px' }} // Set a fixed height
        >
         <ul style={{ listStyleType: 'none', paddingLeft: '0' }}
             className="list-disc pl-5 text-sm text-gray-300"
         >
           {vestingSchedule.map(({ blockHeight, amount }) => (
             <li key={blockHeight}>
                 #{blockHeight} → {amount.toFixed(12)} P3D
             </li>
            ))}
         </ul>
       </div>
    </div>
   )}

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorRewardsUnlockForm;
