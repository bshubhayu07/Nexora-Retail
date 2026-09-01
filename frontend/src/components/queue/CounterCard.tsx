import React, { useState } from 'react';
import { QueueStatusResponseDTO } from '../../types/api';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { Users, Clock, Flame, Power, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CounterCardProps {
  queue: QueueStatusResponseDTO;
  onInspect?: () => void;
}

export const CounterCard: React.FC<CounterCardProps> = ({ queue, onInspect }) => {
  const { executeAction, activeAction } = useStore();
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);

  const isOpen = queue.cashier_status !== 'CLOSED';
  const isOverloaded = queue.cashier_status === 'OVERLOADED' || queue.shopper_count >= 5;
  const isExecuting = activeAction?.entityId === queue.queue_id && activeAction?.status === 'EXECUTING';

  // Capacity visual calculation (e.g. max capacity 8 shoppers)
  const capacityPct = Math.min(100, (queue.shopper_count / 8) * 100);

  const handleToggle = async () => {
    if (isOpen) {
      if (queue.shopper_count > 0 && !isConfirmingClose) {
        setIsConfirmingClose(true);
        return;
      }
      setIsConfirmingClose(false);
      await executeAction({
        id: `close-${queue.queue_id}`,
        type: 'CLOSE_COUNTER',
        label: `CLOSE ${queue.queue_name.toUpperCase()}`,
        entityId: queue.queue_id,
        endpoint: `/queue/${queue.queue_id}/toggle`,
        method: 'POST',
        payload: { action: 'CLOSE' },
        status: 'AVAILABLE',
      });
    } else {
      await executeAction({
        id: `open-${queue.queue_id}`,
        type: 'OPEN_COUNTER',
        label: `OPEN ${queue.queue_name.toUpperCase()}`,
        entityId: queue.queue_id,
        endpoint: `/queue/${queue.queue_id}/toggle`,
        method: 'POST',
        payload: { action: 'OPEN' },
        status: 'AVAILABLE',
      });
    }
  };

  return (
    <div
      className="card"
      style={{
        borderColor: isOverloaded ? 'var(--priority-critical-border)' : 'var(--border-subtle)',
        boxShadow: isOverloaded ? '0 0 16px rgba(239, 68, 68, 0.15)' : 'none',
      }}
    >
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {queue.queue_name}
          </h3>
        </div>
        <StatusBadge status={queue.cashier_status} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Main Metrics Row */}
        <div className="flex-between">
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Shoppers in Queue
            </span>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: isOverloaded ? 'var(--priority-critical-text)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Users size={18} />
              <span>{isOpen ? queue.shopper_count : 0}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Est. Wait Time
            </span>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: queue.estimated_wait_sec > 400 ? 'var(--priority-critical-text)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}
            >
              <Clock size={16} />
              <span>{isOpen ? `${Math.round(queue.estimated_wait_sec / 60)} min` : '0 min'}</span>
            </div>
          </div>
        </div>

        {/* Queue Depth Capacity Meter */}
        <div>
          <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Queue Capacity Meter</span>
            <span>{queue.shopper_count} / 8 Max</span>
          </div>
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${
                capacityPct > 70 ? 'fill-critical' : capacityPct > 40 ? 'fill-warning' : 'fill-good'
              }`}
              style={{ width: `${isOpen ? capacityPct : 0}%` }}
            />
          </div>
        </div>

        {/* AI Recommendation Strip */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>AI Recommendation: </span>
          <span>{queue.recommendation}</span>
        </div>

        {/* Close Confirmation Dialog Warning */}
        {isConfirmingClose && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--priority-critical-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--priority-critical-text)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Close Counter with {queue.shopper_count} waiting shoppers?
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                className="btn btn-action-critical btn-sm"
                onClick={handleToggle}
              >
                Confirm Close
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsConfirmingClose(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {!isConfirmingClose && (
          <div className="flex-between" style={{ paddingTop: 'var(--space-xs)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onInspect}
            >
              Inspect Camera Feed
            </button>

            <button
              className={`btn ${
                isOpen ? 'btn-secondary' : 'btn-primary'
              } btn-sm`}
              disabled={isExecuting}
              onClick={handleToggle}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isOpen ? (
                <>
                  <Power size={13} />
                  <span>Close Counter</span>
                </>
              ) : (
                <>
                  <Power size={13} />
                  <span>Open Counter</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
