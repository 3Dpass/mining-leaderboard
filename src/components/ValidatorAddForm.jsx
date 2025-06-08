import React, { useState } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../hooks/useWallet';
import { usePolkadotApi } from '../hooks/usePolkadotApi';

const SS58_PREFIX = 71;

const ValidatorAddForm = () => {
  const { api } = usePolkadotApi();
  const { accounts, account, connect, injector } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!account || !injector || !api) return;

    try {
      setSubmitting(true);
      setError(null);

      const tx = api.tx.validatorSet.addValidatorSelf();

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
      <h2 className="text-lg font-bold">➕ Join Validator Set</h2>
      <div className="text-left text-sm text-gray-500">
        <p>Must have:</p>
        <ul>
          <li>1. Locked: 400,000 P3D for 50000+ blocks ahead</li>
          <li>2. Identity: "Reasonable"</li>
        </ul>
      </div>
       <div className="mt-3 text-left text-sm text-gray-500">
        Setup fee: 10,000 P3D will be charged to Treasury
       </div>

      {!account && (
        <div>
          <label className="block mb-1">Select account:</label>
          <select
            onChange={e => connect(e.target.value)}
            className="bg-gray-700 p-2 rounded text-white w-full"
          >
            <option value="">Choose an account</option>
            {accounts.map(({ address, meta }) => (
              <option key={address} value={address}>
                {meta.name || 'Unknown'} ({encodeAddress(address, SS58_PREFIX).slice(0, 5)}…)
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !account}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Join Validator Set'}
      </button>

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400">❌ Error: {error}</p>}
    </div>
  );
};

export default ValidatorAddForm;
