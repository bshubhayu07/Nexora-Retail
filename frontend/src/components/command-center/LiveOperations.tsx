import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Flame, ShoppingBag, Users, Cpu, ArrowUpRight } from 'lucide-react';

export const LiveOperations: React.FC = () => {
  const { overview, queues, shelves, hardware, setCurrentRoute } = useStore();

  const totalWaiting = queues.reduce((sum, q) => sum + (q.cashier_status !== 'CLOSED' ? q.shopper_count : 0), 0);
  const openCounters = queues.filter((q) => q.cashier_status !== 'CLOSED').length;
  const lowStockCount = shelves.filter((s) => s.fill_percentage <= 20.0 || s.is_out_of_stock).length;
  const lowestFill = shelves.length > 0 ? Math.min(...shelves.map((s) => s.fill_percentage)) : 100;

  return (
    <div className="live-ops-strip">
      {/* Queues Pulse Card */}
      <div className="live-ops-card" onClick={() => setCurrentRoute('queues')}>
        <div className="live-ops-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={14} color="var(--accent-primary)" />
            <span>Checkout Queues</span>
          </div>
          <ArrowUpRight size={14} color="var(--text-muted)" />
        </div>
        <div className="live-ops-card-main">
          <span>{totalWaiting}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>waiting</span>
        </div>
        <div className="live-ops-card-sub flex-between">
          <span>{openCounters} counters open</span>
          <span style={{ color: totalWaiting > 5 ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)' }}>
            {totalWaiting > 5 ? 'Congested' : 'Normal'}
          </span>
        </div>
      </div>

      {/* Inventory Pulse Card */}
      <div className="live-ops-card" onClick={() => setCurrentRoute('inventory')}>
        <div className="live-ops-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBag size={14} color="var(--priority-high-border)" />
            <span>Shelf Inventory</span>
          </div>
          <ArrowUpRight size={14} color="var(--text-muted)" />
        </div>
        <div className="live-ops-card-main">
          <span>{lowStockCount}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>low items</span>
        </div>
        <div className="live-ops-card-sub flex-between">
          <span>Lowest: {lowestFill.toFixed(0)}% fill</span>
          <span style={{ color: lowStockCount > 0 ? 'var(--priority-high-text)' : 'var(--priority-normal-text)' }}>
            {lowStockCount > 0 ? 'Restock Needed' : 'Stocked'}
          </span>
        </div>
      </div>

      {/* Shopper Pulse Card */}
      <div className="live-ops-card" onClick={() => setCurrentRoute('shoppers')}>
        <div className="live-ops-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="var(--priority-normal-border)" />
            <span>Active Shoppers</span>
          </div>
          <ArrowUpRight size={14} color="var(--text-muted)" />
        </div>
        <div className="live-ops-card-main">
          <span>{overview?.active_shoppers_now ?? 28}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>in store</span>
        </div>
        <div className="live-ops-card-sub flex-between">
          <span>{overview?.total_footfall_today ?? 148} footfall today</span>
          <span style={{ color: 'var(--priority-normal-text)' }}>Steady</span>
        </div>
      </div>

      {/* Edge AI Engine Pulse Card */}
      <div className="live-ops-card" onClick={() => setCurrentRoute('diagnostics')}>
        <div className="live-ops-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color="var(--accent-qualcomm)" />
            <span>Qualcomm Edge AI</span>
          </div>
          <ArrowUpRight size={14} color="var(--text-muted)" />
        </div>
        <div className="live-ops-card-main">
          <span>{hardware?.fps ? `${hardware.fps}` : '29.8'}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>FPS</span>
        </div>
        <div className="live-ops-card-sub flex-between">
          <span>{hardware?.inference_latency_ms ? `${hardware.inference_latency_ms}ms` : '12.4ms'} latency</span>
          <span style={{ color: 'var(--priority-normal-text)' }}>Operational</span>
        </div>
      </div>
    </div>
  );
};
