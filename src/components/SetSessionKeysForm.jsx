import React, { useEffect, useState } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { encodeAddress } from '@polkadot/util-crypto';


const SetSessionKeysForm = ({ onClose }) => {
  const { api } = usePolkadotApi();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [grandpaKey, setGrandpaKey] = useState('');
  const [imonlineKey, setImonlineKey] = useState('');
  const [proof, setProof] = useState('0x');
  const [status, setStatus] = useState(null);

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      await web3Enable('3DPass Validator DApp');
      const injectedAccounts = await web3Accounts();
      setAccounts(injectedAccounts);
      if (injectedAccounts.length > 0) {
        setSelectedAccount(injectedAccounts[0].address);
      }
    };
    loadAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!api || !selectedAccount) return;

    try {
      const injector = await web3FromAddress(selectedAccount);

      const keys = api.createType('SessionKeys', {
        grandpa: grandpaKey,
        im_online: imonlineKey
      });

      const tx = api.tx.session.setKeys(keys, proof);

      await tx.signAndSend(selectedAccount, { signer: injector.signer }, ({ status: txStatus }) => {
        if (txStatus.isInBlock) {
          setStatus('✔️ Included in block');
        } else if (txStatus.isFinalized) {
          setStatus('✅ Finalized');
        }
      });
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to send transaction');
    }
  };

  return (
    <div className="text-white space-y-4">
      <h3 className="text-lg font-bold">🔑 Set Session Keys</h3>
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Account selector */}
        <div>
          <label className="block mb-1">Select Account</label>
          <select
            value={selectedAccount?.address || ''}
            onChange={e => {
           const account = accounts.find(a => a.address === e.target.value);
           setSelectedAccount(account);
          }}
          className="bg-gray-800 text-white p-2 rounded"
          >
         <option value="">-- Select Account --</option>
            {accounts.map(account => {
               const formatted = encodeAddress(account.address, 71);
               const preview = `${formatted.slice(0, 4)}...${formatted.slice(-4)}`;
               const name = account.meta?.name || 'Unknown';
        return (
        <option key={account.address} value={account.address}>
          {name} ({preview})
        </option>
        );
      })}
     </select>
        </div>

        <div>
          <label className="block mb-1">GRANDPA Key</label>
          <input
            type="text"
            value={grandpaKey}
            onChange={(e) => setGrandpaKey(e.target.value)}
            className="w-full bg-gray-700 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">ImOnline Key</label>
          <input
            type="text"
            value={imonlineKey}
            onChange={(e) => setImonlineKey(e.target.value)}
            className="w-full bg-gray-700 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Proof (Bytes)</label>
          <input
            type="text"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            className="w-full bg-gray-700 p-2 rounded"
            required
          />
        </div>

        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
          >
            ✖
          </button>
        </div>
      </form>

      {status && <div className="text-sm mt-2">{status}</div>}
    </div>
  );
};

export default SetSessionKeysForm;
