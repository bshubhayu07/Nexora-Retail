import React from 'react';
import { ShelfStatusResponseDTO } from '../../types/api';
import { useStore } from '../../context/StoreContext';
import { ShoppingBag, AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface RestockQueueProps {
  shelves: ShelfStatusResponseDTO[];
}

export const RestockQueue: React.FC<RestockQueueProps> = ({ shelves }) => {
  const { executeAction, activeAction } = useStore();

  const urgentShelves = shelves
    .filter((s) => s.fill_percentage <= 30.0 || s.is_out_of_stock)
    .sort((a, b) => a.fill_percentage - b.fill_percentage);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="text-h2">Priority Restock Queue</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Aisles requiring immediate store floor staff replenishment
          </p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: urgentShelves.length > 0 ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)' }}>
          {urgentShelves.length} Tasks Pending
        </span>
      </div>

      {urgentShelves.length === 0 ? (
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color="var(--priority-normal-border)" />
          <span>All monitored shelves are sufficiently stocked (&gt; 35% fill).</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {urgentShelves.map((shelf) => {
            const isExecuting =
              activeAction?.entityId === shelf.aisle_name && activeAction?.status === 'EXECUTING';

            return (
              <div
                key={shelf.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-card-subtle)',
                  border: '1px solid var(--priority-high-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--priority-critical-border)',
                    }}
                  >
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {shelf.aisle_name} — {shelf.category}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--priority-critical-text)' }}>
                      Fill: {shelf.fill_percentage.toFixed(1)}% ({shelf.product_count} units left)
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-action-warning btn-sm"
                  disabled={isExecuting}
                  onClick={() =>
                    executeAction({
                      id: `restock-queue-${shelf.id}`,
                      type: 'DISPATCH_RESTOCK',
                      label: `DISPATCH RESTOCK`,
                      entityId: shelf.aisle_name,
                      endpoint: `/inventory/restock/${encodeURIComponent(shelf.aisle_name)}`,
                      method: 'POST',
                      status: 'AVAILABLE',
                    })
                  }
                >
                  {isExecuting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={12} />
                      <span>Dispatch Team</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
