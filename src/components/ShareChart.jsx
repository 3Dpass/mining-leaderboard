import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import config from '../config';

const ShareChart = ({ data }) => {
  const [showChart, setShowChart] = useState(true);

  // Custom tooltip formatter to show percentages
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded text-white text-sm">
          <p>{data.name}: {data.value.toFixed(config.BALANCE_FORMAT.SHARE_DECIMALS)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom label formatter to show percentages outside the pie with matching colors
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const color = config.SHARE_CHART_COLORS[index % config.SHARE_CHART_COLORS.length];

    return (
      <text
        x={x}
        y={y}
        fill={color}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm"
      >
        {`${name} ${(percent * 100).toFixed(config.BALANCE_FORMAT.SHARE_DECIMALS)}%`}
      </text>
    );
  };

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
        <div className="h-96">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={renderCustomizedLabel}
                labelLine={true}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={config.SHARE_CHART_COLORS[index % config.SHARE_CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ShareChart;