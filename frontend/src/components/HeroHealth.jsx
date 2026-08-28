import React from 'react';
import { Activity } from 'lucide-react';

const HeroHealth = ({ data }) => {
  if (!data) return null;

  const getStatusColor = (score) => {
    if (score > 75) return 'text-green-400';
    if (score > 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getRingColor = (score) => {
    if (score > 75) return 'stroke-green-500';
    if (score > 50) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  // SVG Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.healthScore / 100) * circumference;

  return (
    <section className="bg-panelDark p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className={`absolute w-64 h-64 blur-3xl opacity-10 rounded-full ${getStatusColor(data.healthScore).replace('text', 'bg')} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
      
      <div className="flex items-center gap-2 mb-4 z-10">
        <Activity className="text-blue-400" />
        <h2 className="text-lg font-semibold text-gray-200">Store Health Score</h2>
      </div>

      <div className="relative flex items-center justify-center z-10 w-48 h-48 mt-2">
        <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-gray-800"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className={`${getRingColor(data.healthScore)} transition-all duration-1000 ease-in-out`}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-5xl font-bold font-mono ${getStatusColor(data.healthScore)}`}>
            {data.healthScore}
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>

      <div className="mt-6 text-center z-10">
        <div className={`inline-flex items-center px-4 py-1.5 rounded-full border border-gray-700 bg-edgeDark ${getStatusColor(data.healthScore)}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(data.healthScore).replace('text', 'bg')}`} />
          <span className="font-medium text-sm tracking-wide">{data.healthStatus}</span>
        </div>
        <p className="text-sm text-gray-500 mt-3 max-w-md">
          Synthesized from live queue pressure, inventory levels, and overall footfall metrics analyzed on-device.
        </p>
      </div>
    </section>
  );
};

export default HeroHealth;
