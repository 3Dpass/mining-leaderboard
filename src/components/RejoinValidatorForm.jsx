import React, { useState } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { useWallet } from '../hooks/useWallet';
import { encodeAddress } from '@polkadot/util-crypto';

const SS58_PREFIX = 71;

const RejoinValidatorForm = () => {
  const { api } = usePolkadotApi();
  const { accounts, account, connect, injector } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!api || !account || !injector) return;
    try {
      setSubmitting(true);
      setError(null);
      setTxHash(null);

      const tx = api.tx.validatorSet.rejoinValidator(account);

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
      <h2 className="text-lg font-bold">🔁 Rejoin Validator Set</h2>
      <div className="text-left text-sm text-gray-500">
        1. Come back window: ~ 2 weeks since last throw out <br />
        2. Penalities must be paid off before rejoining
      </div>

      {!account && (
        <div>
          <label className="block mb-1">Select account:</label>
          <select
            onChange={(e) => connect(e.target.value)}
            className="w-full bg-gray-700 text-white p-2 rounded"
          >
            <option value="">Select account</option>
            {accounts.map((acc) => (
              <option key={acc.address} value={acc.address}>
                {acc.meta.name || 'Unknown'} ({encodeAddress(acc.address, SS58_PREFIX).slice(0, 6)}...{encodeAddress(acc.address, SS58_PREFIX).slice(-4)})
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        disabled={submitting || !account}
        onClick={handleSubmit}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Rejoin as Validator'}
      </button>

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400">❌ Error: {error}</p>}
    </div>
  );
};

export default RejoinValidatorForm;
