import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#AA66CC', '#DD4477'];

const ShareChart = ({ data }) => {
  const [showChart, setShowChart] = useState(true);

  // Custom tooltip formatter to show percentages
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded text-white text-sm">
          <p>{data.name}: {data.value.toFixed(2)}%</p>
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
    const color = COLORS[index % COLORS.length];

    return (
      <text
        x={x}
        y={y}
        fill={color}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm"
      >
        {`${name} (${(percent * 100).toFixed(1)}%)`}
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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