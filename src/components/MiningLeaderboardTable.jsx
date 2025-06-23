import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import ShareChart from './ShareChart';
import HashrateChart from './HashrateChart';
import ValidatorRewardsUnlockForm from './ValidatorRewardsUnlockForm';
import config from '../config';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 1000;
const cacheStore = new Map();

// Storage configuration
const BLOCK_STORAGE_KEY = 'mining_leaderboard_blocks';
const MAX_STORED_BLOCKS = 1440; // Store last 24 hours of blocks
const BLOCK_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Utility functions
const getStoredBlocks = () => {
  try {
    const stored = localStorage.getItem(BLOCK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return {};
  }
};

const storeBlock = (block) => {
  try {
    const storedBlocks = getStoredBlocks();
    
    // Create a clean version of the block without the last log
    const cleanBlock = {
      height: block.height,
      time: block.time,
      digest: {
        logs: block.digest.logs.slice(0, -1)
      }
    };

    storedBlocks[block.height] = cleanBlock;
    
    // Keep only the most recent MAX_STORED_BLOCKS
    const blockHeights = Object.keys(storedBlocks).map(Number);
    if (blockHeights.length > MAX_STORED_BLOCKS) {
      const oldestBlocks = blockHeights
        .sort((a, b) => a - b)
        .slice(0, blockHeights.length - MAX_STORED_BLOCKS);
      
      oldestBlocks.forEach(height => {
        delete storedBlocks[height];
      });
    }

    // Use requestAnimationFrame for non-blocking storage
    requestAnimationFrame(() => {
      localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(storedBlocks));
    });
  } catch (error) {
    console.error('Error storing block in localStorage:', error);
  }
};

const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithCache(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

async function fetchWithCache(url) {
  const now = Date.now();
  const cached = cacheStore.get(url);

  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  
  // Implement cache size limit
  if (cacheStore.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cacheStore.keys().next().value;
    cacheStore.delete(oldestKey);
  }
  
  cacheStore.set(url, { data, timestamp: now });
  return data;
}

const fetchBlockRewardWithRetry = async (initialHeight, retries = 20) => {
  for (let i = 0; i <= retries; i++) {
    const targetBlock = initialHeight - i;
    try {
      const eventData = await fetchWithCache(
        `${config.API_BASE}/events?section=balances&method=Deposit&is_extrinsic=false&time_dimension=block&block_start=${targetBlock}&page=0`
      );

      for (const item of eventData.items || []) {
        for (const arg of item.args || []) {
          if (arg.name === 'amount') {
            const raw = arg.value;
            const reward = Number(raw) / 10 ** 12;
            return reward.toFixed(4);
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching block reward for block ${targetBlock}:`, err);
    }
  }
  return 'N/A';
};

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

const MiningLeaderboardTable = ({ api }) => {
  const [loading, setLoading] = useState(true);
  const [allMiners, setAllMiners] = useState([]);
  const [visibleCount, setVisibleCount] = useState(100);
  const [blockReward, setBlockReward] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [estimatedHashrate, setEstimatedHashrate] = useState(null);
  const [perBlockHashrate, setPerBlockHashrate] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRewardsUnlockModal, setShowRewardsUnlockModal] = useState(false);
  const [failedBlocks, setFailedBlocks] = useState([]);
  const [showFailedBlocks, setShowFailedBlocks] = useState(false);

  // Memoized filtered miners
  const filteredMiners = useMemo(() => 
    allMiners.filter(miner => 
      miner.address.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [allMiners, searchQuery]
  );

  const totalMinersCount = allMiners.length;

  // Memoized chart data
  const chartData = useMemo(() => {
    const totalBlocks = allMiners.reduce((acc, miner) => acc + miner.blocks, 0) || 1;
    const getGroupShare = (start, end) => (
      (allMiners.slice(start, end).reduce((acc, miner) => acc + miner.blocks, 0) / totalBlocks) * 100
    );

    return [
      { name: 'Top 10', value: getGroupShare(0, 10) },
      { name: '11-50', value: getGroupShare(10, 50) },
      { name: '51-100', value: getGroupShare(50, 100) },
      { name: '101-200', value: getGroupShare(100, 200) },
      { name: '201-400', value: getGroupShare(200, 400) },
      { name: 'Rest', value: getGroupShare(400, allMiners.length) },
    ];
  }, [allMiners]);

  // Memoized format functions
  const formatLastBlockAgo = useCallback((blocksAgo) => {
    const minutesAgo = blocksAgo;
    if (minutesAgo < 1) return '<1 min ago';
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }, []);

  const formatHashrate = useCallback((value) => {
    if (!value || value <= 0) return '0 H/s';
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
    let i = 0;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }, []);

  // Fetch blocks with optimized batching
  const fetchBlocks = useCallback(async () => {
    try {
      const overview = await fetchWithRetry(`${config.API_BASE}/overview`);
      const { latestHeight } = overview;
      const storedBlocks = getStoredBlocks();
      
      console.log('Stored blocks count:', Object.keys(storedBlocks).length);
      
      const failedBlocks = [];
      const blockPromises = [];
      const batchSize = 50; // Process blocks in batches

      // Create batches of block heights to fetch
      for (let i = 0; i < 1440; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, 1440 - i) }, (_, j) => {
          const blockHeight = latestHeight - (i + j);
          return storedBlocks[blockHeight] || 
            fetchWithRetry(`${config.API_BASE}/blocks/${blockHeight}`)
              .then(block => {
                if (block) {
                  storeBlock(block);
                }
                return block;
              })
              .catch((error) => {
                console.warn(`Failed to fetch block ${blockHeight}:`, error);
                failedBlocks.push(blockHeight);
                return null;
              });
        });
        blockPromises.push(...batch);
      }

      const blocks = await Promise.all(blockPromises);
      const validBlocks = blocks.filter(block => block !== null);

      // Process blocks in chunks
      const processBlocksInChunks = (blocks, chunkSize = 100) => {
        const chunks = [];
        for (let i = 0; i < blocks.length; i += chunkSize) {
          chunks.push(blocks.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const hashrateData = [];
      const authorCounts = {};
      const lastBlockHeightByAuthor = {};

      // Process blocks in chunks
      const chunks = processBlocksInChunks(validBlocks);
      for (const chunk of chunks) {
        chunk.forEach(block => {
          const digest = block?.digest?.logs || [];
          const seenAuthors = new Set();

          digest.forEach(log => {
            if (log.preRuntime) {
              const rawAuthor = log.preRuntime[1];
              try {
                const address = encodeAddress(hexToU8a(rawAuthor), config.SS58_PREFIX);
                
                if (!seenAuthors.has(address)) {
                  authorCounts[address] = (authorCounts[address] || 0) + 1;
                  seenAuthors.add(address);

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

          const difficulty = extractDifficultyFromBlock(block);
          if (difficulty && difficulty > 0) {
            const hashrate = difficulty / 60;
            hashrateData.push({
              height: block.height,
              timestamp: block.time || Date.now(),
              hashrate,
            });
          }
        });
      }

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

      // Update state in a single batch
      requestAnimationFrame(() => {
        setAllMiners(sorted);
        setPerBlockHashrate(
          hashrateData.filter(item => typeof item.hashrate === 'number' && item.hashrate > 0).reverse()
        );
        setFailedBlocks(failedBlocks.length > 0 ? failedBlocks : []);
        setLoading(false);
      });

    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      setFailedBlocks([]);
      setLoading(false);
    }
  }, []);

  // Initial fetch and interval setup
  useEffect(() => {
    fetchBlocks();

    const interval = setInterval(fetchBlocks, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  // Cleanup interval for old blocks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const storedBlocks = getStoredBlocks();
      const now = Date.now();
      const blockHeights = Object.keys(storedBlocks).map(Number);
      
      // Remove blocks older than 24 hours
      blockHeights.forEach(height => {
        const block = storedBlocks[height];
        if (now - block.time > BLOCK_CLEANUP_INTERVAL) {
          delete storedBlocks[height];
        }
      });

      localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(storedBlocks));
    }, BLOCK_CLEANUP_INTERVAL);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Fetch block reward
  useEffect(() => {
    const fetchBlockReward = async () => {
      try {
        const overviewRes = await fetchWithRetry(`${config.API_BASE}/overview`);
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
        const overviewRes = await fetchWithRetry(`${config.API_BASE}/overview`);
        const { finalizedHeight } = overviewRes;
    
        // Try to get the block with retries
        let blockRes = null;
        let attempts = 0;
        const maxAttempts = 3;
    
        while (attempts < maxAttempts) {
          try {
            blockRes = await fetchWithRetry(`${config.API_BASE}/blocks/${finalizedHeight - attempts}`);
            if (blockRes) break;
          } catch (err) {
            console.warn(`Attempt ${attempts + 1} failed to fetch block ${finalizedHeight - attempts}:`, err);
            attempts++;
          }
        }
    
        if (!blockRes) {
          console.warn('Could not fetch any recent blocks for difficulty calculation');
          setDifficulty(null);
          setEstimatedHashrate(null);
          return;
        }
    
        const sealLog = blockRes?.digest?.logs?.find(log => log.seal);
        const seal = sealLog?.seal;
    
        if (seal && seal.length > 1) {
          const sealHex = seal[1].replace(/^0x/, '');
          const difficultyHexLE = sealHex.slice(0, 8);
          const diff = parseInt(difficultyHexLE.match(/../g).reverse().join(''), 16);
          setDifficulty(diff);
    
          const blockTimeSeconds = 60;
          const estimated = diff / blockTimeSeconds;
          setEstimatedHashrate(estimated);
        } else {
          console.warn('No valid seal found in block for difficulty calculation');
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">⛏️ 24h Mining Leaderboard</h1>
      
      {/* Stats Cards */}
      <div className="flex space-x-8">
        <div className="flex-1 border border-[0.5px] rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Author block reward</div>
          <div className="text-2xl font-extrabold">{blockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border border-[0.5px] rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Difficulty</div>
          <div className="text-2xl font-extrabold">{difficulty ?? '--'}</div>
          <div className="text-sm font-light">Hashrate: ~ {estimatedHashrate ? formatHashrate(estimatedHashrate) : '--'}</div>
        </div>
        <div className="flex-1 border border-[0.5px] rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Authors</div>
          <div className="text-2xl font-extrabold">{totalMinersCount > 0 ? totalMinersCount : '--'}</div>
          <div className="text-sm font-light">Last 24h total</div>
        </div>
      </div>

      {/* Charts */}
      <div className="border border-[0.5px] rounded bg-gray-800 px-6 py-3 text-white">
        <h2 className="text-white font-semibold text-lg mb-4">Estimated Hashrate (24h)</h2>
        <HashrateChart data={perBlockHashrate} />
      </div>

      <div className="border border-[0.5px] rounded bg-gray-800 px-6 py-3 text-white">
        <h2 className="text-white font-semibold text-lg mb-4">Authors Share Chart (24h)</h2>
        <ShareChart data={chartData} />
      </div>

      {/* Main Table */}
      <div className="border border-[0.5px] rounded bg-gray-800 px-3 py-3">
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

            {/* Failed Blocks Section */}
            {failedBlocks.length > 0 && (
              <div className="mt-4 p-4 border border-[0.5px] rounded bg-gray-800 text-white">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-indigo-300">
                    Failed to fetch {failedBlocks.length} blocks from Explorer
                  </h3>
                  <button
                    onClick={() => setShowFailedBlocks(!showFailedBlocks)}
                    className="text-xs text-gray-400 hover:text-indigo-300"
                  >
                    {showFailedBlocks ? '(-) Hide' : '(+) Show'}
                  </button>
                </div>
                {showFailedBlocks && (
                  <div className="flex flex-wrap gap-2">
                    {failedBlocks.map((blockHeight) => (
                      <a
                        key={blockHeight}
                        href={`https://3dpscan.xyz/#/blocks/${blockHeight}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-indigo-300"
                      >
                        {blockHeight}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative border border-[0.5px]">
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