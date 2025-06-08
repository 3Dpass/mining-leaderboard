import React, { useState } from 'react';
import { BN } from '@polkadot/util';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { useWallet } from '../hooks/useWallet';
import { encodeAddress } from '@polkadot/util-crypto';

const PREFIX = 71; // SS58 for 3DPass

const ValidatorUnlockForm = () => {
  const { api } = usePolkadotApi();
  const { accounts, account, connect, injector } = useWallet();

  const [amount, setAmount] = useState('');
  const [tip, setTip] = useState(''); // New state for tip
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [extrinsicStatus, setExtrinsicStatus] = useState(null); // New state for extrinsic status
  const [failureDetails, setFailureDetails] = useState(null); // New state for failure details

  const handleUnlock = async () => {
    if (!api || !account || !injector) return;

    try {
      setSubmitting(true);
      setError(null);
      setExtrinsicStatus(null); // Reset extrinsic status
      setFailureDetails(null); // Reset failure details

      const parsedAmount = amount
        ? new BN((parseFloat(amount) * 1e12).toString())
        : null;

      const parsedTip = tip
        ? new BN((parseFloat(tip) * 1e12).toString())
        : null;

      // Validate amount
      if (parsedAmount && parsedAmount.lte(new BN(0))) {
        throw new Error("Amount must be greater than zero.");
      }

      const tx = api.tx.validatorSet.unlock(
        parsedAmount !== null
          ? api.createType('Option<BalanceOf>', parsedAmount)
          : null
      );

      const unsub = await tx.signAndSend(account, { signer: injector, tip: parsedTip }, ({ status, events, txHash }) => {
        if (status.isInBlock) {
          setTxHash(txHash.toString());
          setSubmitting(false);
          unsub();

          // Check for events
          if (events) {
            events.forEach(({ event }) => {
              if (event.section === 'system') {
                if (event.method === 'ExtrinsicFailed') {
                  setExtrinsicStatus('An extrinsic failed.');
                  const errorDetails = event.data.toJSON(); // Get error details
                  setFailureDetails(errorDetails);
                }
              } else if (event.section === 'validatorSet') {
                if (event.method === 'NotLocked') {
                  setExtrinsicStatus('No lock.');
                }
              }
            });
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

      {!account && (
        <div>
          <p className="text-sm mb-1">Select account:</p>
          <select
            onChange={e => connect(e.target.value)}
            className="bg-gray-700 p-2 rounded text-white w-full"
          >
            <option value="">Select account</option>
            {accounts.map(acc => (
              <option key={acc.address} value={acc.address}>
                {acc.meta?.name || 'Unknown'} ({encodeAddress(acc.address, PREFIX).slice(0, 6)}…)
              </option>
            ))}
          </select>
        </div>
      )}

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
        <label className="block mb-1">Tip to increase priority (optional):</label>
       
        <input
          type="number"
          placeholder="Enter tip amount"
          value={tip}
          onChange={e => setTip(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded text-white"
        />
        <div className="text-xs text-gray-400 mt-1">Tip in P3D to prioritize this transaction.</div>
      </div>

      <button
        disabled={submitting}
        onClick={handleUnlock}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Unlock'}
      </button>

      {txHash && <p className="text-green-400 text-sm">✅ Tx Sent! {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ Error: {error}</p>}
      {extrinsicStatus && <p className="text-yellow-400 text-sm">⚠️ {extrinsicStatus}</p>}
      {/* 
      {failureDetails && (
        <div className="text-red-400 text-sm">
          <p>❌ Details: {JSON.stringify(failureDetails)}</p>
        </div>
      )}  
        */}
    </div>
  );
};

export default ValidatorUnlockForm;