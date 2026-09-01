import React from 'react';
import { ShelfStatusResponseDTO } from '../../types/api';
import { Drawer } from '../common/Drawer';
import { StatusBadge } from '../common/StatusBadge';
import { ShoppingBag, Eye, ShieldCheck, AlertCircle } from 'lucide-react';

interface AisleDrawerProps {
  shelf: ShelfStatusResponseDTO | null;
  onClose: () => void;
  onDispatchRestock?: () => void;
}

export const AisleDrawer: React.FC<AisleDrawerProps> = ({
  shelf,
  onClose,
  onDispatchRestock,
}) => {
  if (!shelf) return null;

  const isLow = shelf.fill_percentage <= 30.0 || shelf.is_out_of_stock;

  return (
    <Drawer
      isOpen={!!shelf}
      onClose={onClose}
      title={`${shelf.aisle_name} — ${shelf.category}`}
      subtitle={`Inventory Health Diagnostic`}
      footer={
        isLow && onDispatchRestock ? (
          <button className="btn btn-action-warning btn-sm" onClick={onDispatchRestock}>
            <ShoppingBag size={14} /> Dispatch Restock Task
          </button>
        ) : undefined
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Status Header */}
        <div className="flex-between" style={{ padding: '12px 16px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Inventory Stock Status
          </span>
          <StatusBadge status={shelf.status_label || (isLow ? 'LOW_STOCK' : 'GOOD')} />
        </div>

        {/* Fill Percentage & Units */}
        <div>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            Physical Shelf Fill Capacity
          </h3>
          <div className="card-subtle">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Current Level</span>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: isLow ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)' }}>
                {shelf.fill_percentage.toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className={`progress-bar-fill ${
                  shelf.fill_percentage <= 15 ? 'fill-critical' : shelf.fill_percentage <= 35 ? 'fill-warning' : 'fill-good'
                }`}
                style={{ width: `${Math.max(5, shelf.fill_percentage)}%` }}
              />
            </div>
            <div className="flex-between" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Remaining units: {shelf.product_count} items</span>
              <span>Nominal capacity: ~40 items</span>
            </div>
          </div>
        </div>

        {/* Edge Vision Telemetry */}
        <div>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            Qualcomm On-Device Camera Classification
          </h3>
          <div className="card-subtle" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Monitoring Camera</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)' }}>cam-04-aisle-3</span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Classification Latency</span>
              <span style={{ fontSize: 12 }}>12.4ms (Edge SNPE)</span>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Privacy Policy</span>
              <span style={{ fontSize: 12, color: 'var(--priority-normal-text)' }}>100% On-Device Anonymized</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
