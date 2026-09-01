import React from 'react';
import { QueueStatusResponseDTO } from '../../types/api';
import { Drawer } from '../common/Drawer';
import { StatusBadge } from '../common/StatusBadge';
import { Camera, Clock, Users, ShieldCheck, Activity } from 'lucide-react';

interface QueueDrawerProps {
  queue: QueueStatusResponseDTO | null;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ queue, onClose }) => {
  if (!queue) return null;

  return (
    <Drawer
      isOpen={!!queue}
      onClose={onClose}
      title={queue.queue_name}
      subtitle={`Queue ID: ${queue.queue_id}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Status Header */}
        <div className="flex-between" style={{ padding: '12px 16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Cashier Status
          </span>
          <StatusBadge status={queue.cashier_status} />
        </div>

        {/* Live Vision Metrics */}
        <div>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            Real-time Edge Vision Analytics
          </h3>
          <div className="grid-2">
            <div className="card-subtle">
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Occupants Waiting</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{queue.shopper_count} Shoppers</div>
            </div>
            <div className="card-subtle">
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Wait</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                {Math.round(queue.estimated_wait_sec / 60)} min
              </div>
            </div>
          </div>
        </div>

        {/* Hardware Ingestion Mapping */}
        <div>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            Sensor & Edge Camera Ingestion
          </h3>
          <div className="card-subtle" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Camera Device ID</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)', color: 'var(--text-primary)' }}>
                {queue.camera_id}
              </span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Edge Inference Model</span>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>YOLOv8-Nano SNPE Quantized</span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Inference Hardware</span>
              <span style={{ fontSize: 12, color: 'var(--accent-qualcomm)', fontWeight: 600 }}>Qualcomm QCS8550 NPU</span>
            </div>
          </div>
        </div>

        {/* AI Allocation Recommendation */}
        <div>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            Operational Guidance
          </h3>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <strong>Recommendation:</strong> {queue.recommendation}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
