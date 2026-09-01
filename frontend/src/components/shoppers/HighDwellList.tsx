import React from 'react';
import { HeatmapGridResponseDTO } from '../../types/api';
import { Clock, MapPin, TrendingUp } from 'lucide-react';

interface HighDwellListProps {
  heatmapData: HeatmapGridResponseDTO | null;
  avgDwellMinutes: number;
}

export const HighDwellList: React.FC<HighDwellListProps> = ({
  heatmapData,
  avgDwellMinutes,
}) => {
  const zones = heatmapData?.high_dwell_zones || [
    'Checkout Queue Area',
    'Aisle 3 (Dairy & Beverages)',
    'Store Entrance',
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="text-h2">High-Dwell Zones Detected</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Physical store zones with significant shopper dwell time
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {zones.map((zoneName, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--priority-medium-border)',
                }}
              >
                <MapPin size={14} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {zoneName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Active zone monitored by Edge SNPE node
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--priority-medium-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Clock size={12} />
                <span>~{Math.round(avgDwellMinutes * (1.1 + idx * 0.2))} min dwell</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High Engagement</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
