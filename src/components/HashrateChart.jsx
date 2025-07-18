import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import config from '../config';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatHashrate = (value) => {
  if (!value || value <= 0) return '0 H/s';
  const units = config.HASHRATE_UNITS;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return `${value.toFixed(config.BALANCE_FORMAT.HASH_RATE_DECIMALS)} ${units[i]}`;
};

const HashrateChart = ({ data }) => {
  const [showChart, setShowChart] = useState(true);

  if (!data || data.length === 0) return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <div className="w-full">
      <div className="flex justify-end mb-2 pr-4">
        <button
          onClick={() => setShowChart(!showChart)}
          className="text-xs text-gray-400 hover:text-indigo-300"
        >
          {showChart ? '(-) Hide' : '(+) Show'}
        </button>
      </div>
      
      {showChart && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid stroke="#444" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#aaa"
            />
            <YAxis
              tickFormatter={formatHashrate}
              stroke="#aaa"
            />
            <Tooltip
              formatter={(value) => formatHashrate(value)}
              labelFormatter={(label) => `Time: ${formatTime(label)}`}
            />
            <Line
              type="monotone"
              dataKey="hashrate"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default HashrateChart;