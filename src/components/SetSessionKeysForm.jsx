import React, { useEffect, useState } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { encodeAddress } from '@polkadot/util-crypto';

const SetSessionKeysForm = ({ onClose }) => {
  const { api } = usePolkadotApi();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [grandpaKey, setGrandpaKey] = useState('0x');
  const [imonlineKey, setImonlineKey] = useState('0x');
  const [proof, setProof] = useState('0x');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [p3dBalance, setP3dBalance] = useState(null); // State for P3D balance

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      await web3Enable('3DPass Validator DApp');
      const injectedAccounts = await web3Accounts();
      setAccounts(injectedAccounts);
      if (injectedAccounts.length > 0) {
        setSelectedAccount(injectedAccounts[0]);
      }
    };
    loadAccounts();
  }, []);

  // Fetch P3D balance when selected account changes
  useEffect(() => {
    const fetchP3DBalance = async () => {
      if (!api || !selectedAccount) return;

      try {
        const { data: { free } } = await api.query.system.account(selectedAccount.address);
        const balance = free.toBn().divn(1e6).toNumber() / 1e6; // Convert to P3D with 6 decimals
        setP3dBalance(`${balance.toFixed(3)} P3D`);
      } catch (error) {
        console.error('Error fetching P3D balance:', error);
        setP3dBalance('Error fetching balance');
      }
    };
    fetchP3DBalance();
  }, [selectedAccount, api]);

  // Function to validate keys (only checks if they start with '0x')
  const isValidKey = (key) => {
    return key.startsWith('0x');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!api || !selectedAccount) {
      console.error('API or selected account is not available');
      return;
    }

    // Validate keys
    if (!isValidKey(grandpaKey) || !isValidKey(imonlineKey) || !isValidKey(proof)) {
      setStatus('❌ Invalid key format. Keys must start with "0x".');
      return;
    }

    try {
      setLoading(true);
      setStatus(null); // Clear previous status

      const injector = await web3FromAddress(selectedAccount.address);
      console.log('Injector:', injector);

      // Construct the session keys using the correct types
      const keys = api.createType('PoscanRuntimeOpaqueSessionKeys', {
        grandpa: api.createType('SpFinalityGrandpaAppPublic', grandpaKey),
        imOnline: api.createType('PalletImOnlineSr25519AppSr25519Public', imonlineKey)
      });

      console.log('Constructed keys:', keys.toJSON());

      const tx = api.tx.session.setKeys(keys, proof);
      console.log('Transaction:', tx.toJSON());

      await tx.signAndSend(selectedAccount.address, { signer: injector.signer }, ({ status: txStatus }) => {
        console.log('Transaction status:', txStatus);
        if (txStatus.isInBlock) {
          setStatus('✔️ Included in block');
        } else if (txStatus.isFinalized) {
          setStatus('✅ Finalized');
        }
      });
    } catch (err) {
      console.error('Transaction error:', err);
      setStatus('❌ Failed to send transaction: ' + err.message); // Provide more detailed error
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="text-white space-y-4">
      <h3 className="text-lg font-bold">🔑 Set Session Keys</h3>
      <div className="text-left text-sm text-gray-500">
        <p>New keys will take into effect in 2 sessions.</p>
      </div>
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
            className="w-full bg-gray-800 p-2 rounded text-white"
          >
            <option value="">-- Select Account --</option>
            {accounts.map(account => {
              const formatted = encodeAddress(account.address, 71);
              const preview = `${formatted.slice(0, 4)}...${formatted.slice(-4)}`;
              const name = account.meta?.name || 'Unknown';
              const balance = p3dBalance && selectedAccount?.address === account.address ? p3dBalance : '...'; // Display balance or loading state
              return (
                <option key={account.address} value={account.address}>
                  {name} ({preview}) - {balance}
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
            className={`bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading} // Disable button while loading
          >
            {loading ? 'Submitting...' : 'Set Keys'}
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
