import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Users, Package, AlertTriangle } from 'lucide-react';

const AnalyticsPanels = ({ data }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Queue Trend Chart */}
      <div className="lg:col-span-2 bg-panelDark p-5 rounded-xl border border-gray-800 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-blue-400" size={20} />
            <h3 className="font-semibold text-gray-200">Checkout Queue Trend</h3>
          </div>
          <span className="text-xs text-gray-400 bg-edgeDark px-2 py-1 rounded border border-gray-800">
            Real-time inference
          </span>
        </div>
        <div className="flex-grow h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.queueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1f2937', color: '#f3f4f6' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Threshold', fill: '#ef4444', fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorQueue)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Zone Footfall & Shelf Status Grid */}
        <div className="bg-panelDark p-5 rounded-xl border border-gray-800 flex-grow">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-blue-400" size={20} />
            <h3 className="font-semibold text-gray-200">Zone Status</h3>
          </div>
          <div className="flex flex-col gap-3">
            {data.zones.map(zone => (
              <div key={zone.id} className="bg-edgeDark p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-200">{zone.name}</div>
                  <div className="text-xs text-gray-500">{zone.sku}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-300">{Math.floor(zone.occupancy)}% full</div>
                  </div>
                  <StatusBadge status={zone.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Staffing Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 to-panelDark p-4 rounded-xl border border-blue-900/50 flex items-start gap-3">
          <AlertTriangle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-blue-100 mb-1">Predictive Staffing</h4>
            <p className="text-sm text-blue-200/70">
              {data.queueData[data.queueData.length - 1].count >= 4 
                ? "Predicted surge: Open Counter 4 in ~2 mins" 
                : "Current staffing levels are optimal for predicted traffic."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    STOCKED: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    LOW: 'bg-amber-950 text-amber-400 border-amber-800',
    EMPTY: 'bg-rose-950 text-rose-400 border-rose-800'
  };

  return (
    <span className={`text-xs px-2 py-1 rounded border font-medium ${colors[status]}`}>
      {status}
    </span>
  );
};

export default AnalyticsPanels;
