import React, { useState } from 'react';
import ValidatorTable from './components/ValidatorTable';
import MiningLeaderboardTable from './components/MiningLeaderboardTable';

const App = () => {
  const [showMining, setShowMining] = useState(true);
  const [showValidators, setShowValidators] = useState(true);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-gray-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex space-x-6 justify-center font-medium text-sm">
          <img src="/img/3dpass_logo_white.png" width={24} height={24} alt="3DPass Logo" />
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

      {/* Toggle Buttons */}
      <div className="flex justify-center space-x-4 mb-4">
        <button
          onClick={() => setShowMining(!showMining)}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          {showMining ? 'Mining Leaderboard ON' : 'Mining Leaderboard OFF'}
        </button>
        <button
          onClick={() => setShowValidators(!showValidators)}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          {showValidators ? 'Validator Set ON' : 'Validator Set OFF'}
        </button>
      </div>

      {/* Mining Content */}
      {showMining && (
        <div>
          <MiningLeaderboardTable />
        </div>
      )}

      {/* Validators Content */}
      {showValidators && (
        <div>
          <ValidatorTable />
        </div>
      )}

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