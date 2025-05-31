import React, { useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';

const WS_ENDPOINT = 'wss://rpc.3dpass.org';

const formatP3D = (value) => (Number(value) / 10 ** 12).toFixed(4);

const ValidatorTable = () => {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState({
    sessionIndex: null,
    grandpaStatus: null,
    sessionLength: null,
    activeValidatorCount: null
  });
  const [filter, setFilter] = useState('Active'); // State for filter

  const fetchValidators = async (retries = 3) => {
    try {
      const provider = new WsProvider(WS_ENDPOINT);
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
        api.consts.validatorSet.sessionDuration,
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
      reports.forEach(([key, val]) => {
        const offenders = val.toJSON().offender || [];
        offenders.forEach(addr => {
          reportMap[addr] = true;
        });
      });

      const table = approvedValidators.map(addr => {
        const address = addr.toString();
        const isActive = actives.includes(address);
        const isCandidate = queued.includes(address);

        const lock = lockMap[address];
        const penalty = penaltyMap[address];
        const removal = removalMap[address];
        const equivocation = !!reportMap[address];

        return {
          address,
          status: isActive ? 'Active' : (isCandidate ? 'Candidate' : 'Inactive'),
          lockedUntil: lock ? lock[0] : null,
          lockedAmount: lock ? formatP3D(lock[1]) : null,
          penalty: penalty ? formatP3D(penalty) : null,
          removalBlock: removal ? removal[0] : null,
          removalReason: removal ? removal[1] : null,
          equivocation
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
  };

  const filterValidators = (validators) => {
    switch (filter) {
      case 'Active':
        return validators.filter(v => v.status === 'Active');
      case 'Candidates':
        return validators.filter(v => v.status === 'Candidate');
      case 'Inactive':
        return validators.filter(v => v.status === 'Inactive');
      case 'All':
      default:
        return validators;
    }
  };

  useEffect(() => {
    fetchValidators();
  }, []);

  const filteredValidators = filterValidators(validators);

  return (
    <div className="p-4 bg-gray text-white rounded shadow space-y-6">
      <h2 className="text-3xl font-bold text-center">Validator Set</h2>
      <div className="text-center text-sm text-gray-500">
        Session Length: {overview.sessionLength ?? '--'} blocks
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        {['Active', 'Inactive',  'Candidates', 'All'].map(option => (
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
          <div className="text-sm font-semibold text-indigo-300">Session Index</div>
          <div className="text-2xl font-extrabold">{overview.sessionIndex ?? '--'}</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">GRANDPA Status</div>
          <div className="text-lg font-bold">{overview.grandpaStatus ?? '--'}</div>
        </div>
        <div className="flex-1 border rounded bg-gray-800 px-6 py-3 space-y-1 text-center text-white">
          <div className="text-sm font-semibold text-indigo-300">Active Validators</div>
          <div className="text-lg font-bold">{overview.activeValidatorCount ?? '--'}</div>
        </div>
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
              <th className="border border-gray-700 px-3 py-1 text-left">Validator</th>
              <th className="border border-gray-700 px-3 py-1 text-left">Status</th>
              <th className="border border-gray-700 p-1">Locked</th>
              <th className="border border-gray-700 p-2">Last exit</th>
              <th className="border border-gray-700 p-2">Eq</th>
            </tr>
          </thead>
          <tbody>
            {filteredValidators.map(v => (
              <tr key={v.address} className="hover:bg-gray-800">
                <td className="border border-gray-700 p-2 font-mono">
                  <a href={`https://3dpscan.xyz/#/accounts/${v.address}`} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="underline hover:text-indigo-300 font-mono">
                    {v.address}
                  </a>
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
    </div>
  );
};

export default ValidatorTable;

