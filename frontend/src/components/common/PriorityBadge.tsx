import React from 'react';
import { PriorityLevel } from '../../types';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const getIcon = () => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertCircle size={13} />;
      case 'HIGH':
        return <AlertTriangle size={13} />;
      case 'MEDIUM':
        return <AlertTriangle size={13} />;
      case 'LOW':
        return <Info size={13} />;
      case 'NORMAL':
        return <CheckCircle2 size={13} />;
      default:
        return null;
    }
  };

  return (
    <span className={`badge-priority ${priority.toLowerCase()}`}>
      {showIcon && getIcon()}
      {priority}
    </span>
  );
};
