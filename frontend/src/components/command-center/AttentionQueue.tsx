import React from 'react';
import { useStore } from '../../context/StoreContext';
import { PriorityBadge } from '../common/PriorityBadge';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Users,
  Clock,
  Check,
  Loader2
} from 'lucide-react';

export const AttentionQueue: React.FC = () => {
  const { situations, executeAction, activeAction, setCurrentRoute, queues, shelves, alerts } = useStore();

  const isExecuting = activeAction?.status === 'EXECUTING';

  // Active pending issues requiring human intervention (excluding NORMAL)
  const activeIssues = situations.filter((s) => s.priority !== 'NORMAL');

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
                backgroundColor: activeIssues.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeIssues.length > 0 ? 'var(--priority-critical-border)' : 'var(--priority-normal-border)',
              }}
            >
              <Zap size={14} />
            </div>
            <h2 className="text-h2">Active Action Queue</h2>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Actionable store interventions requiring manager decision
          </p>
        </div>

        <span
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: activeIssues.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: activeIssues.length > 0 ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {activeIssues.length} PENDING DECISIONS
        </span>
      </div>

      {/* Body: Action Cards or All Clear Card */}
      <div style={{ padding: 'var(--space-md) 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {activeIssues.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-xl)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              height: '100%',
              minHeight: 220,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={24} color="var(--priority-normal-border)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                All Operational Zones Optimal
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, marginTop: 4 }}>
                No active cashier overflows or stockout bottlenecks. Continuous edge AI vision monitoring active.
              </div>
            </div>
          </div>
        ) : (
          activeIssues.map((sit, idx) => {
            const isThisExecuting = activeAction?.entityId === sit.action?.entityId && isExecuting;

            return (
              <div
                key={sit.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${sit.priority === 'CRITICAL' ? 'var(--priority-critical-border)' : 'var(--priority-high-border)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Top Row: Task Priority & Entity */}
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PriorityBadge priority={sit.priority} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sit.entity}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                    Task #{idx + 1}
                  </span>
                </div>

                {/* Problem Summary & Recommendation */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                    {sit.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {sit.summary}
                  </div>
                </div>

                {/* Recommended Action Pill & Execution Button */}
                {sit.action && (
                  <div
                    style={{
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600 }}>
                      ⚡ Recommended: {sit.action.label}
                    </span>

                    <button
                      className={`btn btn-sm ${
                        sit.priority === 'CRITICAL' ? 'btn-action-critical' : 'btn-action-warning'
                      }`}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      disabled={isExecuting}
                      onClick={() => executeAction(sit.action!)}
                    >
                      {isThisExecuting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <span>Execute Action</span>
                          <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
