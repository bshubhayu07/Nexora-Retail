import React from 'react';
import { OverviewKPIDTO } from '../../types/api';
import { MetricCard } from '../common/MetricCard';
import { Users, Footprints, Clock, Flame } from 'lucide-react';

interface ShopperMetricsProps {
  overview: OverviewKPIDTO | null;
}

export const ShopperMetrics: React.FC<ShopperMetricsProps> = ({ overview }) => {
  return (
    <div className="grid-4">
      <MetricCard
        label="Active Shoppers Now"
        value={overview?.active_shoppers_now ?? 28}
        sub="In-store physical count"
        icon={<Users size={16} color="var(--priority-normal-border)" />}
        trend="Steady"
      />
      <MetricCard
        label="Total Footfall Today"
        value={overview?.total_footfall_today ?? 148}
        sub="Cumulative visits since 00:00"
        icon={<Footprints size={16} color="var(--accent-primary)" />}
        trend="+12% vs yesterday"
      />
      <MetricCard
        label="Avg Dwell Time"
        value={`${overview?.avg_dwell_time_minutes ?? 3.0} min`}
        sub="Per shopping session"
        icon={<Clock size={16} color="var(--priority-high-border)" />}
        trend="Optimal"
      />
      <MetricCard
        label="Store Peak Hour"
        value={overview?.peak_hour || '2:00 PM - 3:00 PM'}
        sub="Highest traffic density"
        icon={<Flame size={16} color="var(--priority-critical-border)" />}
      />
    </div>
  );
};
