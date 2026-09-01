import React from 'react';
import { useStore } from '../../context/StoreContext';
import { PriorityBadge } from '../common/PriorityBadge';
import {
  Activity,
  CheckCircle2,
  Camera,
  Cpu,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const RecentActivity: React.FC = () => {
  const { alerts, executeAction, setCurrentRoute } = useStore();

  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="card-header flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Activity size={14} />
            </div>
            <h2 className="text-h2">Edge AI Detection Stream</h2>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time audit log of camera events &amp; staff resolution history
          </p>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11 }}
          onClick={() => setCurrentRoute('activity')}
        >
          <span>Full Audit Log ({alerts.length})</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Body: Chronological Audit Stream */}
      <div style={{ padding: 'var(--space-md) 0', flex: 1, overflowY: 'auto' }}>
        {recentAlerts.length === 0 ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No edge events logged yet.
          </div>
        ) : (
          <div className="timeline-feed">
            {recentAlerts.map((alert) => {
              const timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isResolved = alert.is_acknowledged;

              return (
                <div key={alert.id} className="timeline-item">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 62 }}>
                    <span className="timeline-time" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {timeStr}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      LOG #{alert.id}
                    </span>
                  </div>

                  <div className="timeline-content" style={{ flex: 1 }}>
                    <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <PriorityBadge
                          priority={
                            alert.severity === 'CRITICAL'
                              ? 'CRITICAL'
                              : alert.severity === 'INFO'
                              ? 'LOW'
                              : 'HIGH'
                          }
                        />
                        <span className="timeline-title" style={{ fontSize: 12 }}>
                          {alert.title}
                        </span>
                      </div>

                      {/* Status Chip: Resolved vs Active */}
                      {isResolved ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(34, 197, 94, 0.12)',
                            color: 'var(--priority-normal-text)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={10} /> RESOLVED
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--priority-critical-text)',
                            border: '1px solid var(--priority-critical-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 700,
                          }}
                        >
                          <AlertCircle size={10} /> ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Event Detail & Camera Tag */}
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {alert.message}
                    </div>

                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Camera size={10} color="#38bdf8" />
                        <span>Source: {alert.source_id || 'Qualcomm RB5 Cam'}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Cpu size={10} color="#a855f7" />
                        <span>SNPE NPU Inference</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
