import React, { useState, useEffect } from 'react';
import { BN } from '@polkadot/util';
import { formatBalance } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../../hooks/useWallet';
import config from '../../config';

// Helper to safely convert decimal strings to BN
const toBnP3D = (val) => {
  const parts = val.split('.');
  const whole = parts[0] || '0';
  const decimal = parts[1] || '';
  const padded = decimal.padEnd(config.FORMAT_BALANCE.decimals, '0').slice(0, config.FORMAT_BALANCE.decimals);
  return new BN(whole + padded);
};

const ValidatorUnlockForm = ({ api }) => {
  const { accounts, account, connect, injector } = useWallet();
  const [amount, setAmount] = useState('');
  const [tip, setTip] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({});

  // Fetch balances for all accounts
  useEffect(() => {
    const fetchBalances = async () => {
      if (!api || accounts.length === 0) return;

      const newBalances = {};

      for (const { address } of accounts) {
        try {
          const { data: { free } } = await api.query.system.account(address);
          newBalances[address] = formatBalance(free, { withSi: true, forceUnit: '-' });
        } catch (err) {
          console.error('Error fetching balance for address:', address, err);
          newBalances[address] = 'Error';
        }
      }

      setBalances(newBalances);
    };

    fetchBalances();
  }, [api, accounts]);

  const handleUnlock = async () => {
    if (!api || !account || !injector) return;

    try {
      setSubmitting(true);
      setError(null);
      setTxHash(null);

      const parsedAmount = amount ? toBnP3D(amount) : null;
      const parsedTip = tip ? toBnP3D(tip) : null;

      if (parsedAmount && parsedAmount.lte(new BN(0))) {
        throw new Error("Amount must be greater than zero.");
      }

      const optionAmount = parsedAmount !== null
        ? api.createType('Option<BalanceOf>', parsedAmount)
        : api.createType('Option<BalanceOf>', null);

      const tx = api.tx.validatorSet.unlock(optionAmount);

      const options = { signer: injector };
      if (parsedTip) {
        options.tip = parsedTip;
      }

      const unsub = await tx.signAndSend(account, options, ({ status, events, txHash }) => {
        if (status.isInBlock) {
          setTxHash(txHash.toString());
          setSubmitting(false);
          unsub();
        }

        if (events) {
          for (const { event } of events) {
            if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
              setError('Transaction failed.');
              setSubmitting(false);
              unsub();
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-xl font-bold">🔓 Unlock Collateral Funds</h2>

      <div>
        <label className="block mb-1">Select Account:</label>
        <select
          onChange={(e) => connect(e.target.value)}
          className="w-full bg-gray-800 p-2 rounded text-white"
          value={account || ''}
        >
          <option value="" disabled>Select account</option>
          {accounts.map(({ address, meta }) => {
            const formatted = encodeAddress(address, config.SS58_PREFIX);
            const balance = balances[address] ?? '...';
            return (
              <option key={address} value={address}>
                {meta.name || 'Unknown'} ({formatted.slice(0, 6)}...{formatted.slice(-4)}) - {balance}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block mb-1">Amount to unlock (optional):</label>
        <input
          type="number"
          placeholder="Enter P3D amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded text-white"
        />
        <div className="text-xs text-gray-400 mt-1">Leave empty to unlock all available.</div>
      </div>

      <div>
        <label className="block mb-1">Tips (optional):</label>
        <input
          type="number"
          placeholder="Enter P3D amount"
          value={tip}
          onChange={e => setTip(e.target.value)}
          className="w-full bg-gray-800 p-2 rounded text-white"
        />
        <div className="text-xs text-gray-400 mt-1">Tip in P3D to prioritize this transaction.</div>
      </div>

      <button
        disabled={submitting || !account}
        onClick={handleUnlock}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Unlock'}
      </button>

      {txHash && <p className="text-green-400 text-sm">✅ Tx Sent! {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorUnlockForm;
