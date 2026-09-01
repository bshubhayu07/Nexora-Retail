import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = (status || '').toLowerCase().replace(/\s+/g, '_');
  const label = status.replace(/_/g, ' ');

  return <span className={`badge-status ${norm}`}>{label}</span>;
};
