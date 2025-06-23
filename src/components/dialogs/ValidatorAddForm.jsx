import React, { useState, useEffect } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { useWallet } from '../../hooks/useWallet';
import config from '../../config';

const ValidatorAddForm = ({ api }) => {
  const { accounts, account, connect, injector } = useWallet();

  const [balances, setBalances] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [validatorInfo, setValidatorInfo] = useState(null);
  const [identityInfo, setIdentityInfo] = useState(null);

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!api || accounts.length === 0) return;

      try {
        const entries = await Promise.all(
          accounts.map(async ({ address }) => {
            const { data } = await api.query.system.account(address);
            return [address, data.free.toBigInt()];
          })
        );
        setBalances(Object.fromEntries(entries));
      } catch (err) {
        setError('Failed to fetch balances. Please try again later.');
      }
    };

    fetchBalances();
  }, [api, accounts]);

  // Fetch lock & identity info
  useEffect(() => {
    const fetchValidatorInfo = async () => {
      if (!account || !api) return;

      try {
        const [lockData, identityData, header] = await Promise.all([
          api.query.validatorSet.validatorLock(account),
          api.query.identity.identityOf(account),
          api.rpc.chain.getHeader()
        ]);

        const currentBlock = header.number.toNumber();

        if (lockData.isSome) {
          const [blockHeight, amount, autoRelock] = lockData.unwrap();
          setValidatorInfo({
            blockHeight: blockHeight.toNumber(),
            amount: amount.toBigInt() / BigInt(10 ** 12),
            autoRelock: autoRelock ? autoRelock.toNumber() : null,
            blocksRemaining: blockHeight.toNumber() - currentBlock
          });
        } else {
          setValidatorInfo({ amount: 0n, blockHeight: null, autoRelock: null, blocksRemaining: 0 });
        }

        if (identityData.isSome) {
          const { judgements, info } = identityData.unwrap();
          const judgement = judgements.length > 0 ? judgements[0][1] : null;
          setIdentityInfo({
            judgement: judgement?.toString() ?? null,
            displayName: info.display.isRaw ? info.display.asRaw.toUtf8() : 'Unknown'
          });
        }
      } catch (err) {
        setError('Failed to fetch validator info. Please try again later.');
      }
    };

    fetchValidatorInfo();
  }, [account, api]);

  // Submit extrinsic
  const handleSubmit = async () => {
  if (!account || !injector || !api) return;

  try {
    setSubmitting(true);
    setError(null);
    setTxHash(null);

    const tx = api.tx.validatorSet.addValidatorSelf();

    const unsub = await tx.signAndSend(account, { signer: injector }, ({ status, txHash, dispatchError }) => {
      if (status.isInBlock) {
        setTxHash(txHash.toString());
        setSubmitting(false);
        unsub();
      } else if (status.isFinalized) {
        unsub();
      }

      // Check for errors
      if (dispatchError) {
        let errorMessage;

        if (dispatchError.isModule) {
          // Decode the error
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
    setError('❌ Transaction submission failed. Please try again later.');
    setSubmitting(false);
  }
};

  return (
    <div className="p-4 rounded text-white space-y-4">
      <h2 className="text-lg font-bold">➕ Join Validator Set</h2>

      <div className="text-left text-sm text-gray-500">
        <p>In order to join, you must have:</p>
        <ul>
          <li>1. Locked: {config.VALIDATOR_ADD_MIN_LOCK_AMOUNT.toLocaleString()} {config.FORMAT_BALANCE.unit} for {config.VALIDATOR_ADD_MIN_BLOCKS_AHEAD.toLocaleString()}+ blocks ahead</li>
          <li>2. Identity: "{config.VALIDATOR_ADD_IDENTITY_REQUIREMENT}"</li>
        </ul>
      </div>
      <div className="mt-3 text-left text-sm text-white-500">
        Setup fee: 10,000 {config.FORMAT_BALANCE.unit} will be charged to Treasury, if succesful
      </div>

      <div>
        <label className="block mb-1">Select account:</label>
        <select
          onChange={e => connect(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white w-full"
        >
          <option value="">Choose an account</option>
          {accounts.map(({ address, meta }) => {
            const formatted = encodeAddress(address, config.SS58_PREFIX).slice(0, 5);
            const balance = balances[address];
            const p3d = balance ? `${(Number(balance) / (10 ** config.FORMAT_BALANCE.decimals)).toLocaleString(undefined, { minimumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS, maximumFractionDigits: config.BALANCE_FORMAT.DISPLAY_DECIMALS })} ${config.FORMAT_BALANCE.unit}` : '...';
            return (
              <option key={address} value={address}>
                {meta.name || 'Unknown'} ({formatted}…) — {p3d}
              </option>
            );
          })}
        </select>
      </div>

      {identityInfo && (
        <div className="text-sm text-gray-400">
          {identityInfo.judgement === 'Reasonable' ? '✅' :
           identityInfo.judgement === 'Erroneous' ? '🚫' :
           identityInfo.judgement === 'FeePaid' ? '🧾' :
           identityInfo.judgement === 'KnownGood' ? '👤✅' :
           identityInfo.judgement === 'OutOfDate' ? '👤⚠️' : '❓'}{' '}
          {identityInfo.displayName}
        </div>
      )}

      {validatorInfo && (
        <div className="text-sm text-gray-500 space-y-1">
          <p>🔒 Locked: {validatorInfo.amount.toString()} {config.FORMAT_BALANCE.unit}</p>
          <p>📦 Until Block: {validatorInfo.blockHeight ?? '—'}</p>
          <p>📉 Remaining: {validatorInfo.blocksRemaining ?? '—'} blocks</p>
          {validatorInfo.autoRelock && (
            <p>🔁 Auto Re-lock: every {validatorInfo.autoRelock} blocks</p>
          )}
          {(validatorInfo.amount < BigInt(config.VALIDATOR_ADD_MIN_LOCK_AMOUNT) || validatorInfo.blocksRemaining < config.VALIDATOR_ADD_MIN_BLOCKS_AHEAD) && (
            <p className="text-red-400 text-xs">
              ❗ Must lock at least {config.VALIDATOR_ADD_MIN_LOCK_AMOUNT.toLocaleString()} {config.FORMAT_BALANCE.unit} for {config.VALIDATOR_ADD_MIN_BLOCKS_AHEAD.toLocaleString()}+ blocks ahead
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !account || (validatorInfo && (validatorInfo.amount < BigInt(config.VALIDATOR_ADD_MIN_LOCK_AMOUNT) || validatorInfo.blocksRemaining < config.VALIDATOR_ADD_MIN_BLOCKS_AHEAD))}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        {submitting ? 'Submitting...' : 'Join Validator Set'}
      </button>

      {txHash && <p className="text-green-400">✅ In Block: {txHash.slice(0, 46)}...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default ValidatorAddForm;
