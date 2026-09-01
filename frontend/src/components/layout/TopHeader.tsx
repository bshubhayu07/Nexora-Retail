import React from 'react';
import { useStore } from '../../context/StoreContext';
import { RefreshCw, Radio, Wifi, WifiOff } from 'lucide-react';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title, subtitle }) => {
  const { isWsConnected, lastUpdated, refreshAll, isLoading } = useStore();

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <header
      style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-app)',
        padding: '0 var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1 className="text-h1" style={{ fontSize: 18 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        {/* Real-time Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isWsConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            border: `1px solid ${isWsConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            fontSize: 11,
            fontWeight: 700,
            color: isWsConnected ? 'var(--priority-normal-text)' : 'var(--priority-medium-text)',
          }}
        >
          {isWsConnected ? <Radio size={12} className="animate-pulse" /> : <WifiOff size={12} />}
          <span>{isWsConnected ? 'LIVE FEED' : 'FALLBACK POLLING'}</span>
        </div>

        {/* Last Updated Timestamp */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
          Updated: {formattedTime}
        </div>

        {/* Manual Refresh Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => refreshAll()}
          disabled={isLoading}
          title="Force telemetry refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
