// config.js
import { formatBalance } from '@polkadot/util';

const config = {
  websocketEndpoint: 'wss://rpc.3dpass.org', // Node WSS RPC API endpoint
  API_BASE: 'https://api.3dpscan.xyz', // Explorer REST API Link
  genesisHash: '0x6c5894837ad89b6d92b114a2fb3eafa8fe3d26a54848e3447015442cd6ef4e66', // The Ledger of Things (LoT) Mainnet genesesis hash
  SS58_PREFIX: 71, // 3dpass LoT Mainnet account SS58 prefix
  FORMAT_BALANCE: {
    decimals: 12,
    unit: 'P3D' // Native currency symbol
  },
  BALANCE_FORMAT: {
    DEFAULT_DECIMALS: 12,
    DISPLAY_DECIMALS: 4, // display Deciamls for P3D
    LOCKED_DECIMALS: 0, // display Deciamls for Locked P3D
    HASH_RATE_DECIMALS: 2, // display Deciamls for Hash Rate
    SHARE_DECIMALS: 2, // display Deciamls for Share %
    VESTING_DECIMALS: 12, // display Deciamls for Vested P3D
    MP3D_DECIMALS: 4  // display Deciamls for Millions of P3D
  }
};

// Set the format balance defaults
formatBalance.setDefaults(config.FORMAT_BALANCE);

export default config;