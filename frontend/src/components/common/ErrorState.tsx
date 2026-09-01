import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Intelligence Feed Unavailable',
  message = 'Unable to connect to Retail Operations backend.',
  onRetry,
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
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-md)',
          color: 'var(--priority-critical-border)',
        }}
      >
        <AlertTriangle size={24} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--priority-critical-text)', marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, marginBottom: onRetry ? 'var(--space-md)' : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry Connection
        </button>
      )}
    </div>
  );
};
