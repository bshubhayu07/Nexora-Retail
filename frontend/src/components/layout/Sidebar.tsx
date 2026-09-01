import React from 'react';
import { useStore } from '../../context/StoreContext';
import { AppRoute } from '../../types';
import {
  ShieldAlert,
  Users,
  Layers,
  LineChart,
  Activity,
  Bot,
  Cpu,
  Store,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShoppingBag
} from 'lucide-react';

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isSubItem?: boolean;
}

export const Sidebar: React.FC = () => {
  const { currentRoute, setCurrentRoute, situations, isWsConnected, hardware } = useStore();

  const criticalCount = situations.filter((s) => s.priority === 'CRITICAL').length;
  const isCalm = situations.length === 1 && situations[0].priority === 'NORMAL';

  const navItems: NavItem[] = [
    {
      id: 'command-center',
      label: 'Command Center',
      icon: <ShieldAlert size={18} />,
      badge: criticalCount > 0 ? criticalCount : undefined,
    },
    {
      id: 'shoppers',
      label: 'Shopper Intelligence',
      icon: <Users size={18} />,
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: <Layers size={18} />,
    },
    {
      id: 'queues',
      label: 'Queue Intelligence',
      icon: <Flame size={18} />,
      isSubItem: true,
    },
    {
      id: 'inventory',
      label: 'Inventory Intelligence',
      icon: <ShoppingBag size={18} />,
      isSubItem: true,
    },
    {
      id: 'insights',
      label: 'Insights & Trends',
      icon: <LineChart size={18} />,
    },
    {
      id: 'activity',
      label: 'AI Activity Feed',
      icon: <Activity size={18} />,
    },
    {
      id: 'copilot',
      label: 'Retail Copilot',
      icon: <Bot size={18} />,
    },
    {
      id: 'diagnostics',
      label: 'System Diagnostics',
      icon: <Cpu size={18} />,
    },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Brand & Store Identity */}
      <div>
        <div
          style={{
            padding: 'var(--space-lg)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-qualcomm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
              NEXORA RETAIL
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              AI Command Center
            </div>
          </div>
        </div>

        {/* Store Operational Status Indicator */}
        <div
          style={{
            padding: '12px var(--space-lg)',
            backgroundColor: 'var(--bg-card-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Store #801
            </span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: isCalm ? 'var(--priority-normal-text)' : 'var(--priority-critical-text)',
            }}
          >
            {isCalm ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {isCalm ? 'NOMINAL' : `${criticalCount} ISSUES`}
          </span>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: 'var(--space-md) var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentRoute(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: `8px 12px`,
                  paddingLeft: item.isSubItem ? '32px' : '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--border-default)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: item.isSubItem ? 12 : 13,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      backgroundColor: 'var(--priority-critical-solid)',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Qualcomm Edge Architecture Badge */}
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Edge Engine
          </span>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isWsConnected ? 'var(--priority-normal-border)' : 'var(--priority-high-border)',
            }}
          />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          Qualcomm Snapdragon QCS8550
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>{hardware?.fps ? `${hardware.fps} FPS` : '30.0 FPS'}</span>
          <span>{hardware?.inference_latency_ms ? `${hardware.inference_latency_ms}ms` : '12.4ms'}</span>
        </div>
      </div>
    </aside>
  );
};
