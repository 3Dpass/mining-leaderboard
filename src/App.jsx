import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import { usePolkadotApi } from './hooks/usePolkadotApi';
import ValidatorTable from './components/ValidatorTable';
import MiningLeaderboardTable from './components/MiningLeaderboardTable';
import NetworkInfo from './components/NetworkInfo';
import NetworkState from './components/NetworkState';
import DialogRpcSettings from './components/dialogs/DialogRpcSettings';
import Notifications from './components/Notifications';

const App = () => {
  const { api, connected, reconnect, error: apiError } = usePolkadotApi();
  const [open, setOpen] = useState(false);
  const [showError, setShowError] = useState(true); // Local state to control error visibility

  // Get initial active tab from URL or default to mining
  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path === '/validators' || path === '/validator') {
      return 'validators';
    }
    if (path === '/mining' || path === '/') {
      return 'mining';
    }
    return 'mining'; // Default fallback
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Update URL when tab changes
  const updateURL = useCallback((tab) => {
    const path = tab === 'validators' ? '/validators' : '/mining';
    window.history.pushState({ tab }, '', path);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      const tab = event.state?.tab || getInitialTab();
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL when activeTab changes
  useEffect(() => {
    updateURL(activeTab);
  }, [activeTab, updateURL]);

  // Memoized button classes to prevent unnecessary re-renders
  const buttonClasses = useMemo(() => ({
    mining: activeTab === 'mining' 
      ? 'bg-gray-900 text-white font-semibold' 
      : 'bg-gray-900 text-gray-400',
    validators: activeTab === 'validators' 
      ? 'bg-gray-900 text-white font-semibold' 
      : 'bg-gray-900 text-gray-400'
  }), [activeTab]);

  // Memoized toggle functions to prevent unnecessary re-renders
  const toggleMining = useCallback(() => {
    setActiveTab('mining');
  }, []);

  const toggleValidators = useCallback(() => {
    setActiveTab('validators');
  }, []);

  const handleEndpointChange = useCallback((newEndpoint) => {
    console.log("New endpoint:", newEndpoint);
    try {
      reconnect(newEndpoint);
      // Use a more graceful approach instead of page reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Failed to change endpoint:', error);
    }
  }, [reconnect]);

  const handleCloseDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setOpen(true);
  }, []);

  // Handle error dialog close
  const handleCloseError = useCallback(() => {
    setShowError(false);
  }, []);

  // Reset error visibility when a new error occurs
  React.useEffect(() => {
    if (apiError) {
      setShowError(true);
    }
  }, [apiError]);

  // Memoized navigation links to prevent unnecessary re-renders
  const navigationLinks = useMemo(() => [
    {
      href: "https://wallet.3dpass.org/",
      label: "Wallet",
      external: true
    },
    {
      href: "https://3dpscan.xyz/",
      label: "Explorer",
      external: true
    },
    {
      href: "https://3dpass.network/",
      label: "Telemetry",
      external: true
    }
  ], []);

  // Memoized footer links
  const footerLinks = useMemo(() => [
    {
      href: "https://3dpass.org/mainnet#linux-mac",
      label: "How to mine P3D"
    },
    {
      href: "https://3dpass.org/mainnet#validator",
      label: "How to run Validator"
    }
  ], []);

  // Memoized GitHub SVG to prevent unnecessary re-renders
  const githubSvg = useMemo(() => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-label="GitHub Repository"
    >
      <title>GitHub Repository</title>
      <path
        fill="#fff"
        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
      />
    </svg>
  ), []);

  return (
 <div className="w-full max-w-6xl mx-auto p-2 space-y-4">
      {/* Error Alert - Suppressed to avoid showing WebSocket errors in UI */}
      {/* {apiError && showError && (
        <Alert
          isOpen={true}
          intent="danger"
          onClose={handleCloseError}
          className="custom-rpc-disconnect"
          style={{
            backgroundColor: "#1f2937",
            border: "0.5px solid #FFFFFF",
            borderRadius: "0.375rem" 
          }} 
        >
          {apiError}
        </Alert>
      )} */}

      {/* Header Navigation */}
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
            aria-pressed={activeTab === 'mining'}
        onClick={toggleMining}
            className={`px-1 py-2 rounded ${buttonClasses.mining} hover:bg-gray-900 hover:underline text-md transition-colors duration-200`}
            aria-label={activeTab === 'mining' ? 'Turn off mining board' : 'Turn on mining board'}
      >
            Mining leaderboard
      </button>
      <button
            aria-pressed={activeTab === 'validators'}
        onClick={toggleValidators}
            className={`px-1 py-2 rounded ${buttonClasses.validators} hover:bg-gray-900 hover:underline text-md transition-colors duration-200`}
            aria-label={activeTab === 'validators' ? 'Turn off validator board' : 'Turn on validator board'}
      >
            Validator set
      </button>

          {/* Navigation Links */}
          {navigationLinks.map((link, index) => (
            <a 
              key={index}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-gray-400 hover:text-gray-400 hover:bg-gray-900 hover:underline px-1 py-2 rounded transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}

          {/* Settings Button */}
      <Button 
        icon="cog"
            className="bg-gray-600 hover:bg-blue-700 text-white transition-colors duration-200"
            onClick={handleOpenDialog} 
        minimal 
            aria-label="Settings"
      />

          {/* RPC Settings Dialog */}
      <DialogRpcSettings
         isOpen={open}
            onClose={handleCloseDialog}
         onEndpointChange={handleEndpointChange}
       />
    </div>
  </div>

      {/* Network State */}
      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <NetworkState api={api} connected={connected} />
      </div>

      {/* Notifications */}
      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <Notifications api={api} />
      </div>

      {/* Content Sections */}
      {activeTab === 'mining' && (
        <div>
          <MiningLeaderboardTable api={api} connected={connected} />
        </div>
      )}

      {activeTab === 'validators' && (
        <div>
          <ValidatorTable api={api} connected={connected} />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-12 py-6">
        <div className="flex justify-center space-x-6">
          {footerLinks.map((link, index) => (
            <a 
              key={index}
              href={link.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
             href="https://github.com/3Dpass/mining-leaderboard"
             target="_blank"
             rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity duration-200"
            aria-label="GitHub Repository"
          >
            {githubSvg}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;

