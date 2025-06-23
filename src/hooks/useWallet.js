import { useState, useEffect } from 'react';
import { web3Enable, web3Accounts, web3FromAddress } from '@polkadot/extension-dapp';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [injector, setInjector] = useState(null);

  useEffect(() => {
    const init = async () => {
      await web3Enable('3DPass Validator Dashboard');
      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);
    };
    init();
  }, []);

  const connect = async (address) => {
    setAccount(address);
    const { signer } = await web3FromAddress(address);
    setInjector(signer);
  };

  return { account, accounts, connect, injector, connected: !!account };
};
