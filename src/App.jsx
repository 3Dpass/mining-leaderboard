import React, { useState, useEffect } from 'react';
import { Button, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import { usePolkadotApi } from './hooks/usePolkadotApi';
import ValidatorTable from './components/ValidatorTable';
import MiningLeaderboardTable from './components/MiningLeaderboardTable';
import NetworkInfo from './components/NetworkInfo';
import NetworkState from './components/NetworkState';
import DialogRpcSettings from './components/dialogs/DialogRpcSettings';

const App = () => {
  const { api, connected, reconnect, error } = usePolkadotApi();
  const [showMining, setShowMining] = useState(true);
  const [showValidators, setShowValidators] = useState(false);
  const [miningButtonClass, setMiningButtonClass] = useState('bg-gray-900 text-white font-semibold');
  const [validatorsButtonClass, setValidatorsButtonClass] = useState('bg-gray-900 text-gray-400');
  const [open, setOpen] = useState(false);

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

  const handleEndpointChange = (newEndpoint) => {
    console.log("New endpoint:", newEndpoint);
    reconnect(newEndpoint); // Call the reconnect function with the new endpoint
    window.location.reload(); // reconnects on page load
  };

  return (
 <div className="w-full max-w-6xl mx-auto p-2 space-y-4">
  <div className="bg-gray-900 text-gray-400 p-2 shadow-md">
    <div className="max-w-8xl mx-auto flex items-center justify-center space-x-6 font-medium text-md">
      <img 
        src="/img/3dpass_logo_white.png" 
        className="w-6 h-6 hidden sm:block" 
        alt="3DPass Logo" 
      />
      <NetworkInfo api={api} connected={connected} />
      
      {/* Toggle Buttons */}
      <button
        aria-pressed={showMining}
        onClick={toggleMining}
        className={`px-1 py-2 rounded ${miningButtonClass} hover:bg-gray-900 hover:underline text-md`}
        aria-label={showMining ? 'Turn off mining board' : 'Turn on mining board'}
      >
        {showMining ? 'Mining leaderboard' : 'Mining leaderboard'}
      </button>
      <button
        aria-pressed={showValidators}
        onClick={toggleValidators}
        className={`px-1 py-2 rounded ${validatorsButtonClass} hover:bg-gray-900 hover:underline text-md`}
        aria-label={showValidators ? 'Turn off validator board' : 'Turn on validator board'}
      >
        {showValidators ? 'Validator set' : 'Validator set'}
      </button>
      <a 
        href="https://wallet.3dpass.org/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-gray-400 hover:text-gray-400 hover:bg-gray-900 hover:underline px-1 py-2 rounded"
      >
        Wallet
      </a>
      <a 
        href="https://3dpscan.xyz/" 
        target="_blank" rel="noopener noreferrer" 
        className="text-gray-400 hover:text-gray-400 hover:bg-gray-900 hover:underline px-1 py-2 rounded"
      >
        Explorer
      </a>
      <a 
        href="https://3dpass.network/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-gray-400 hover:text-gray-400 hover:bg-gray-900 hover:underline px-1 py-2 rounded"
      >
        Telemetry
      </a>
      <Button 
        icon="cog"
        className="bg-gray-600 hover:bg-blue-700  text-white"
        onClick={() => setOpen(true)} 
        minimal 
      />
      <DialogRpcSettings
         isOpen={open}
         onClose={() => setOpen(false)}
         onEndpointChange={handleEndpointChange}
       />
       {/* Show the error alert 
        {error && (
           <Alert
            isOpen={true}
            intent="danger"
            onClose={() => setError(null)}
            className="custom-rpc-disconnect"
            style={{
              backgroundColor: "#1f2937", // bg-gray-900
              border: "0.5px solid #FFFFFF",
              borderRadius: "0.375rem" 
            }} 
           >
            {error}
         </Alert>
        )}*/}
    </div>
  </div>

      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <NetworkState api={api} connected={connected} />
      </div>

      {/* Mining Content */}
      {showMining && (
        <div>
          <MiningLeaderboardTable api={api} connected={connected} />
        </div>
      )}

      {/* Validators Content */}
      {showValidators && (
        <div>
          <ValidatorTable api={api} connected={connected} />
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

