import React, { useEffect, useState } from 'react';
import ShareChart from './components/ShareChart';
import { encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import ValidatorTable from './components/ValidatorTable';


const API_BASE = 'https://api.3dpscan.xyz';
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

const App = () => {
  const [loading, setLoading] = useState(true);
  const [allMiners, setAllMiners] = useState([]);
  const [visibleCount, setVisibleCount] = useState(100);
  const [blockReward, setBlockReward] = useState(null);
  const [validatorBlockReward, setValidatorBlockReward] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [estimatedHashrate, setEstimatedHashrate] = useState(null);

  // Fetch leaderboard miners
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const overview = await fetchWithCache(`${API_BASE}/overview`);
        const { latestHeight } = overview;

        // Fetch 1440 blocks concurrently with caching
        const blockPromises = Array.from({ length: 1440 }, (_, i) =>
          fetchWithCache(`${API_BASE}/blocks/${latestHeight - i}`)
        );
        const blocks = await Promise.all(blockPromises);

        const authorCounts = {};
        const lastBlockHeightByAuthor = {};

        blocks.forEach(block => {
          const digest = block?.digest?.logs || [];
          digest.forEach(log => {
            if (log.preRuntime) {
              const rawAuthor = log.preRuntime[1];
              try {
                const address = encodeAddress(hexToU8a(rawAuthor), PREFIX);
                authorCounts[address] = (authorCounts[address] || 0) + 1;

                if (
                  !lastBlockHeightByAuthor[address] ||
                  block.height > lastBlockHeightByAuthor[address]
                ) {
                  lastBlockHeightByAuthor[address] = block.height;
                }
              } catch (e) {
                console.warn('Invalid public key:', rawAuthor);
              }
            }
          });
        });

        const totalBlocks = blocks.length;

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
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      }
    };

    fetchBlocks();
    const interval = setInterval(fetchBlocks, 300000);
    return () => clearInterval(interval);
  }, []);

  // Fetch miner block reward
  useEffect(() => {
    const fetchBlockReward = async () => {
      try {
        const overviewRes = await fetchWithCache(`${API_BASE}/overview`);
        const { finalizedHeight } = overviewRes;

        const targetBlock = finalizedHeight - 10;

        const eventData = await fetchWithCache(
          `${API_BASE}/events?section=balances&method=Deposit&is_extrinsic=false&time_dimension=block&block_start=${targetBlock}&page=0`
        );

        // Loop through items and extract Deposit amount
        for (const item of eventData.items || []) {
          for (const arg of item.args || []) {
            if (arg.name === 'amount') {
              const raw = arg.value;
              const reward = Number(raw) / 10 ** 12;
              setBlockReward(reward.toFixed(4));
              return;
            }
          }
        }

        // If no reward found
        setBlockReward('N/A');
      } catch (err) {
        console.error('Error fetching block reward:', err);
        setBlockReward('N/A');
      }
    };

    fetchBlockReward();
  }, []);

  // Fetch validator block reward (second Deposit event)
  useEffect(() => {
    const fetchValidatorBlockReward = async () => {
      try {
        const overviewRes = await fetchWithCache(`${API_BASE}/overview`);
        const { finalizedHeight } = overviewRes;

        const targetBlock = finalizedHeight - 10;

        const eventData = await fetchWithCache(
          `${API_BASE}/events?section=balances&method=Deposit&is_extrinsic=false&time_dimension=block&block_start=${targetBlock}&page=0`
        );

        if (eventData.items && eventData.items.length > 1) {
          const secondEvent = eventData.items[1]; // 2nd Deposit event
          const amountArg = secondEvent.args.find(arg => arg.name === 'amount');

          if (amountArg?.value) {
            const rewardP3D = Number(amountArg.value) / 10 ** 12;
            setValidatorBlockReward(rewardP3D.toFixed(4));
          }
        }
      } catch (error) {
        console.error('Failed to fetch validator block reward:', error);
      }
    };

    fetchValidatorBlockReward();
  }, []);

  // Fetch difficulty
    useEffect(() => {
    const fetchDifficulty = async () => {
      try {
        const overviewRes = await fetchWithCache(`${API_BASE}/overview`);
        const { finalizedHeight } = overviewRes;
        const blockRes = await fetchWithCache(`${API_BASE}/blocks/${finalizedHeight}`);

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
      <div className="bg-gray-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex space-x-6 justify-center font-medium text-sm">
          <img src="/img/3dpass_logo_white.png"  width={24} height={24}  alt="" />
          <a href="https://3dpass.org/mainnet" target="_blank" rel="noopener noreferrer" className="hover:underline">
            How to mine P3D
          </a>
          <a href="https://3dpass.org/mainnet#validator" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Validator
          </a>
          <a href="https://wallet.3dpass.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Wallet
          </a>
          <a href="https://3dpscan.xyz/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Explorer
          </a>
          <a href="https://3dpass.network/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Telemetry
          </a>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-center">⛏️ 24H Mining Leaderboard</h1>
      <div className="text-center text-sm text-gray-500">
        Block Target Time: 60 sec 
      </div>

      <div className="flex space-x-8">
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Author block reward</div>
          <div className="text-2xl font-extrabold">{blockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Validator block reward</div>
          <div className="text-2xl font-extrabold">{validatorBlockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Difficulty</div>
          <div className="text-2xl font-extrabold">{difficulty ?? '--'}</div>
          <div className="text-sm font-light">Hashrate: ~ {estimatedHashrate ? formatHashrate(estimatedHashrate) : '--'}</div>
        </div>
      </div>

      <div className="border rounded bg-gray-800 px-6 py-3 text-white">
        <ShareChart data={chartData} />
      </div>

      <div className="border rounded bg-gray-800 px-6 py-3">
        <h2 className="text-white font-semibold text-lg mb-4">Block Authors</h2>
        {loading ? (
          <p className="text-white">Loading...</p>
        ) : (
          <>
            <table className="w-full border-collapse border border-gray-700 text-white text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-1 text-left">Rank</th>
                  <th className="border border-gray-700 px-3 py-1 text-left">Author</th>
                  <th className="border border-gray-700 px-3 py-1 text-right">Blocks</th>
                  <th className="border border-gray-700 px-3 py-1 text-right">(%)</th>
                  <th className="border border-gray-700 px-3 py-1 text-right">Last</th>
                  <th className="border border-gray-700 px-3 py-1 text-right">Mined</th>
                </tr>
              </thead>
              <tbody>
                {allMiners.slice(0, visibleCount).map(miner => (
                  <tr key={miner.address} className="hover:bg-gray-700">
                    <td className="border border-gray-700 px-3 py-1">{miner.rank}</td>
                    <td className="border border-gray-700 px-3 py-1">
                        <a
                         href={`https://3dpscan.xyz/#/accounts/${miner.address}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="underline hover:text-indigo-300 font-mono"
                         >
                          {miner.address}
                       </a>
                    </td>
                    <td className="border border-gray-700 px-3 py-1 text-right">{miner.blocks}</td>
                    <td className="border border-gray-700 px-3 py-1 text-right">{miner.share.toFixed(2)}</td>
                    <td className="border border-gray-700 px-3 py-1 text-right">
                       <a
                         href={`https://3dpscan.xyz/#/blocks/${miner.lastBlockHeight}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="underline hover:text-indigo-300 font-mono"
                         >
                          {miner.lastBlockHeight}
                       </a>
                      
                      </td>
                    <td className="border border-gray-700 px-3 py-1 text-right">{formatLastBlockAgo(miner.lastBlockAgoMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleCount < allMiners.length && (
              <div className="text-center mt-3">
                <button
                  onClick={() => setVisibleCount(visibleCount + 100)}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="border rounded bg-gray-800 px-6 py-3">
      <ValidatorTable />
      </div>
      <footer className="text-center text-sm text-gray-500 mt-12 py-6">
        <div className="flex justify-center space-x-6">
          <a href="https://github.com/3Dpass/mining-leaderboard" target="_blank" rel="noopener noreferrer" className="hover:underline">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
