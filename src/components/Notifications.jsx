import React, { useEffect, useState } from 'react';
import { encodeAddress } from '@polkadot/util-crypto';
import config from '../config';

const Notifications = ({ api }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    if (!api || !notificationsEnabled) return;

    let unsubscribe;

    const listenToEvents = async () => {
      unsubscribe = await api.query.system.events((events) => {
        events.forEach(({ event }) => {
          const { section, method, data } = event;

          const getAccount = (idx = 0) => encodeAddress(data[idx].toU8a(), config.SS58_PREFIX);
          const getBalance = (idx) => (data[idx].toBigInt() / BigInt(10 ** config.BALANCE_FORMAT.DEFAULT_DECIMALS)).toFixed(config.BALANCE_FORMAT.DISPLAY_DECIMALS);

          if (section === 'imOnline') {
            if (method === 'HeartbeatReceived') {
              const address = getAccount();
              addNotification({ type: 'info', message: `✅ imOnline Heartbeat received from: ${address}` });
            }
            if (method === 'SomeOffline') {
              const address = getAccount();
              addNotification({ type: 'error', message: `⚠️ Validator is offline: ${address}` });
            }
            if (method === 'AllGood') {
              addNotification({ type: 'success', message: '✅ All good! No offence was committed during the session!' });
            }
          }

          if (section === 'session' && method === 'NewSession') {
            const sessionIndex = data[0].toString();
            addNotification({ type: 'info', message: `🔄 New session started: #${sessionIndex}` });
          }

          if (section === 'offences' && method === 'Offence') {
            // Convert the kind (16-byte array) to hex string for display
            const kind = data[0].toHex();
            // Get the timeslot as string
            const timeslot = data[1].toString();
            addNotification({ 
              type: 'error', 
              message: `⚠️ Offence reported - Kind: ${kind}, Timeslot: ${timeslot}` 
            });
          }

          if (section === 'validatorSet') {
            switch (method) {
              case 'ValidatorAdditionInitiated':
                addNotification({ type: 'info', message: `🟢 Validator addition initiated: ${getAccount()}` });
                break;
              case 'ValidatorRemovalInitiated':
                addNotification({ type: 'warning', message: `🔻 Validator removal initiated: ${getAccount()}` });
                break;
              case 'ValidatorSlash':
                addNotification({ type: 'error', message: `💥 Validator slashed: ${getAccount()} (-${getBalance(1)} P3D)` });
                break;
              case 'ValidatorLockBalance':
                addNotification({
                  type: 'info',
                  message: `🔒 Locked ${getBalance(2)} P3D for ${getAccount()} until block #${data[1].toString()}`
                });
                break;
              case 'ValidatorUnlockBalance':
                addNotification({
                  type: 'success',
                  message: `🔓 Unlocked ${getBalance(1)} P3D for validator ${getAccount()}`
                });
                break;
              case 'PenaltySet':
                addNotification({
                  type: 'warning',
                  message: `⚠️ Penalty set for validator ${getAccount()}: ${getBalance(1)} P3D`
                });
                break;
              case 'PenaltyCanceled':
                addNotification({
                  type: 'success',
                  message: `✅ Penalty canceled for validator ${getAccount()}: ${getBalance(1)} P3D`
                });
                break;
              case 'ScheduledSessionDuration':
                addNotification({
                  type: 'info',
                  message: `📅 Scheduled session duration: ${data[2].toString()} blocks (from block #${data[0].toString()}, session #${data[1].toString()})`
                });
                break;
              case 'ValidatorAdded':
                addNotification({ type: 'success', message: `✅ Validator added: ${getAccount()}` });
                break;
              case 'ValidatorNotAdded':
                addNotification({ type: 'error', message: `❌ Validator not added: ${getAccount()}` });
                break;
              default:
                break;
            }
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
    setShowNotifications((prev) => !prev);
  };

  return (
    <div className="-mt-8">
      <div style={{ marginBottom: '10px' }}>
        <button onClick={toggleNotifications} className="text-xs text-indigo-400 hover:underline">
          {notificationsEnabled ? '🔔 Disable Notifications' : '🔔 Enable Notifications'}
        </button>
        <button onClick={clearNotifications} style={{ marginLeft: '10px' }} className="text-xs text-red-500 hover:underline">
          🧹 Clear
        </button>
        <button onClick={toggleShowNotifications} style={{ marginLeft: '10px' }} className="text-xs text-gray-500 hover:underline">
          {showNotifications ? '(-) Hide' : '(+) Show'}
        </button>
      </div>
      {showNotifications && (
        <div className="notifications">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className={`notification mb-2 p-3 rounded shadow-md border border-[0.5px] bg-gray-900 ${
                notification.type === 'error'
                ? 'border-red-300'
                : notification.type === 'success'
                ? 'border-green-600'
                : notification.type === 'warning'
                ? 'border-yellow-600'
                : 'border-gray-500'
                } text-gray-300 text-xs`}
            >
              <strong>
                <span className='text-gray-600'>
                {notification.timestamp}
                </span>
              </strong> – {notification.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
