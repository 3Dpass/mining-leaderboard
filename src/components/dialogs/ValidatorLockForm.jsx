import React, { useState, useEffect } from 'react';
import { BN } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../../hooks/useWallet';
import config from '../../config';

const ValidatorLockForm = ({ api }) => {
  const { accounts, account, connect, injector, connected } = useWallet();

  const [until, setUntil] = useState('');
  const [period, setPeriod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({});

  // Fetch balances for selected accounts
  useEffect(() => {
    if (!api || !connected) return;

    const fetchBalances = async () => {
      if (!api || accounts.length === 0) return;

      const newBalances = {};

      for (const { address } of accounts) {
        try {
          const { data: { free } } = await api.query.system.account(address);
          const balance = Number(free.toBigInt()) / (10 ** config.FORMAT_BALANCE.decimals);
          newBalances[address] = `${balance.toLocaleString(undefined, { minimumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS, maximumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS })} ${config.FORMAT_BALANCE.unit}`;
        } catch (err) {
          newBalances[address] = 'Error';
        }
      }

      setBalances(newBalances);
    };

    fetchBalances();
  }, [api, accounts, connected]);

  // Fetch current block height and set the until state
  useEffect(() => {
    if (!api || !connected) return;

    const fetchCurrentBlockHeight = async () => {
      if (!api) return;

      try {
        const currentBlock = await api.derive.chain.bestNumber();
        const targetBlock = currentBlock.toNumber() + config.VALIDATOR_LOCK_TARGET_BLOCK_OFFSET; // Calculate target block height
        setUntil(targetBlock.toString()); // Set the until state
      } catch (err) {
        console.error('Error fetching current block height:', err);
        setError('Failed to fetch current block height.');
      }
    };

    fetchCurrentBlockHeight();
  }, [api, connected]);

  const handleLock = async () => {
    if (!account || !api || !injector || !until || !connected) return;

    try {
      setSubmitting(true);
      setError(null);

      const amount = new BN(config.VALIDATOR_LOCK_AMOUNT_PLANCK); // 400,000 P3D
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
            const formatted = encodeAddress(acc.address, config.SS58_PREFIX);
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
          {config.VALIDATOR_LOCK_PERIOD_OPTIONS.map(option => (
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
        disabled={submitting || !until || !account || !connected}
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

