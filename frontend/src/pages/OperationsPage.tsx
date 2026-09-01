import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CounterCard } from '../components/queue/CounterCard';
import { RestockQueue } from '../components/inventory/RestockQueue';
import { QueueDrawer } from '../components/queue/QueueDrawer';
import { AisleDrawer } from '../components/inventory/AisleDrawer';
import { QueueStatusResponseDTO, ShelfStatusResponseDTO } from '../types/api';
import { Flame, ShoppingBag, ArrowRight } from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const { queues, shelves, setCurrentRoute } = useStore();
  const [selectedQueue, setSelectedQueue] = useState<QueueStatusResponseDTO | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<ShelfStatusResponseDTO | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Checkout Queues Section */}
      <div>
        <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={18} color="var(--accent-primary)" />
            <h2 className="text-h2">Checkout Counters Live Status</h2>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentRoute('queues')}
          >
            <span>Full Queue Control</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid-3">
          {queues.map((q) => (
            <CounterCard
              key={q.queue_id}
              queue={q}
              onInspect={() => setSelectedQueue(q)}
            />
          ))}
        </div>
      </div>

      {/* Priority Shelf Restock Queue */}
      <div>
        <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} color="var(--priority-high-border)" />
            <h2 className="text-h2">Inventory Restocking Tasks</h2>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentRoute('inventory')}
          >
            <span>Full Inventory Grid</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <RestockQueue shelves={shelves} />
      </div>

      {/* Drawers */}
      <QueueDrawer queue={selectedQueue} onClose={() => setSelectedQueue(null)} />
      <AisleDrawer shelf={selectedShelf} onClose={() => setSelectedShelf(null)} />
    </div>
  );
};
