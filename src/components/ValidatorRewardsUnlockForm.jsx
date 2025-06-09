import React, { useState, useEffect, useCallback } from 'react';
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
  const [vestingSchedule, setVestingSchedule] = useState([]);
  const [showVesting, setShowVesting] = useState(false);
  const [balances, setBalances] = useState({}); // State for balances

  // Fetch balances for selected accounts
  useEffect(() => {
    const fetchBalances = async () => {
      if (!api || accounts.length === 0) return;

      const newBalances = {};

      for (const { address } of accounts) {
        try {
          const { data: { free } } = await api.query.system.account(address);
          const balance = free.toBn().divn(1e6).toNumber() / 1e6; // Shows in P3D with 6 decimals
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

        const currentBlockHeight = (await api.rpc.chain.getBlock()).block.header.number.toNumber();

        rewardLocks.forEach((amount, blockHeight) => {
          const amountInP3D = amount.toBn().toNumber() / 1e12;
          totalLocked += amountInP3D;

          if (blockHeight <= currentBlockHeight) {
            totalAvailable += amountInP3D;
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

      rewardLocks.forEach((amount, blockHeight) => {
        const amountInP3D = amount.toBn().toNumber() / 1e12;
        schedule.push({
          blockHeight,
          amount: amountInP3D,
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
        <p>Funds are getting available by 10% over ~ 10 days</p>
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
            const balance = balances[address] || '...'; // Display balance or loading state
            return (
              <option key={address} value={address}>
                {meta.name || 'Unknown'} ({formattedAddress.slice(0, 6)}...{formattedAddress.slice(-4)}) - {balance}
              </option>
            );
          })}
        </select>
      </div>

      <div className="text-white">
        <p>Available: <span className="text-left text-green-500">{available.toFixed(2)}</span> P3D</p>
        <span className="text-left text-sm text-gray-500">
          <p>Still Locked: {stillLocked.toFixed(2)} P3D</p>
        </span>
      </div>

      <div className="flex justify-between items-center">
        <button
          disabled={submitting || !account}
          onClick={handleSubmit}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
        >
          {submitting ? 'Submitting...' : 'Unlock Available'}
        </button>

        {stillLocked > 0 && (
          <button
            onClick={fetchVestingSchedule}
            className="text-blue-400 hover:underline ml-4"
          >
            Show Vesting Schedule
          </button>
        )}
      </div>

      {showVesting && vestingSchedule.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Vesting Schedule</h3>
          <ul className="list-disc pl-5">
            {vestingSchedule.map(({ blockHeight, amount }) => (
              <li key={blockHeight}>
                Block Height: {blockHeight}, Amount: {amount.toFixed(2)} P3D
              </li>
            ))}
          </ul>
        </div>
      )}

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorRewardsUnlockForm;

