import React from 'react';
import { Cpu, Cloud, Activity, Timer, Server, Beaker } from 'lucide-react';

const TopNav = ({ isLiveMode, setIsLiveMode, telemetry }) => {
  return (
    <header className="bg-panelDark border-b border-gray-800 p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">
          RetailIQ <span className="text-gray-500">//</span> On-Device Copilot
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Toggle Button */}
          <button 
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
              isLiveMode 
                ? 'bg-blue-900/40 text-blue-400 border-blue-800 hover:bg-blue-900/60' 
                : 'bg-emerald-900/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
            }`}
          >
            {isLiveMode ? <Server size={14} /> : <Beaker size={14} />}
            Mode: {isLiveMode ? 'Live Backend' : 'Mock Data'}
          </button>

          <Badge icon={<Cpu size={16} className="text-green-400" />} label="Qualcomm NPU: ACTIVE" />
          <Badge icon={<Cloud size={16} className="text-gray-400" />} label={`Cloud Calls: ${telemetry?.cloudCalls || 0}`} />
          <Badge icon={<Activity size={16} className="text-blue-400" />} label={`FPS: ${telemetry?.fps || 0}`} />
          <Badge icon={<Timer size={16} className="text-amber-400" />} label={`Local Latency: ${telemetry?.latency || 0}ms`} />
        </div>
      </div>
    </header>
  );
};

const Badge = ({ icon, label }) => (
  <div className="flex items-center gap-2 bg-edgeDark px-3 py-1.5 rounded-md border border-gray-800">
    {icon}
    <span className="font-mono text-gray-300">{label}</span>
  </div>
);

export default TopNav;
