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
  },
  // Mining Leaderboard Table constants
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_ENTRIES: 1000,
  BLOCK_STORAGE_KEY: 'mining_leaderboard_blocks',
  MAX_STORED_BLOCKS: 1440, // Store last 24 hours of blocks
  BLOCK_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  // Mining Leaderboard Table UI/logic constants
  LEADERBOARD_VISIBLE_COUNT_DEFAULT: 100,
  LEADERBOARD_VISIBLE_COUNT_INCREMENT: 100,
  LEADERBOARD_BLOCK_BATCH_SIZE: 50,
  BLOCK_TIME_SECONDS: 60,
  API_RETRY_COUNT: 3,
  BLOCK_REWARD_RETRY_COUNT: 20,
  DIFFICULTY_FETCH_MAX_ATTEMPTS: 3,
  BLOCK_REWARD_LOOKBACK_OFFSET: 120,
  BLOCK_PROCESS_CHUNK_SIZE: 100,
  LEADERBOARD_CHART_GROUPS: [
    { name: 'Top 10', start: 0, end: 10 },
    { name: '11-50', start: 10, end: 50 },
    { name: '51-100', start: 50, end: 100 },
    { name: '101-200', start: 100, end: 200 },
    { name: '201-400', start: 200, end: 400 },
    { name: 'Rest', start: 400, end: null },
  ],
  // Validator Table UI/logic constants
  VALIDATOR_VISIBLE_COUNT_DEFAULT: 100,
  VALIDATOR_VISIBLE_COUNT_INCREMENT: 100,
  VALIDATOR_IDENTITY_BATCH_SIZE: 10,
  VALIDATOR_IDENTITY_BATCH_DELAY_MS: 100,
  // SetSessionKeysForm defaults
  SET_SESSION_KEYS_DEFAULT_KEY: '0x',
  // ShareChart color palette
  SHARE_CHART_COLORS: ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#AA66CC', '#DD4477'],
  // DialogGrandpaRoundState refresh interval
  DIALOG_GRANDPA_ROUNDSTATE_REFRESH_INTERVAL: 6000, // ms
  // DialogRpcSettings color config
  DIALOG_RPC_SETTINGS_COLORS: {
    background: '#1f2937',
    border: '#4B5563',
    text: '#FFFFFF',
  },
  // ValidatorLockForm config
  VALIDATOR_LOCK_TARGET_BLOCK_OFFSET: 50000,
  VALIDATOR_LOCK_AMOUNT_PLANCK: '400000000000000000', // 400,000 P3D in Crumbs
  VALIDATOR_LOCK_PERIOD_OPTIONS: [null, 50000, 100000],
  // ValidatorAddForm config
  VALIDATOR_ADD_MIN_LOCK_AMOUNT: 400000,
  VALIDATOR_ADD_MIN_BLOCKS_AHEAD: 50000,
  VALIDATOR_ADD_IDENTITY_REQUIREMENT: 'Reasonable',
  // Hashrate units for display
  HASHRATE_UNITS: ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'],
  // Number of blocks to process for 24h window
  LEADERBOARD_BLOCKS_WINDOW: 1440,
  // Interval for refreshing leaderboard blocks (ms)
  LEADERBOARD_BLOCKS_REFRESH_INTERVAL: 300000, // 5 minutes
  // Base delay for API retry exponential backoff (ms)
  API_RETRY_BASE_DELAY_MS: 1000, // 1 second
};

// Set the format balance defaults
formatBalance.setDefaults(config.FORMAT_BALANCE);

export default config;