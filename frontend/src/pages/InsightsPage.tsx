import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { LineChart, Clock, Footprints, Flame, ShoppingBag } from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const { trends, overview, fetchCustomTrends } = useStore();
  const [selectedWindow, setSelectedWindow] = useState<number>(180);

  const handleWindowChange = (val: number) => {
    setSelectedWindow(val);
    fetchCustomTrends(val);
  };

  const footfallData = trends?.footfall_trend || [];
  const queueData = trends?.queue_trend || [];
  const shelfData = trends?.shelf_inventory || [];

  const maxShoppers = footfallData.length > 0 ? Math.max(...footfallData.map((d) => d.shopper_count), 20) : 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Time Window Filter Header */}
      <div className="card-header flex-between" style={{ padding: '0 0 var(--space-md) 0' }}>
        <div>
          <h2 className="text-h2">Store Operational Insights & Patterns</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Real-time timeseries aggregated from edge sensor telemetry
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Last 1 Hour', val: 60 },
            { label: 'Last 3 Hours', val: 180 },
            { label: 'Full Shift (6h)', val: 360 },
          ].map((btn) => (
            <button
              key={btn.val}
              className={`btn btn-sm ${selectedWindow === btn.val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleWindowChange(btn.val)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Footfall & Traffic Density Trend */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Footprints size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Shopper Traffic & Density Progression
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {footfallData.length} timeline observations
          </span>
        </div>

        {footfallData.length === 0 ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Historical footfall telemetry accumulating...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Bar Chart Visualization */}
            <div
              style={{
                height: 180,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                padding: '10px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {footfallData.slice(-20).map((d, i) => {
                const heightPct = Math.max(8, (d.shopper_count / maxShoppers) * 100);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                    title={`${d.time_label}: ${d.shopper_count} shoppers (Avg Dwell: ${d.avg_dwell_min}m)`}
                  >
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      {d.shopper_count}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        backgroundColor: 'var(--accent-primary)',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        opacity: 0.85,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-45deg)', marginTop: 4 }}>
                      {d.time_label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex-between" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Peak Recorded Traffic: {maxShoppers} shoppers</span>
              <span>Average Dwell: {overview?.avg_dwell_time_minutes ?? 3.0} min / session</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Queue Wait Times & Shelf Inventory Distribution */}
      <div className="grid-2">
        {/* Queue Wait Times */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={16} color="var(--priority-high-border)" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Checkout Wait Time Timeline
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queueData.slice(-6).map((q, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {q.queue_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {q.time_label} · Status: {q.cashier_status}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: q.estimated_wait_min > 7 ? 'var(--priority-critical-text)' : 'var(--text-primary)' }}>
                    {q.estimated_wait_min} min wait
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {q.shopper_count} shoppers in queue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shelf Capacity Breakdown */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} color="var(--priority-normal-border)" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Shelf Fill Health Distribution
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {shelfData.map((s, idx) => (
              <div key={idx}>
                <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {s.aisle_name} ({s.category})
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        s.fill_percentage <= 20
                          ? 'var(--priority-critical-text)'
                          : s.fill_percentage <= 40
                          ? 'var(--priority-high-text)'
                          : 'var(--priority-normal-text)',
                    }}
                  >
                    {s.fill_percentage.toFixed(1)}% ({s.product_count} units)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${
                      s.fill_percentage <= 20
                        ? 'fill-critical'
                        : s.fill_percentage <= 40
                        ? 'fill-warning'
                        : 'fill-good'
                    }`}
                    style={{ width: `${Math.max(5, s.fill_percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
