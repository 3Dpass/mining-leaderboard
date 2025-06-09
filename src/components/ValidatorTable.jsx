import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';
import ValidatorLockForm from './ValidatorLockForm';
import SetSessionKeysForm from './SetSessionKeysForm';
import ValidatorAddForm from './ValidatorAddForm';
import RejoinValidatorForm from './RejoinValidatorForm';
import ValidatorUnlockForm from './ValidatorUnlockForm';
import ValidatorRewardsUnlockForm from './ValidatorRewardsUnlockForm';
import ValidatorPayPenaltyForm from './ValidatorPayPenaltyForm';

const formatP3D = (value) => (Number(value) / 10 ** 12).toFixed(4);
const formatP3Dlocked = (value) => (Number(value) / 10 ** 12).toFixed(0);


const ValidatorTable = () => {
  const { api, connected } = usePolkadotApi();

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

  const [blockReward, setBlockReward] = useState(null);
  const [bestFinalizedBlock, setBestFinalizedBlock] = useState({ number: null });

  const [filter, setFilter] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showLockModal, setShowLockModal] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showRewardsUnlockModal, setShowRewardsUnlockModal] = useState(false);
  const [showPayPenaltyModal, setShowPayPenaltyModal] = useState(false);


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
    } catch {
      return { displayName: 'N/A', judgement: null };
    }
  }, []);

  const fetchValidators = useCallback(async (api) => {
    try {
      setLoading(true);
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
        removals.map(([key, val]) => [key.args[0].toString(), val.toJSON()])
      );

      const reportMap = {};
      reports.forEach(([_, val]) => {
        const offenders = val.toJSON().offender || [];
        offenders.forEach(addr => {
          reportMap[addr] = true;
        });
      });

      const identityPromises = approvedValidators.map(addr => fetchIdentity(addr.toString(), api));
      const identities = await Promise.all(identityPromises);

      const table = approvedValidators.map((addr, index) => {
        const address = addr.toString();
        const isActive = actives.includes(address);
        const isCandidate = queued.includes(address);
        const identity = identities[index];
        const lock = lockMap[address];
        const penalty = penaltyMap[address];
        const removal = removalMap[address];
        const equivocation = !!reportMap[address];

        return {
          address,
          displayName: identity.displayName,
          judgement: identity.judgement,
          status: isActive ? 'Active' : isCandidate ? 'Candidate' : 'Inactive',
          lockedUntil: lock ? lock[0] : null,
          lockedAmount: lock ? formatP3Dlocked(lock[1]) : null,
          penalty: penalty ? formatP3D(penalty) : null,
          removalBlock: removal ? removal[0] : null,
          removalReason: removal ? removal[1] : null,
          equivocation
        };
      });

      setValidators(table);
      setOverview({
        sessionIndex: sessionIndex.toNumber(),
        grandpaStatus: grandpaState.toString() === 'Paused' ? 'Paused' : 'Live',
        sessionLength: sessionDuration.toNumber(),
        activeValidatorCount: actives.length
      });
    } catch (err) {
      setError('Failed to load validator data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchIdentity]);

  const fetchBlockReward = useCallback(async (api) => {
    try {
      const finalizedHead = await api.rpc.chain.getFinalizedHead();
      const events = await api.query.system.events.at(finalizedHead);

      let depositCount = 0;
      for (const { event } of events) {
        if (event.section === 'balances' && event.method === 'Deposit') {
          depositCount++;
          if (depositCount === 2) {
            setBlockReward(formatP3D(event.data[1].toString()));
            return;
          }
        }
      }
      setBlockReward('0.0000');
    } catch (err) {
      console.error('Block reward fetch failed:', err);
      setBlockReward('--');
    }
  }, []);

  const fetchBestFinalizedBlock = useCallback(async (api) => {
    try {
      const head = await api.rpc.chain.getFinalizedHead();
      const block = await api.rpc.chain.getBlock(head);
      setBestFinalizedBlock({ number: block.block.header.number.toNumber() });
    } catch (err) {
      console.error('Finalized block fetch failed:', err);
    }
  }, []);

  const filterValidators = useMemo(() => {
    return validators.filter(v =>
      (filter === 'All' || v.status === filter) &&
      (v.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
       v.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [validators, filter, searchQuery]);

  useEffect(() => {
    if (!api || !connected) return;

    const load = async () => {
      await fetchValidators(api);
      await fetchBlockReward(api);
      await fetchBestFinalizedBlock(api);
    };

    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [api, connected, fetchValidators, fetchBlockReward, fetchBestFinalizedBlock]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-3xl font-bold text-center">🛡️ Validator Set</h2>
      <div className="text-center text-sm text-gray-500">
        Session Length: {overview.sessionLength ?? '--'} blocks ~ {overview.sessionLength ? (overview.sessionLength / 60).toFixed(1) : '--'}h
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        {['Active', 'Inactive', 'Candidates', 'All'].map(opt => (
          <button key={opt} onClick={() => setFilter(opt)}
            className={`px-4 py-2 rounded ${filter === opt ? 'bg-indigo-500' : 'bg-gray-700'} text-white`}>
            {opt}
          </button>
        ))}
      </div>

      <div className="flex space-x-8">
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Validator Reward</div>
          <div className="text-2xl font-extrabold">{blockReward ?? '--'}</div>
          <div className="text-sm font-light">P3D per block</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">GRANDPA Status</div>
          <div className="text-2xl font-extrabold">{overview.grandpaStatus ?? '--'}</div>
          <div className="text-sm font-light">Finalized #{bestFinalizedBlock.number ?? '--'}</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Active Validators</div>
          <div className="text-2xl font-extrabold">{overview.activeValidatorCount ?? '--'}</div>
          <div className="text-sm font-light">Session #{overview.sessionIndex ?? '--'}</div>
        </div>
      </div>

      <div className="border rounded bg-gray-800 px-3 py-3">   
      <div className="mb-4">
        <div className="text-center">
        <button
          onClick={() => setShowLockModal(true)}
          className="px-4 py-2 mr-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          🔒 Lock
       </button>

       <button
          onClick={() => setShowAddModal(true)}
          className="mr-2 px-4 py-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          ➕ Join
       </button>

       <button
          onClick={() => setShowKeysModal(true)}
          className="mr-2 mb-2 px-4 py-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          🔑 Set Keys
       </button>

       <button
          onClick={() => setShowRejoinModal(true)}
          className="mr-2 mb-2 px-4 py-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          🔁 Rejoin
       </button>

        <button
          onClick={() => setShowUnlockModal(true)}
          className="px-4 py-2 mr-2 mb-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          🔓 Unlock
       </button>

        <button
          onClick={() => setShowRewardsUnlockModal(true)}
          className="px-4 py-2 mr-2 mb-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          💰 Claim
       </button>

        <button
          onClick={() => setShowPayPenaltyModal(true)}
          className="px-4 py-2 mr-2 mb-2 bg-gray-600 hover:bg-indigo-700 text-white rounded"
          >
          🚨 Penalty
       </button>
    
      </div>

        <input
          className="px-4 py-2 rounded bg-gray-700 text-white"
          placeholder="Search address or name"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-sm">Loading validators...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-t border-b border-gray-700 text-white text-sm">
            <thead>
              <tr className="border-t border-b border-gray-700 px-3 py-1 text-left text-gray-400">
                <th className="border-t border-b border-gray-700 px-3 py-1 text-left text-gray-400">Validator</th>
                <th className="border-t border-b border-gray-700 px-3 py-1 text-left text-gray-400">Status</th>
                <th className="border-t border-b border-gray-700 p-1 text-right text-gray-400">Collateral</th>
                <th className="border-t border-b border-gray-700 p-2 text-right text-gray-400">Last exit</th>
                <th className="border-t border-b border-gray-700 p-2 text-right text-gray-400">Eq</th>
              </tr>
            </thead>
            <tbody>
              {filterValidators.slice(0, visibleCount).map(v => (
                <tr key={v.address} className="hover:bg-gray-700">
                  <td className="px-2 py-1 font-mono">
                    <a href={`https://3dpscan.xyz/#/accounts/${v.address}`} 
                       target="_blank" 
                       rel="noreferrer" 
                       className="underline hover:text-indigo-300 font-mono">{v.address}
                    </a>
                    <div className="text-xs text-gray-400">
                      {v.judgement === 'Reasonable' ? '✅' :
                       v.judgement === 'Erroneous' ? '🚫' :
                       v.judgement === 'FeePaid' ? '🧾' :
                       v.judgement === 'KnownGood' ? '👤✅' :
                       v.judgement === 'OutOfDate' ? '👤⚠️' : '❓'} {v.displayName}
                    </div>
                  </td>
                  <td className="border-t border-b border-gray-700 p-2 text-center text-sm text-gray-400">
                    {v.status}
                  </td>
                  <td className="border-t border-b border-gray-700 p-1 text-right">
                    {v.lockedAmount ?? '--'} P3D {" "}
                   <span className="text-sm text-gray-400">
                      until #{v.lockedUntil ?? '--'} {" "} 
                    <span className="text-sm text-orange-400" title="Penalty">
                      {v.penalty ? `🔻 ${v.penalty} P3D` : '🟢'}
                    </span>
                   </span>
                  </td>
                  <td className="border-t border-b border-gray-700 p-2 text-right">
                    <a href={`https://3dpscan.xyz/#/blocks/${v.removalBlock ? `${v.removalBlock}` : '--'}?tab=events&page=1`} 
                       target="_blank" 
                       rel="noreferrer" 
                       className="underline hover:text-indigo-300 font-mono">
                      {v.removalBlock ? `${v.removalBlock}` : ''}
                    </a>

                     {" "}
                    <span className="text-sm text-gray-400">
                     {v.removalBlock ? `(${v.removalReason})` : '--'}
                     </span>
                  </td>
                  <td className="text-center">{v.equivocation ? '⚠️' : '✅'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleCount < filterValidators.length && (
            <div className="text-center mt-3">
              <button onClick={() => setVisibleCount(vc => vc + 100)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
                Show more
              </button>
            </div>
          )}
          {showLockModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowLockModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <ValidatorLockForm/>
             </div>
           </div>
          )}

          {showAddModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowAddModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <ValidatorAddForm/>
             </div>
           </div>
          )}

          {showKeysModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
           <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
             <SetSessionKeysForm onClose={() => setShowKeysModal(false)} />
          </div>
         </div>
        )}

         {showRejoinModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowRejoinModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <RejoinValidatorForm/>
             </div>
           </div>
          )}

           {showUnlockModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowUnlockModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <ValidatorUnlockForm/>
             </div>
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
                <ValidatorRewardsUnlockForm/>
             </div>
           </div>
          )}

          {showPayPenaltyModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
             <div className="bg-gray-900 text-white p-6 rounded-lg max-w-lg w-full shadow-xl relative">
                <button
                 onClick={() => setShowPayPenaltyModal(false)}
                  className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
                 >
                 ✖
               </button>
                <ValidatorPayPenaltyForm/>
             </div>
           </div>
          )}

        </div>
      )}
    </div>
    </div>
  );
};

export default ValidatorTable;