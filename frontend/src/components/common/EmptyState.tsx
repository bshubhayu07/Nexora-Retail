import React from 'react';
import { CheckCircle2, ShieldCheck, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Active Operational Issues',
  description = 'The store is currently operating within normal parameters.',
  icon: Icon = ShieldCheck,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-2xl) var(--space-xl)',
        textAlign: 'center',
        backgroundColor: 'var(--bg-card-subtle)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-md)',
          color: 'var(--priority-normal-border)',
        }}
      >
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, marginBottom: action ? 'var(--space-md)' : 0 }}>
        {description}
      </p>
      {action && (
        <button className="btn btn-secondary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};
