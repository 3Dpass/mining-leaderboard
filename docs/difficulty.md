# How to Fetch Current Difficulty from the Blockchain Explorer API

## Overview

The "difficulty" value is a key metric for mining, representing how hard it is to find a new block. In this project, the difficulty is fetched from the blockchain explorer API by retrieving the latest block, extracting the "seal" log, and decoding the difficulty from the seal's hex value.

---

## Step-by-Step Guide

### 1. Fetch the Latest Block Height

First, get the latest (or finalized) block height from the `/overview` endpoint:

```js
const overview = await fetch(`${API_BASE}/overview`).then(res => res.json());
const { finalizedHeight } = overview;
```

### 2. Fetch the Latest Block Data

Use the block height to fetch the block details:

```js
const blockRes = await fetch(`${API_BASE}/blocks/${finalizedHeight}`).then(res => res.json());
```

### 3. Extract the "seal" Log

The block's `digest.logs` array contains various logs. The "seal" log holds the difficulty in its second element:

```js
const sealLog = blockRes?.digest?.logs?.find(log => log.seal);
const seal = sealLog?.seal; // Array, e.g. [<engine id>, <hex difficulty>]
```

### 4. Decode the Difficulty

The difficulty is encoded as a little-endian 4-byte hex in the second element of the seal array. To decode:

```js
if (seal && seal.length > 1) {
  const sealHex = seal[1].replace(/^0x/, ''); // Remove '0x' prefix
  const difficultyHexLE = sealHex.slice(0, 8); // First 4 bytes (8 hex chars)
  const bytes = difficultyHexLE.match(/../g); // Split into byte pairs
  if (bytes) {
    const diff = parseInt(bytes.reverse().join(''), 16); // Convert LE to BE, then to int
    console.log('Difficulty:', diff);
  }
}
```

### 5. Example: Full Function

```js
async function fetchCurrentDifficulty(API_BASE) {
  // 1. Get latest finalized block height
  const overview = await fetch(`${API_BASE}/overview`).then(res => res.json());
  const { finalizedHeight } = overview;

  // 2. Fetch the block data
  const blockRes = await fetch(`${API_BASE}/blocks/${finalizedHeight}`).then(res => res.json());

  // 3. Extract and decode difficulty
  const sealLog = blockRes?.digest?.logs?.find(log => log.seal);
  const seal = sealLog?.seal;
  if (seal && seal.length > 1) {
    const sealHex = seal[1].replace(/^0x/, '');
    const difficultyHexLE = sealHex.slice(0, 8);
    const bytes = difficultyHexLE.match(/../g);
    if (bytes) {
      const diff = parseInt(bytes.reverse().join(''), 16);
      return diff;
    }
  }
  throw new Error('Difficulty not found in block');
}
```

### 6. Notes

- The API endpoints are defined by your config, e.g., `API_BASE`.
- The difficulty is always in the first 4 bytes (8 hex chars) of the seal's second element, little-endian encoded.
- If the latest block is unavailable, you may try previous blocks (see retry logic in the code).

---

## References

- See `MiningLeaderboardTable.jsx`, especially the `fetchDifficulty` effect and the `extractDifficultyFromBlock` function for more details.
- The decoding logic is robust to missing or malformed data, and logs warnings if the seal or difficulty is not found. 