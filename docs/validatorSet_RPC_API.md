# Mining and Validator set RPC API Documentation

This document provides a comprehensive overview of all RPC API methods used in the Mining and Validator dashbord application.

[Polkadot.js](https://polkadot.js.org/docs/api/) api is used for the Ledger of Things [Node](https://github.com/3Dpass/3DP) interaction. 

## RPC API Methods

### `api.rpc.chain.getHeader()`
- **Description**: Retrieves the header of the latest block
- **Returns**: Block header information
- **Usage**: Used in NetworkState component to get the latest block information
- **Example Response**:
```javascript
{
  number: 123456,
  parentHash: "0x...",
  stateRoot: "0x...",
  extrinsicsRoot: "0x...",
  digest: {
    logs: [...]
  }
}
```

### `api.rpc.chain.getFinalizedHead()`
- **Description**: Retrieves the hash of the latest finalized block
- **Returns**: Block hash
- **Usage**: Used in ValidatorTable component to fetch block rewards and finalized block information
- **Example Response**:
```javascript
"0x1234567..."  // The finalized block hash
```

### `api.rpc.chain.getBlock(hash)`
- **Description**: Retrieves a block's details given its hash
- **Parameters**: 
  - `hash`: The hash of the block to retrieve
- **Returns**: Complete block information
- **Usage**: Used to get finalized block details
- **Example Response**:
```javascript
{
  block: {
    header: {
      number: 123456,
      stateRoot: "0x...",
      parentHash: "0x...",
      extrinsicsRoot: "0x..."
    },
    extrinsics: [...]
  }
}
```

### `api.rpc.chain.subscribeNewHeads(callback)`
- **Description**: Subscribes to new block headers
- **Parameters**:
  - `callback`: Function called when new headers arrive
- **Returns**: Unsubscribe function
- **Usage**: Used in NetworkState component to track new blocks
- **Example Response**:
```javascript
{
  number: 123457,
  hash: "0x...",
  parentHash: "0x...",
  stateRoot: "0x...",
  extrinsicsRoot: "0x..."
}
```

### `api.rpc.chain.subscribeFinalizedHeads(callback)`
- **Description**: Subscribes to finalized block headers
- **Parameters**:
  - `callback`: Function called when new finalized headers arrive
- **Returns**: Unsubscribe function
- **Usage**: Used in NetworkState component to track finalized blocks
- **Example Response**:
```javascript
{
  number: 123450,
  hash: "0x...",
  parentHash: "0x...",
  stateRoot: "0x...",
  extrinsicsRoot: "0x..."
}
```

## System Methods

### `api.rpc.system.chain()`
- **Description**: Retrieves the chain name
- **Returns**: String containing the chain name
- **Usage**: Used in NetworkInfo component to display network information
- **Example Response**:
```javascript
"3DPass LoT"
```

### `api.query.system.account(address)`
- **Description**: Retrieves account information including free balance
- **Parameters**:
  - `address`: Account address to query
- **Returns**: Account information including balances
- **Usage**: Used across multiple components to fetch account balances
- **Example Response**:
```javascript
{
  nonce: 12,
  consumers: 0,
  providers: 1,
  data: {
    free: 1000000000000,  // 1000 P3D (12 decimals)
    reserved: 0,
    miscFrozen: 0,
    feeFrozen: 0
  }
}
```

### `api.query.system.events()`
- **Description**: Retrieves system events
- **Returns**: Array of system events
- **Usage**: Used in Notifications component to track various system events
- **Example Response**:
```javascript
[
  {
    section: "imOnline",
    method: "HeartbeatReceived",
    data: [
      "d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV"
    ]
  },
  {
    section: "session",
    method: "NewSession",
    data: [123]
  }
]
```

## Validator Set Methods

### `api.query.validatorSet.sessionDuration()`
- **Description**: Retrieves the duration of a session in blocks
- **Returns**: Number of blocks per session
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
600  // Session duration in blocks
```

### `api.query.validatorSet.approvedValidators()`
- **Description**: Retrieves the list of approved validators
- **Returns**: Array of validator addresses
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
[
  "d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV",
  "d1DDLAtvzBrR81QUSiBgd1KkEL8quwcQQSHnD4Jvun7Vh4tzW"
]
```

### `api.query.validatorSet.candidates()`
- **Description**: Retrieves the list of validator candidates
- **Returns**: Array of candidate addresses
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
[
  "d1GYsy92kXxcp5JLByBtJGCnM9CNn2cGuydQn5mUyTw7qBVai"
]
```

### `api.query.validatorSet.validatorLock`
- **Description**: Retrieves validator lock information
- **Returns**: Lock details including amount and duration
- **Usage**: Used in ValidatorTable and ValidatorLockForm components
- **Example Response**:
```javascript
{
  blockHeight: 150000,
  amount: 400000000000000000,  // 400,000 P3D
  autoRelock: 50000  // Optional auto relock period
}
```

### `api.query.validatorSet.penalty`
- **Description**: Retrieves validator penalty information
- **Returns**: Penalty amount if any
- **Usage**: Used in ValidatorTable and ValidatorPayPenaltyForm components
- **Example Response**:
```javascript
10000000000000  // 10,000 P3D penalty
```

## Session Methods

### `api.query.session.validators()`
- **Description**: Retrieves the current set of active validators
- **Returns**: Array of validator addresses
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
[
  "d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV",
  "d1DDLAtvzBrR81QUSiBgd1KkEL8quwcQQSHnD4Jvun7Vh4tzW"
]
```

### `api.query.session.currentIndex()`
- **Description**: Retrieves the current session index
- **Returns**: Current session number
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
1234  // Current session number
```

### `api.query.session.queuedKeys()`
- **Description**: Retrieves the queued session keys
- **Returns**: Array of validator addresses and their session keys
- **Usage**: Used in ValidatorKeysPopup component
- **Example Response**:
```javascript
[
  [
    "d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV",
    {
      grandpa: "0x...",
      imOnline: "0x..."
    }
  ]
]
```

### `api.query.session.nextKeys(address)`
- **Description**: Retrieves the next session keys for a validator
- **Parameters**:
  - `address`: Validator address
- **Returns**: Session keys for the next session
- **Usage**: Used in ValidatorKeysPopup component
- **Example Response**:
```javascript
{
  grandpa: "0x...",
  imOnline: "0x..."
}
```

## GRANDPA Methods

### `api.query.grandpa.state()`
- **Description**: Retrieves the current GRANDPA state
- **Returns**: Current GRANDPA consensus state
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
{
  currentSetId: "123",
  setSize: 3,
  round: 456
}
```

### `api.query.grandpa.currentSetId()`
- **Description**: Retrieves the current GRANDPA authority set ID
- **Returns**: Current authority set ID
- **Usage**: Used in ValidatorTable component
- **Example Response**:
```javascript
"123"  // Current set ID
```

### `api.rpc.grandpa.roundState()`
- **Description**: Retrieves the current GRANDPA round state
- **Returns**: Detailed information about the current GRANDPA round
- **Usage**: Used in DialogGrandpaRoundState component
- **Example Response**:
```javascript
{
  best: {
    round: 456,
    totalWeight: 3,
    thresholdWeight: 2,
    prevotes: {
      currentWeight: 2,
      missing: ["d1GYsy92kXxcp5JLByBtJGCnM9CNn2cGuydQn5mUyTw7qBVai"]
    },
    precommits: {
      currentWeight: 2,
      missing: ["d1GYsy92kXxcp5JLByBtJGCnM9CNn2cGuydQn5mUyTw7qBVai"]
    }
  }
}
```

### `api.call.grandpaApi.grandpaAuthorities()`
- **Description**: Retrieves the current GRANDPA authorities
- **Returns**: Array of authority addresses and their weights
- **Usage**: Used in ValidatorKeysPopup component
- **Example Response**:
```javascript
[
  [
    "d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV",
    1
  ],
  [
    "d1DDLAtvzBrR81QUSiBgd1KkEL8quwcQQSHnD4Jvun7Vh4tzW",
    1
  ],
  [
    "d1GYsy92kXxcp5JLByBtJGCnM9CNn2cGuydQn5mUyTw7qBVai",
    1
  ]
]
```
Where:
- First element is the authority address (ed25519/Edwards)
- Second element is the voting weight

### `api.query.identity.identityOf(address)`
- **Description**: Retrieves identity information for an account
- **Parameters**:
  - `address`: Account address to query
- **Returns**: Identity information including display name and judgements
- **Usage**: Used in ValidatorTable component to display validator identities
- **Example Response**:
```javascript
{
  judgements: [[0, "Reasonable"]],
  info: {
    display: {
      Raw: "Validator Name"
    },
    legal: { Raw: "Legal Name" },
    web: { Raw: "https://example.com" },
    email: { Raw: "contact@example.com" }
  }
}
```

## Transaction Methods

### `api.tx.session.setKeys(keys, proof)`
- **Description**: Sets session keys for a validator
- **Parameters**:
  - `keys`: Session keys object containing GRANDPA and ImOnline keys
  - `proof`: Proof of key ownership
- **Returns**: Transaction object
- **Usage**: Used in SetSessionKeysForm component to set validator session keys
- **Example**:
```javascript
const keys = api.createType('PoscanRuntimeOpaqueSessionKeys', {
  grandpa: "0x...",
  imOnline: "0x..."
});
const tx = api.tx.session.setKeys(keys, "0x00");
```

### `api.tx.validatorSet.lock(amount, untilBlock, period)`
- **Description**: Locks funds as validator collateral
- **Parameters**:
  - `amount`: Amount to lock (in smallest units)
  - `untilBlock`: Block number until which funds will be locked
  - `period`: Optional auto re-lock period
- **Returns**: Transaction object
- **Usage**: Used in ValidatorLockForm component to lock validator collateral
- **Example**:
```javascript
const amount = new BN('400000000000000000');  // 400,000 P3D
const untilBlock = 150000;
const period = 50000;  // Optional auto-relock period
const tx = api.tx.validatorSet.lock(amount, untilBlock, period);
```

### `api.tx.validatorSet.unlock(amount)`
- **Description**: Unlocks validator collateral funds
- **Parameters**:
  - `amount`: Optional amount to unlock (if not specified, unlocks all available)
- **Returns**: Transaction object
- **Usage**: Used in ValidatorUnlockForm component to unlock validator collateral
- **Example**:
```javascript
const amount = api.createType('Option<BalanceOf>', null);  // Unlock all
const tx = api.tx.validatorSet.unlock(amount);
```

### `api.tx.validatorSet.addValidatorSelf()`
- **Description**: Adds the caller as a validator candidate
- **Returns**: Transaction object
- **Usage**: Used in ValidatorAddForm component to join the validator set
- **Example**:
```javascript
const tx = api.tx.validatorSet.addValidatorSelf();
// Note: Requires 400,000 P3D locked and "Reasonable" identity judgement
```

### `api.tx.validatorSet.rejoinValidator(address)`
- **Description**: Allows a previously removed validator to rejoin
- **Parameters**:
  - `address`: Address of the validator to rejoin
- **Returns**: Transaction object
- **Usage**: Used in RejoinValidatorForm component to rejoin the validator set
- **Example**:
```javascript
const tx = api.tx.validatorSet.rejoinValidator("d1H8a6WMjzdETME3QJ9jDoxD5WbzfZnMj6fciVQL6V3i6jPEV");
// Note: Can only be called after ~2 weeks since last removal
```

### `api.tx.validatorSet.payPenalty()`
- **Description**: Pays off validator penalties all at once
- **Returns**: Transaction object
- **Usage**: Used in ValidatorPayPenaltyForm component to pay penalties
- **Example**:
```javascript
const tx = api.tx.validatorSet.payPenalty();
// Note: Will pay all accumulated penalties
```

### `api.tx.rewards.unlock()`
- **Description**: Unlocks available validator rewards
- **Returns**: Transaction object
- **Usage**: Used in ValidatorRewardsUnlockForm component to unlock vested rewards
- **Example**:
```javascript
const tx = api.tx.rewards.unlock();
// Note: Will unlock all available (vested) rewards
```

## Custom Types

### Session Keys Structure
```javascript
api.createType('PoscanRuntimeOpaqueSessionKeys', {
  grandpa: api.createType('SpFinalityGrandpaAppPublic', grandpaKey),
  imOnline: api.createType('PalletImOnlineSr25519AppSr25519Public', imonlineKey)
})
```
- **Description**: Custom type for session keys
- **Usage**: Used when setting validator session keys
