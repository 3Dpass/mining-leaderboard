import React, { useState } from 'react';
import ValidatorTable from './components/ValidatorTable';
import MiningLeaderboardTable from './components/MiningLeaderboardTable';
import NetworkInfo from './components/NetworkInfo';
import NetworkState from './components/NetworkState';
import config from './config';

const App = () => {
  const [showMining, setShowMining] = useState(true);
  const [showValidators, setShowValidators] = useState(false);
  const [miningButtonClass, setMiningButtonClass] = useState('bg-gray-900 text-white font-semibold');
  const [validatorsButtonClass, setValidatorsButtonClass] = useState('bg-gray-900 text-gray-400');

  const toggleMining = () => {
    const nextState = !showMining;
    setShowMining(nextState);
    setMiningButtonClass(nextState ? 'bg-gray-900 text-white font-semibold' : 'bg-gray-900 text-gray-400');
    // Turn off Validators when Mining is turned on
    if (nextState) {
      setShowValidators(false);
      setValidatorsButtonClass('bg-gray-900 text-gray-400');
    }
  };

  const toggleValidators = () => {
    const nextState = !showValidators;
    setShowValidators(nextState);
    setValidatorsButtonClass(nextState ? 'bg-gray-900 text-white font-semibold' : 'bg-gray-900 text-gray-400');
    // Turn off Mining when Validators is turned on
    if (nextState) {
      setShowMining(false);
      setMiningButtonClass('bg-gray-900 text-gray-400');
    }
  };

  return (
 <div className="w-full max-w-6xl mx-auto p-2 space-y-4">
  <div className="bg-gray-900 text-gray-400 p-2 shadow-md">
    <div className="max-w-8xl mx-auto flex items-center justify-center space-x-6 font-medium text-sm">
      <img 
        src="/img/3dpass_logo_white.png" 
        className="w-6 h-6 hidden sm:block" 
        alt="3DPass Logo" 
      />
      <NetworkInfo />
      
      {/* Toggle Buttons */}
      <button
        aria-pressed={showMining}
        onClick={toggleMining}
        className={`px-1 py-2 rounded ${miningButtonClass} hover:bg-gray-900 hover:underline text-sm`}
        aria-label={showMining ? 'Turn off mining board' : 'Turn on mining board'}
      >
        {showMining ? 'Mining dashboard' : 'Mining dashboard'}
      </button>
      <button
        aria-pressed={showValidators}
        onClick={toggleValidators}
        className={`px-1 py-2 rounded ${validatorsButtonClass} hover:bg-gray-900 hover:underline text-sm`}
        aria-label={showValidators ? 'Turn off validator board' : 'Turn on validator board'}
      >
        {showValidators ? 'Validator dashboard' : 'Validator dashboard'}
      </button>

      <a href="https://wallet.3dpass.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">
        Wallet
      </a>
      <a href="https://3dpscan.xyz/" target="_blank" rel="noopener noreferrer" className="hover:underline">
        Explorer
      </a>
      <a href="https://3dpass.network/" target="_blank" rel="noopener noreferrer" className="hover:underline">
        Telemetry
      </a>
     <div className="relative text-left">
  <span className="cursor-pointer group inline-block hidden md:block text-gray-400">
    RPC: 📶
    <span className="absolute right-0 top-full mt-2 hidden group-hover:block bg-gray-800 text-gray-300 text-xs text-left rounded px-2 py-1 shadow-lg min-w-[220px] border border-[0.5px]">
      Connections:<br />
      - RPC: {config.websocketEndpoint} <br />
      - Explorer: {config.API_BASE}
    </span>
  </span>
</div>

    </div>
  </div>

      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <NetworkState />
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
          <a href="https://3dpass.org/mainnet#linux-mac" target="_blank" rel="noopener noreferrer" className="hover:underline">
            How to mine P3D
          </a>
           <a href="https://3dpass.org/mainnet#validator" target="_blank" rel="noopener noreferrer" className="hover:underline">
            How to run Validator
          </a>
          <a
             href="https://github.com/3Dpass/mining-leaderboard"
             target="_blank"
             rel="noopener noreferrer"
          >
            <svg
               xmlns="http://www.w3.org/2000/svg"
               width="24"
               height="24"
               viewBox="0 0 24 24"
             >
             <title>GitHub Repository</title>
             <path
             fill="#fff"
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
             />
           </svg>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;

