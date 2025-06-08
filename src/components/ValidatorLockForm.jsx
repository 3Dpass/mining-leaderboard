import React, { useState } from 'react';
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

  const handleLock = async () => {
    if (!account || !api || !injector || !until) return;
    try {
      setSubmitting(true);
      setError(null);

      const amount = new BN('400000000000000'); // 400,000 P3D
      const untilBlock = parseInt(until);
      const periodValue = period ? parseInt(period) : null;

      const tx = api.tx.validatorSet.lock(
        amount,
        untilBlock,
        periodValue !== null ? api.createType('Option<u32>', periodValue) : null
      );

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
      <h2 className="text-xl font-bold">🔒 Lock Funds for collateral</h2>

      <div>
        <label className="block mb-1">Select Account:</label>
        <select
          value={account || ''}
          onChange={(e) => connect(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded text-white"
        >
          <option value="">Select account</option>
          {accounts.map((acc) => {
            const formatted = encodeAddress(acc.address, SS58_PREFIX);
            return (
              <option key={acc.address} value={acc.address}>
                {acc.meta.name || 'Unknown'} ({formatted.slice(0, 6)}...{formatted.slice(-4)})
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block mb-1">Until (block height):</label>
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
      {error && <p className="text-red-400">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorLockForm;
