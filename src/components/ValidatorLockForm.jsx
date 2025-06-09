import React, { useState, useEffect } from 'react';
import { BN } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { useWallet } from '../hooks/useWallet';

const SS58_PREFIX = 71;

const ValidatorLockForm = () => {
  const { api } = usePolkadotApi();
  const { accounts, account, connect, injector } = useWallet();

  const [until, setUntil] = useState('');
  const [period, setPeriod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({});

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

  // Fetch current block height and set the until state
  useEffect(() => {
    const fetchCurrentBlockHeight = async () => {
      if (!api) return;

      try {
        const currentBlock = await api.derive.chain.bestNumber();
        const targetBlock = currentBlock.toNumber() + 50000; // Calculate target block height
        setUntil(targetBlock.toString()); // Set the until state
      } catch (err) {
        console.error('Error fetching current block height:', err);
        setError('Failed to fetch current block height.');
      }
    };

    fetchCurrentBlockHeight();
  }, [api]);

  const handleLock = async () => {
    if (!account || !api || !injector || !until) return;

    try {
      setSubmitting(true);
      setError(null);

      const amount = new BN('400000000000000000'); // 400,000 P3D
      const untilBlock = parseInt(until);
      const periodValue = period ? parseInt(period) : null;

      const tx = api.tx.validatorSet.lock(
        amount,
        untilBlock,
        periodValue !== null ? api.createType('Option<u32>', periodValue) : null
      );

      const unsub = await tx.signAndSend(account, { signer: injector }, ({ status, txHash, dispatchError }) => {
        if (status.isInBlock) {
          setTxHash(txHash.toString());
          setSubmitting(false);
          unsub();
        }

        // Check for errors
        if (dispatchError) {
          let errorMessage;

          if (dispatchError.isModule) {
            const { section, name, docs } = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${section}.${name}: ${docs.join(' ')}`;
          } else {
            errorMessage = dispatchError.toString();
          }

          setError(`Transaction failed: ${errorMessage}`);
          setSubmitting(false);
          unsub();
        }
      });
    } catch (err) {
      console.error(err);
      setError('Transaction submission failed. Please try again later.');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-xl font-bold">🔒 Lock Funds for Collateral</h2>

      <div>
        <label className="block mb-1">Select Account:</label>
        <select
          value={account || ''}
          onChange={(e) => connect(e.target.value)}
          className="w-full bg-gray-800 p-2 rounded text-white"
        >
          <option value="">Select account</option>
          {accounts.map((acc) => {
            const formatted = encodeAddress(acc.address, SS58_PREFIX);
            const balance = balances[acc.address] || '...'; // Display balance or loading state
            return (
              <option key={acc.address} value={acc.address}>
                {acc.meta.name || 'Unknown'} ({formatted.slice(0, 6)}...{formatted.slice(-4)}) - {balance}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block mb-1">Until Block #: {" "}
          <span className="text-center text-gray-500">
            (+ 50,000 blocks ahead)
            </span>
          </label>
        <input
          type="number"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded text-white"
        />
      </div>

      <div>
        <label className="block mb-1">Re-lock Period (Optional):</label>
        <div className="flex space-x-4">
          {[null, 50000, 100000].map(option => (
            <label key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                name="period"
                checked={period === option}
                onChange={() => setPeriod(option)}
              />
              <span>{option ? `${option} blocks` : 'No auto re-lock'}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        disabled={submitting || !until || !account}
        onClick={handleLock}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Lock 400,000 P3D'}
      </button>

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorLockForm;

