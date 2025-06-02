import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';

const formatP3D = (value) => (Number(value) / 10 ** 12).toFixed(4);

const ValidatorTable = () => {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(100);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState({
    sessionIndex: null,
    grandpaStatus: null,
    sessionLength: null,
    activeValidatorCount: null
  });

  const [blockReward, setBlockReward] = useState(null); // State for block reward
  const [bestFinalizedBlock, setBestFinalizedBlock] = useState({ number: null, hash: null }); // State for best finalized block

  const [filter, setFilter] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIdentity = useCallback(async (address, api) => {
    try {
      const identityOpt = await api.query.identity.identityOf(address);
      if (identityOpt.isSome) {
        const identity = identityOpt.unwrap();
        const display = identity.info.display;

        if (display.isRaw) {
          return {
            displayName: display.asRaw.toUtf8(),
            judgement: identity.judgements[0]?.[1]?.toString() || null
          };
        }
      }
      return { displayName: 'N/A', judgement: null };
    } catch (err) {
      console.error(`Error fetching identity for ${address}:`, err);
      return { displayName: 'N/A', judgement: null };
    }
  }, []);

  const fetchValidators = useCallback(async (retries = 3) => {
    try {
      const provider = new WsProvider(config.websocketEndpoint);
      const api = await ApiPromise.create({ provider });

      const [
        sessionIndex,
        grandpaState,
        sessionDuration,
        approvedValidators,
        activeValidators,
        candidates,
        locks,
        penalties,
        removals,
        reports
      ] = await Promise.all([
        api.query.session.currentIndex(),
        api.query.grandpa.state(),
        api.query.validatorSet.sessionDuration(),
        api.query.validatorSet.approvedValidators(),
        api.query.session.validators(),
        api.query.validatorSet.candidates(),
        api.query.validatorSet.validatorLock.entries(),
        api.query.validatorSet.penalty.entries(),
        api.query.validatorSet.accountRemoveReason.entries(),
        api.query.offences.reports.entries()
      ]);

      const actives = activeValidators.map(a => a.toString());
      const queued = candidates.map(a => a.toString());

      const lockMap = Object.fromEntries(
        locks.map(([key, val]) => [key.args[0].toString(), val.toJSON()])
      );

      const penaltyMap = Object.fromEntries(
        penalties.map(([key, val]) => [key.args[0].toString(), val.toString()])
      );

      const removalMap = Object.fromEntries(
        removals.map(([key, val]) =>
        [key.args[0].toString(), val.toJSON()])
      );

      const reportMap = {};
      reports.forEach(([key, val]) => {
        const offenders = val.toJSON().offender || [];
        offenders.forEach(addr => {
          reportMap[addr] = true;
        });
      });

      // Fetch identities for each approved validator
      const identityPromises = approvedValidators.map(addr => fetchIdentity(addr.toString(), api));
      const identities = await Promise.all(identityPromises);

      const table = approvedValidators.map((addr, index) => {
        const address = addr.toString();
        const isActive = actives.includes(address);
        const isCandidate = queued.includes(address);

        const lock = lockMap[address];
        const penalty = penaltyMap[address];
        const removal = removalMap[address];
        const equivocation = !!reportMap[address];

        const identity = identities[index];
        const displayName = identity.displayName;
        const judgement = identity.judgement;

        return {
          address,
          displayName,
          status: isActive ? 'Active' : (isCandidate ? 'Candidate' : 'Inactive'),
          lockedUntil: lock ? lock[0] : null,
          lockedAmount: lock ? formatP3D(lock[1]) : null,
          penalty: penalty ? formatP3D(penalty) : null,
          removalBlock: removal ? removal[0] : null,
          removalReason: removal ? removal[1] : null,
          equivocation,
          judgement
        };
      });

      setValidators(table);
      setOverview({
        sessionIndex: sessionIndex ? sessionIndex.toNumber() : null,
        grandpaStatus: grandpaState ? (grandpaState.toString() === 'Paused' ? 'Paused' : 'Live') : null,
        sessionLength: sessionDuration ? sessionDuration.toNumber() : null,
        activeValidatorCount: actives.length
      });
    } catch (err) {
      console.error('Error loading validator data:', err.message || err);
      if (retries > 0) {
        console.log(`Retrying... (${3 - retries + 1})`);
        await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds before retrying
        return fetchValidators(retries - 1);
      }
      setError('Failed to load validator data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [fetchIdentity]);

  const fetchBlockReward = useCallback(async (api) => {
    try {
      const lastBlock = await api.rpc.chain.getFinalizedHead();
      const block = await api.rpc.chain.getBlock(lastBlock);
      const events = await api.query.system.events.at(lastBlock);

      let reward = null;

      // Loop through events to find the second `balances.Deposit` event
      let depositCount = 0;
      events.forEach(({ event }) => {
        if (event.section === 'balances' && event.method === 'Deposit') {
          depositCount++;
          if (depositCount === 2) { // Get the second Deposit event
            reward = event.data[1].toString(); // amount: u128
          }
        }
      });

      setBlockReward(formatP3D(reward)); // Format and set the block reward
    } catch (err) {
      console.error('Error fetching block reward:', err);
      setError('Failed to load block reward. Please try again later.');
    }
  }, []);

    const fetchBestFinalizedBlock = useCallback(async (api) => {
    try {
      const lastBlock = await api.rpc.chain.getFinalizedHead();
      const block = await api.rpc.chain.getBlock(lastBlock);
      const blockNumber = block.block.header.number.toNumber();
      const blockHash = block.block.header.hash.toString();

      setBestFinalizedBlock({ number: blockNumber, hash: blockHash }); // Set the best finalized block
    } catch (err) {
      console.error('Error fetching best finalized block:', err);
      setError('Failed to load best finalized block. Please try again later.');
    }
  }, []);
  
  const filterValidators = useMemo(() => {
    return validators.filter(v => {
      const matchesStatus = filter === 'All' || v.status === filter;
      const matchesSearch = 
        v.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [validators, filter, searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      const provider = new WsProvider(config.websocketEndpoint);
      const api = await ApiPromise.create({ provider });
      await fetchValidators();
      await fetchBlockReward(api);
      await fetchBestFinalizedBlock(api); // Fetch the best finalized block
    };
    fetchData();

  const intervalId = setInterval(fetchData, 300000); // Refresh every 5 minutes

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchValidators, fetchBlockReward, fetchBestFinalizedBlock]);

  return (
    <div className="p-4 bg-gray text-white rounded shadow space-y-6">
      <h2 className="text-3xl font-bold text-center">Validator Set</h2>
      <div className="text-center text-sm text-gray-500">
        Session Length: {overview.sessionLength ?? '--'} {" "}
        blocks ~ {(overview.sessionLength !== undefined && 
        overview.sessionLength !== null
        ) ? (
        overview.sessionLength / 60) : '--'}h
      </div>
      <div className="flex justify-center space-x-4 mb-4">
        {['Active', 'Inactive', 'Candidates', 'All'].map(option => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-4 py-2 rounded ${filter === option ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex space-x-8">
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Validator reward</div>
          <div className="text-2xl font-bold">{blockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">GRANDPA status</div>
          <div className="text-2xl font-bold">{overview.grandpaStatus ?? '--'}</div>
          <div className="text-sm font-light">Finalized block #{bestFinalizedBlock.number ?? '--'}</div>
        </div>
               <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Active validators</div>
          <div className="text-2xl font-bold">{overview.activeValidatorCount ?? '--'}</div>
          <div className="text-sm font-light">Session #{overview.sessionIndex ?? '--'}</div>
        </div>
      </div>

      <div className="border rounded bg-gray-800 px-6 py-3">
        <h2 className="text-white font-semibold text-lg mb-4">Validators</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by address or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded bg-gray-700 text-white"
          />
        </div>

        {loading ? (
          <div className="text-center">
            <p>Loading validator data...</p>
            {/* You can add a spinner here if desired */}
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">
            <p>{error}</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-700 text-white text-sm">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-3 py-1 text-left">Address</th>
                <th className="border border-gray-700 px-3 py-1 text-left">Status</th>
                <th className="border border-gray-700 p-1">Locked</th>
                <th className="border border-gray-700 p-2">Last exit</th>
                <th className="border border-gray-700 p-2">Eq</th>
              </tr>
            </thead>
            <tbody>
              {filterValidators.slice(0, visibleCount).map(v => (
                <tr key={v.address} className="hover:bg-gray-700">
                  <td className="border border-gray-700 p-2 font-mono">
                    <a href={`https://3dpscan.xyz/#/accounts/${v.address}`} 
                       target="_blank" 
                       rel="noreferrer" 
                       className="underline hover:text-indigo-300 font-mono">
                      {v.address}
                    </a>
                    <div className="text-sm text-gray-400">
                      {v.judgement === 'Reasonable' ? (
                        <span role="img" aria-label="OK">✅</span>
                      ) : v.judgement === 'Erroneous' ? (
                        <span role="img" aria-label="Erroneous">🚫</span>
                      ) : v.judgement === 'FeePaid' ? (
                        <span role="img" aria-label="FeePaid">🧾</span>
                      ) : v.judgement === 'KnownGood' ? (
                        <span role="img" aria-label="KnownGood">👤✅</span>
                      ) : v.judgement === 'OutOfDate' ? (
                        <span role="img" aria-label="OutOfDate">👤⚠️</span>
                      ) : (
                        <span role="img" aria-label="Unknown">❓</span>
                      )}
                      {" "}
                      {v.displayName}
                    </div>
                  </td>
                  <td className="border border-gray-700 p-2 text-center">{v.status}</td>
                  <td className="border border-gray-700 p-1 text-left">
                    P3D: {v.lockedAmount ?? '--'} Until # {v.lockedUntil ?? '--'} Penalty: {v.penalty ?? '🟢'}
                  </td>
                  <td className="border border-gray-700 p-2 text-center">
                    {v.removalBlock ? `${v.removalBlock} (${v.removalReason})` : '--'}
                  </td>
                  <td className="border border-gray-700 p-2 text-center">{v.equivocation ? '⚠️' : '✅'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {visibleCount < filterValidators.length && (
          <div className="text-center mt-3">
            <button
              onClick={() => setVisibleCount(visibleCount + 100)}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
           
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidatorTable;

