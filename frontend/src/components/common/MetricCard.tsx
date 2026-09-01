import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  icon,
  trend,
  onClick,
}) => {
  return (
    <div
      className="metric-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {(sub || trend) && (
        <div className="metric-sub flex-between">
          {sub && <span>{sub}</span>}
          {trend && <span style={{ color: 'var(--priority-normal-text)' }}>{trend}</span>}
        </div>
      )}
    </div>
  );
};
