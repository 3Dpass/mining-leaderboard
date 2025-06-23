import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { encodeAddress } from '@polkadot/util-crypto';
import config from '../../config';

const RejoinValidatorForm = ({ api }) => {
  const { accounts, account, connect, injector } = useWallet();

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
          const balance = Number(free.toBigInt()) / (10 ** config.FORMAT_BALANCE.decimals);
          newBalances[address] = `${balance.toLocaleString(undefined, { minimumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS, maximumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS })} ${config.FORMAT_BALANCE.unit}`;
        } catch (err) {
          console.error('Error fetching balance:', err);
          newBalances[address] = 'Error';
        }
      }

      setBalances(newBalances);
    };

    fetchBalances();
  }, [api, accounts]);

  const handleSubmit = async () => {
    if (!api || !account || !injector) return;

    try {
      setSubmitting(true);
      setError(null);
      setTxHash(null);

      const tx = api.tx.validatorSet.rejoinValidator(account);

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

          setError(`⚠️ Extrinsic failed: ${errorMessage}`);
          setSubmitting(false);
          unsub();
        }
      });
    } catch (err) {
      console.error(err);
      setError('❌ Transaction submission failed. Please try again later.');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-lg font-bold">🔁 Rejoin Validator Set</h2>
      <div className="text-left text-sm text-gray-500">
        1. Come back window: ~ 2 weeks since last throw out <br />
        2. Penalties must be paid off before rejoining
      </div>

      <div>
  <label className="block mb-1">Select account:</label>
  <select
    value={account || ''}
    onChange={(e) => connect(e.target.value)}
    className="w-full bg-gray-700 text-white p-2 rounded"
  >
    <option value="">Select account</option>
    {accounts.map((acc) => {
      const address = encodeAddress(acc.address, config.SS58_PREFIX);
      return (
        <option key={acc.address} value={acc.address}>
          {acc.meta.name || 'Unknown'} ({address.slice(0, 6)}...{address.slice(-4)}) - {balances[acc.address] || '...'}
        </option>
      );
    })}
  </select>
 </div>


      <button
        disabled={submitting || !account}
        onClick={handleSubmit}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Rejoin'}
      </button>

           {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
    </div>
  );
};

export default RejoinValidatorForm;

