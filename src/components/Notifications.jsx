import React, { useEffect, useState } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';

const SS58_PREFIX = 71;

const Notifications = ({ api }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true); // State to control visibility

  useEffect(() => {
    if (!api || !notificationsEnabled) return;

    let unsubscribe;

    const listenToEvents = async () => {
      unsubscribe = await api.query.system.events((events) => {
        events.forEach(({ event }) => {
          const { section, method, data } = event;

          // Handle imOnline.HeartbeatReceived
          if (section === 'imOnline' && method === 'HeartbeatReceived') {
            const authorityId = data[0].toU8a();
            const address = encodeAddress(authorityId, SS58_PREFIX);
            const message = `✅ imOnline Heartbeat received from: ${address}`;
            addNotification({ type: 'info', message });
          }

          // Handle imOnline.SomeOffline
          if (section === 'imOnline' && method === 'SomeOffline') {
            const authorityId = data[0].toU8a();
            const address = encodeAddress(authorityId, SS58_PREFIX);
            const message = `⚠️ Validator is offline: ${address}`;
            addNotification({ type: 'error', message });
          }

          // Handle imOnline.AllGood
          if (section === 'imOnline' && method === 'AllGood') {
            const message = `✅ All good! No offence was commited during the session!`;
            addNotification({ type: 'success', message });
          }

          // Handle session.NewSession
          if (section === 'session' && method === 'NewSession') {
            const sessionIndex = data[0].toString();
            const message = `🔄 New session got started: #${sessionIndex}`;
            addNotification({ type: 'info', message });
          }
        });
      });
    };

    listenToEvents().catch(console.error);

    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then((unsub) => unsub()).catch(console.error);
      }
    };
  }, [api, notificationsEnabled]);

  const addNotification = ({ type, message }) => {
    setNotifications((prev) => {
      const isDuplicate = prev.some((n) => n.message === message && n.type === type);
      if (isDuplicate) return prev;

      return [
        ...prev,
        {
          type,
          message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ];
    });
  };

  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => !prev);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const toggleShowNotifications = () => {
    setShowNotifications((prev) => !prev); // Toggle visibility
  };

  return (
    <div className="mt-2">
      <div style={{ marginBottom: '10px' }}>
        <button onClick={toggleNotifications} className="text-xs text-indigo-400 hover:underline">
          {notificationsEnabled ? '🔔 Disable Notifications' : '🔔 Enable Notifications'}
        </button>
        <button onClick={clearNotifications} style={{ marginLeft: '10px' }} className="text-xs text-red-500 hover:underline">
          🧹 Clear
        </button>
        <button onClick={toggleShowNotifications} style={{ marginLeft: '10px' }} className="text-xs text-gray-500 hover:underline">
          {showNotifications ? 'Hide' : 'Show'}
        </button>
      </div>
      {showNotifications && (
        <div className="notifications">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className={`notification mb-2 p-3 rounded shadow-md border ${notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-800' : 'bg-gray-800'} text-gray-400 text-xs`}
            >
              <strong>{notification.timestamp}</strong> - {notification.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
