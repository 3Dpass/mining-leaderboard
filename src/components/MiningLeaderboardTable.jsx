import React, { useEffect, useState } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import ShareChart from './ShareChart';
import HashrateChart from './HashrateChart';
import ValidatorRewardsUnlockForm from './ValidatorRewardsUnlockForm';
import config from '../config'; // Blockchain explorer REST API endpoint

const PREFIX = 71; // 3DPass mainnet SS58 prefix

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cacheStore = {};

async function fetchWithCache(url) {
  const now = Date.now();
  const cached = cacheStore[url];

  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  cacheStore[url] = { data, timestamp: now };
  return data;
}

const extractDifficultyFromBlock = (block) => {
  if (!block || !block.digest || !block.digest.logs) {
    console.warn(`[extract] Block ${block?.height}: Missing digest/logs`);
    return null;
  }

  const sealLog = block.digest.logs.find(log => log.seal);
  if (!sealLog || !Array.isArray(sealLog.seal) || sealLog.seal.length < 2) {
    console.warn(`[extract] Block ${block?.height}: Invalid sealLog`, sealLog);
    return null;
  }

  const sealHex = sealLog.seal[1];
  if (!sealHex || sealHex.length < 10) {
    console.warn(`[extract] Block ${block?.height}: Invalid sealHex: ${sealHex}`);
    return null;
  }

  try {
    const leHex = sealHex.replace(/^0x/, '').slice(0, 8);
    const bytes = leHex.match(/../g);
    const reversed = bytes.reverse().join('');
    const difficulty = parseInt(reversed, 16);

    if (isNaN(difficulty)) throw new Error("Parsed NaN");

    if (difficulty === 0) {
      console.warn(`[extract] Block ${block?.height}: Parsed difficulty 0 from hex ${reversed}`);
    }

    return difficulty;
  } catch (err) {
    console.warn(`[extract] Block ${block?.height}: Failed to parse difficulty`, err.message);
    return null;
  }
};


const MiningLeaderboardTable = () => {
  const { api, connected } = usePolkadotApi();
  const [loading, setLoading] = useState(true);
  const [allMiners, setAllMiners] = useState([]);
  const [visibleCount, setVisibleCount] = useState(100);
  const [blockReward, setBlockReward] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [estimatedHashrate, setEstimatedHashrate] = useState(null);
  const [perBlockHashrate, setPerBlockHashrate] = useState([]);
  const totalMinersCount = allMiners.length;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMiners = allMiners.filter(miner => 
  miner.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [showRewardsUnlockModal, setShowRewardsUnlockModal] = useState(false);
  

  // Fetch leaderboard miners
  useEffect(() => {
  const fetchBlocks = async () => {
    try {
      const overview = await fetchWithCache(`${config.API_BASE}/overview`);
      const { latestHeight } = overview;

      // Store failed block numbers for retrying later
      const failedBlocks = [];

      // Fetch 1440 blocks concurrently with caching
      const blockPromises = Array.from({ length: 1440 }, (_, i) =>
        fetchWithCache(`${config.API_BASE}/blocks/${latestHeight - i}`).catch((error) => {
          console.warn(`Failed to fetch block ${latestHeight - i}:`, error);
          failedBlocks.push(latestHeight - i); // Store failed block number
          return null; // Return null for failed fetch
        })
      );

      const blocks = await Promise.all(blockPromises);

      // Filter out null values (failed fetches)
      const validBlocks = blocks.filter(block => block !== null);

      const hashrateData = [];

      const authorCounts = {};
const lastBlockHeightByAuthor = {};

validBlocks.forEach(block => {
  const digest = block?.digest?.logs || [];
  const seenAuthors = new Set(); // Track seen authors for this block

  digest.forEach(log => {
    if (log.preRuntime) {
      const rawAuthor = log.preRuntime[1];
      try {
        const address = encodeAddress(hexToU8a(rawAuthor), PREFIX);
        
        // Only count if this author hasn't been counted for this block
        if (!seenAuthors.has(address)) {
          authorCounts[address] = (authorCounts[address] || 0) + 1;
          seenAuthors.add(address); // Mark this author as seen for this block

          if (
            !lastBlockHeightByAuthor[address] ||
            block.height > lastBlockHeightByAuthor[address]
          ) {
            lastBlockHeightByAuthor[address] = block.height;
          }
        }
      } catch (e) {
        console.warn('Invalid public key:', rawAuthor);
      }
    }
  });

        // Extract difficulty and calculate hashrate
const difficulty = extractDifficultyFromBlock(block);
if (difficulty && difficulty > 0) {
  const hashrate = difficulty / 60;
  hashrateData.push({
    height: block.height,
    timestamp: block.time || Date.now(),
    hashrate,
  });
} else {
  console.warn(`[skip] Block ${block.height}: Skipped due to difficulty ${difficulty}`);
}
    });

      const totalBlocks = validBlocks.length;

      const sorted = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([address, count], i) => {
          const lastBlock = lastBlockHeightByAuthor[address] || 0;
          return {
            rank: i + 1,
            address,
            blocks: count,
            share: (count / totalBlocks) * 100,
            lastBlockHeight: lastBlock,
            lastBlockAgoMin: latestHeight - lastBlock,
          };
        });

      setAllMiners(sorted);
      setLoading(false);
      setPerBlockHashrate(
          hashrateData.filter(item => typeof item.hashrate === 'number' && item.hashrate > 0).reverse()
      );


      // Store failed blocks for retrying later
      if (failedBlocks.length > 0) {
        console.log('Failed to fetch blocks:', failedBlocks);
        // You can store failedBlocks in a state or local storage for retrying later
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  };

  // Initial fetch
  fetchBlocks();

  // Set interval for fetching new blocks every 5 minutes
  const interval = setInterval(async () => {
    try {
      const overview = await fetchWithCache(`${config.API_BASE}/overview`);
      const { latestHeight } = overview;

      // Fetch only the latest block
      const latestBlock = await fetchWithCache(`${config.API_BASE}/blocks/${latestHeight}`);
      // Process the latest block similarly to how we processed the initial blocks
      // (You may want to implement logic to update the existing miners list with the new block data)

    } catch (e) {
      console.error('Failed to fetch new blocks:', e);
    }
  }, 300000); // 5 minutes

  return () => clearInterval(interval);
}, []);

  // Helper function to fetch block reward with retry logic
const fetchBlockRewardWithRetry = async (initialHeight, retries = 20) => {
  for (let i = 0; i <= retries; i++) {
    const targetBlock = initialHeight - i;
    try {
      const eventData = await fetchWithCache(
        `${config.API_BASE}/events?section=balances&method=Deposit&is_extrinsic=false&time_dimension=block&block_start=${targetBlock}&page=0`
      );

      // Loop through items and extract Deposit amount
      for (const item of eventData.items || []) {
        for (const arg of item.args || []) {
          if (arg.name === 'amount') {
            const raw = arg.value;
            const reward = Number(raw) / 10 ** 12;
            return reward.toFixed(4); // Return the reward if found
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching block reward for block ${targetBlock}:`, err);
    }
  }
  return 'N/A'; // Return 'N/A' if all retries fail
};

// Fetch miner block reward
useEffect(() => {
  const fetchBlockReward = async () => {
    try {
      const overviewRes = await fetchWithCache(`${config.API_BASE}/overview`);
      const { finalizedHeight } = overviewRes;

      const reward = await fetchBlockRewardWithRetry(finalizedHeight - 120);
      setBlockReward(reward);
    } catch (err) {
      console.error('Error fetching block reward:', err);
      setBlockReward('N/A');
    }
  };

  fetchBlockReward();
}, []);

  // Fetch difficulty
    useEffect(() => {
    const fetchDifficulty = async () => {
      try {
        const overviewRes = await fetchWithCache(`${config.API_BASE}/overview`);
        const { finalizedHeight } = overviewRes;
        const blockRes = await fetchWithCache(`${config.API_BASE}/blocks/${finalizedHeight}`);

        const sealLog = blockRes?.digest?.logs?.find(log => log.seal);
        const seal = sealLog?.seal;

        if (seal && seal.length > 1) {
          const sealHex = seal[1].replace(/^0x/, '');
          const difficultyHexLE = sealHex.slice(0, 8);
          const diff = parseInt(difficultyHexLE.match(/../g).reverse().join(''), 16);
          setDifficulty(diff);

          // calculate hashrate from difficulty / block time
          const blockTimeSeconds = 60;
          const estimated = diff / blockTimeSeconds;
          setEstimatedHashrate(estimated);
        } else {
          setDifficulty(null);
          setEstimatedHashrate(null);
        }
      } catch (error) {
        console.error('Error fetching difficulty:', error);
        setDifficulty(null);
        setEstimatedHashrate(null);
      }
    };

    fetchDifficulty();
    const interval = setInterval(fetchDifficulty, 300000);
    return () => clearInterval(interval);
  }, []);

  const totalBlocks = allMiners.reduce((acc, miner) => acc + miner.blocks, 0) || 1;
  const getGroupShare = (start, end) => {
    return (
      (allMiners.slice(start, end).reduce((acc, miner) => acc + miner.blocks, 0) / totalBlocks) * 100
    );
  };

  const chartData = [
    { name: 'Top 10', value: getGroupShare(0, 10) },
    { name: '11-50', value: getGroupShare(10, 50) },
    { name: '51-100', value: getGroupShare(50, 100) },
    { name: '101-200', value: getGroupShare(100, 200) },
    { name: '201-400', value: getGroupShare(200, 400) },
    { name: 'Rest', value: getGroupShare(400, allMiners.length) },
  ];

  const formatLastBlockAgo = (blocksAgo) => {
    const minutesAgo = blocksAgo;
    if (minutesAgo < 1) return '<1 min ago';
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatHashrate = (value) => {
  if (!value || value <= 0) return '0 H/s';
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
};

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">⛏️ 24h Mining Leaderboard</h1>
      <div className="flex space-x-8">
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Author block reward</div>
          <div className="text-2xl font-extrabold">{blockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Difficulty</div>
          <div className="text-2xl font-extrabold">{difficulty ?? '--'}</div>
          <div className="text-sm font-light">Hashrate: ~ {estimatedHashrate ? formatHashrate(estimatedHashrate) : '--'}</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Authors</div>
          <div className="text-2xl font-extrabold">{totalMinersCount > 0 ? totalMinersCount : '--'}</div>
          <div className="text-sm font-light">Last 24h total</div>
        </div>
      </div>

      <div className="border rounded bg-gray-800 px-6 py-3 text-white">
        <h2 className="text-white font-semibold text-lg mb-4">Estimated Hashrate (24h)</h2>
         <HashrateChart data={perBlockHashrate} />
      </div>

      <div className="border rounded bg-gray-800 px-6 py-3 text-white">
        <h2 className="text-white font-semibold text-lg mb-4">Authors Share Chart (24h)</h2>
        <ShareChart data={chartData} />
      </div>

      <div className="border rounded bg-gray-800 px-3 py-3">

       <div className="mb-4">
         <div className="text-center">

         <button
          onClick={() => setShowRewardsUnlockModal(true)}
          className="px-4 py-2 mr-2 mb-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          💰 Claim Vested Rewards
       </button>

       </div>


          <input
            type="text"
            placeholder="Search by address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded bg-gray-700 text-white"
          />
        </div>

        {loading ? (
          <p className="text-white">Loading...</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-t border-b border-gray-700 text-white text-sm">
              <thead>
                <tr>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-left text-gray-400">Rank</th>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-left text-gray-400">Author</th>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-right text-gray-400">Score</th>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-right text-gray-400">Share</th>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-right text-gray-400">Last</th>
                  <th className="border-t border-b border-gray-700 px-3 py-1 text-right text-gray-400">Mined</th>
                </tr>
              </thead>
              <tbody>
                {filteredMiners.slice(0, visibleCount).map(miner => (
                  <tr key={miner.address} className="hover:bg-gray-700">
                    <td className="px-2 py-1 font-mono">
                      <span className="text-sm text-gray-400">{miner.rank}</span>
                    </td>
                    <td className="px-2 py-1 font-mono">
                        <a
                         href={`https://3dpscan.xyz/#/accounts/${miner.address}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="underline hover:text-indigo-300 font-mono"
                         >
                          {miner.address}
                       </a>
                    </td>
                    <td className="border-t border-b border-gray-700 px-3 py-1 text-right">
                      <span className="text-sm text-gray-400">{miner.blocks}</span> 
                    </td>
                    <td className="border-t border-b border-gray-700 px-3 py-1 text-right">
                      {miner.share.toFixed(2)}%
                    </td>
                    <td className="border-t border-b border-gray-700 px-3 py-1 text-right">
                       <a
                         href={`https://3dpscan.xyz/#/blocks/${miner.lastBlockHeight}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="underline hover:text-indigo-300 font-mono"
                         >
                          {miner.lastBlockHeight}
                       </a>
                      
                      </td>
                    <td className="border-t border-b border-gray-700 px-3 py-1 text-right">
                      <span className="text-sm text-gray-400">
                      {formatLastBlockAgo(miner.lastBlockAgoMin)}
                      </span>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
            {visibleCount < filteredMiners.length && (
              <div className="text-center mt-3">
                <button
                  onClick={() => setVisibleCount(visibleCount + 100)}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Show more
                </button>
              </div>
            )}
            {showRewardsUnlockModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowRewardsUnlockModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <ValidatorRewardsUnlockForm api={api} />
             </div>
           </div>
          )}
          </>
        )}
      </div>
    </div>
   );
};
  
export default MiningLeaderboardTable;