import React, { useState, useEffect } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../../hooks/useWallet';
import config from '../../config';

const ValidatorPayPenaltyForm = ({ api }) => {
  const { accounts, account, connect, injector } = useWallet();

  const [penaltyAmount, setPenaltyAmount] = useState(0);
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

  // Fetch penalty amount for the selected account
  useEffect(() => {
    const fetchPenaltyAmount = async () => {
      if (!account || !api) return;

      try {
        const penaltyOption = await api.query.validatorSet.penalty(account);
        if (penaltyOption.isSome) {
          const penalty = penaltyOption.unwrap().toBn();
          // Convert to P3D with 6 decimals
          setPenaltyAmount(penalty.divn(1e6).toNumber() / 1e6);
        } else {
          setPenaltyAmount(0);
        }
      } catch (err) {
        console.error('Error fetching penalty:', err);
        setError('Failed to fetch penalty amount.');
      }
    };

    fetchPenaltyAmount();
  }, [account, api]);

  const handleSubmit = async () => {
    if (!api || !account || !injector) return;

    try {
      setSubmitting(true);
      setError(null);
      setTxHash(null);

      const tx = api.tx.validatorSet.payPenalty();

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
      <h2 className="text-xl font-bold">🚨 Pay off Penalties</h2>

      <div>
        <label className="block mb-1">Select account:</label>
        <select
          onChange={e => connect(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white w-full"
        >
          <option value="">Select account</option>
          {accounts.map(({ address, meta }) => {
            const displayAddr = encodeAddress(address, config.SS58_PREFIX).slice(0, 5) + '…';
            const label = `${meta.name || 'Unknown'} (${displayAddr}) - ${balances[address] || '...'}`;

            return (
              <option key={address} value={address}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <div className="text-sm text-gray-300">
        Penalties:{' '}
        <span className={penaltyAmount > 0 ? 'text-yellow-400' : 'text-green-400'}>
          {penaltyAmount.toFixed(config.BALANCE_FORMAT.DEFAULT_DECIMALS)} {config.FORMAT_BALANCE.unit}
        </span>
      </div>

      <button
        disabled={submitting || !account}
        onClick={handleSubmit}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Pay Penalty'}
      </button>

      {txHash && <p className="text-green-400">✅ Tx Sent: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">❌ {error}</p>}
    </div>
  );
};

export default ValidatorPayPenaltyForm;
