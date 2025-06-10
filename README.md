# Mining Leaderboard & Validator Set
This is a non-custodial Web3 user interface that aggregates essential data for both miners and validators operating within The Ledger of Things.

### 1. Mining 24H Leaderboard:
Features:
 - Author Block Reward / Validators reward
 - Current Difficulty
 - Estimated Network Hashrate
 - Ranked Block Authors list aggreagated for the last 24H
 - Block Authors share
 - Vestiing schedule
 - Management tools:
   - "Claim" – `rewards.unlock()` method to claim all vested rewards available

<img width="974" alt="P3D_mining_dashboard-min" src="https://github.com/user-attachments/assets/7dec2491-63ec-4eda-80ae-669cfce28b11" />


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
 - Validator management tools:
    - "Lock" - `valiidatorSet.lock(amount,until,period)` method to lock funds for the collateral
    - "Join" – `valiidatorSet.addValidatorSelf()` method to add new validator into the set
    - "Set Keys" – `session.setKeys(keys, proof)` method to set up keys for validator
    - "Rejoin" – `valiidatorSet.rejoinValidator(validatorId)` method to rejoin penalties free after removal
    - "Unlock" – `valiidatorSet.unlock(amount)` method to unlock collateral funds
    - "Claim" – `rewards.unlock()` method to claim all vested rewards available
    - "Penalty" – `validatorSet.payPenalty()` to pay off current penalties
      
<img width="985" alt="validator_dashboard-min" src="https://github.com/user-attachments/assets/cb7e0b5f-0eda-450e-a994-e3ea05d90c2f" />


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

## Deploy

For details on building a production bundle and hosting it on your server, see
[`docs/deployment.md`](docs/deployment.md).

## Contributions
We welcome community support with both Pull Requests and reporting bugs. Please don't hesitate to jump in.

### Responsibility disclaimer
This is an open source free software. Use it at your own risk.
