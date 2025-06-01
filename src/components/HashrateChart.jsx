import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatHashrate = (value) => {
  if (!value || value <= 0) return '0 H/s';
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
};

const HashrateChart = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-center text-gray-500">No data available</p>;

  return (
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
  );
};

export default HashrateChart;
