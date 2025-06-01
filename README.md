# Mining Leaderboard & Validator Set
This is a non-custodial Web3 user interface that aggregates essential data for both miners and validators operating within The Ledger of Things.

### 1. Mining 24H Leaderboard:
Features:
 - Author Block Reward / Validators reward
 - Current Difficulty
 - Estimated Network Hashrate
 - Ranked Block Authors list aggreagated for the last 24H
 - Block Authors share

<img width="974" alt="mining-leaderboard-min" src="https://github.com/user-attachments/assets/35e4f6e2-7912-4395-b3c5-6a1e230f7616" />

### 2. Validator set dashboard:
 Features:
 - Current Session index
 - GRANDPA Finalization status
 - Total active Validators
 - Validators list
 - Validator status (Active, Inactive, Candidate)
 - Search bar and filters
 - On-chain identity tracking
 - Locks tracking
 - Penalties tracking
 - Last exit (block/reason)
 - Equivocation (if a validator was reported at least once)

<img width="974" alt="validator_set-min" src="https://github.com/user-attachments/assets/0dc3054c-9b30-4966-a933-d9515c5ce85e" />

## Blockchain explorer interaction
The app fetches the **Mining Leaderboard** data from the [explorer](https://github.com/3Dpass/explorer) via its [REST API](https://github.com/3Dpass/explorer?tab=readme-ov-file#rest-api). 

Modify the `config.js` file to change the endpoint:
```
API_BASE: 'https://api.3dpscan.xyz', // Explorer REST API endpoint
```

## LoT Node interaction
The app fetches the **Validator Set** data directly from LoT [Node](https://github.com/3Dpass/3DP) through its RPC API endpoint (see more: `ValidatorTable.jsx`). Mainnet [RPC API providers](https://github.com/3Dpass/rpc-list/blob/main/list.txt) list.

Modify the `config.js` file to change the RPC API provider:
```
websocketEndpoint: 'wss://rpc.3dpass.org', // Node WSS RPC API endpoint
```
Connect to Node in local: `ws://127.0.0.1:9944`

## Install 
```
npm install
```

## Run
```
npm run dev
```

## Contributiions
We welcome community support with both Pull Requests and reporting bugs. Please don't hesitate to jump in.

### Responsibility disclaimer
This is an open source free software. Use it at your own risk.