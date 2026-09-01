import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { RestockQueue } from '../components/inventory/RestockQueue';
import { AisleDrawer } from '../components/inventory/AisleDrawer';
import { MetricCard } from '../components/common/MetricCard';
import { ShelfStatusResponseDTO } from '../types/api';
import { ShoppingBag, AlertTriangle, CheckCircle, Package } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { shelves, executeAction } = useStore();
  const [selectedShelf, setSelectedShelf] = useState<ShelfStatusResponseDTO | null>(null);

  const lowCount = shelves.filter((s) => s.fill_percentage <= 20.0 || s.is_out_of_stock).length;
  const avgFill = shelves.length > 0 ? shelves.reduce((sum, s) => sum + s.fill_percentage, 0) / shelves.length : 100;
  const totalUnits = shelves.reduce((sum, s) => sum + s.product_count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Inventory KPI Summary */}
      <div className="grid-3">
        <MetricCard
          label="Monitored Shelf Aisles"
          value={shelves.length}
          sub="Edge camera automated scans"
          icon={<Package size={16} color="var(--accent-primary)" />}
        />
        <MetricCard
          label="Average Shelf Fill Level"
          value={`${avgFill.toFixed(1)}%`}
          sub="Storewide inventory capacity"
          icon={<CheckCircle size={16} color="var(--priority-normal-border)" />}
        />
        <MetricCard
          label="Low Stock / Out of Stock"
          value={lowCount}
          sub="Requires floor restocking"
          icon={<AlertTriangle size={16} color="var(--priority-critical-border)" />}
          trend={lowCount > 0 ? 'Action Advised' : 'Optimal'}
        />
      </div>

      {/* Priority Restock Queue */}
      <RestockQueue shelves={shelves} />

      {/* Full Inventory Table */}
      <InventoryTable
        shelves={shelves}
        onSelectAisle={(shelf) => setSelectedShelf(shelf)}
      />

      <AisleDrawer
        shelf={selectedShelf}
        onClose={() => setSelectedShelf(null)}
        onDispatchRestock={() => {
          if (selectedShelf) {
            executeAction({
              id: `restock-drawer-${selectedShelf.id}`,
              type: 'DISPATCH_RESTOCK',
              label: `DISPATCH RESTOCK`,
              entityId: selectedShelf.aisle_name,
              endpoint: `/inventory/restock/${encodeURIComponent(selectedShelf.aisle_name)}`,
              method: 'POST',
              status: 'AVAILABLE',
            });
            setSelectedShelf(null);
          }
        }}
      />
    </div>
  );
};
