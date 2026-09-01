import React, { useState, useMemo } from 'react';
import { ShelfStatusResponseDTO } from '../../types/api';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { Search, Filter, ShoppingBag, ArrowUpDown, Loader2, ArrowRight } from 'lucide-react';

interface InventoryTableProps {
  shelves: ShelfStatusResponseDTO[];
  onSelectAisle?: (shelf: ShelfStatusResponseDTO) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ shelves, onSelectAisle }) => {
  const { executeAction, activeAction } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filteredShelves = useMemo(() => {
    return shelves
      .filter((s) => {
        const matchesSearch =
          s.aisle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          filterStatus === 'ALL' ||
          (filterStatus === 'LOW_STOCK' && (s.fill_percentage <= 30.0 || s.is_out_of_stock)) ||
          (filterStatus === 'CRITICAL' && (s.fill_percentage <= 15.0 || s.is_out_of_stock)) ||
          (filterStatus === 'GOOD' && s.fill_percentage > 30.0 && !s.is_out_of_stock);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        return sortAsc
          ? a.fill_percentage - b.fill_percentage
          : b.fill_percentage - a.fill_percentage;
      });
  }, [shelves, searchQuery, filterStatus, sortAsc]);

  return (
    <div className="card">
      <div className="card-header flex-between">
        <div>
          <h2 className="text-h2">Store Aisle Shelf Inventory</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Edge camera computer vision shelf fill & out-of-stock monitoring
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              fontSize: 12,
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search aisle or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: 12,
                width: 180,
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              color: 'var(--text-secondary)',
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CRITICAL">Critical Out of Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="GOOD">Good Stock</option>
          </select>

          {/* Sort Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSortAsc(!sortAsc)}
            title="Sort by Fill Percentage"
          >
            <ArrowUpDown size={13} />
            <span>Sort Fill %</span>
          </button>

          {/* Bulk Restock Dispatch Button */}
          {shelves.some((s) => s.fill_percentage <= 30 || s.is_out_of_stock) && (
            <button
              className="btn btn-action-warning btn-sm"
              onClick={async () => {
                const lowShelves = shelves.filter((s) => s.fill_percentage <= 30 || s.is_out_of_stock);
                for (const s of lowShelves) {
                  await executeAction({
                    id: `restock-${s.id}`,
                    type: 'DISPATCH_RESTOCK',
                    label: `DISPATCH RESTOCK`,
                    entityId: s.aisle_name,
                    endpoint: `/inventory/restock/${encodeURIComponent(s.aisle_name)}`,
                    method: 'POST',
                    status: 'AVAILABLE',
                  });
                }
              }}
              title="Dispatch restock tasks for all low shelves"
            >
              <ShoppingBag size={13} />
              <span>Restock All Low Shelves</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="op-table">
          <thead>
            <tr>
              <th>Aisle Location</th>
              <th>Product Category</th>
              <th>Shelf Fill Level</th>
              <th>Items Remaining</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Operational Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredShelves.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                  No inventory shelves matching selected criteria.
                </td>
              </tr>
            ) : (
              filteredShelves.map((shelf) => {
                const isCritical = shelf.fill_percentage <= 20.0 || shelf.is_out_of_stock;
                const isExecuting =
                  activeAction?.entityId === shelf.aisle_name && activeAction?.status === 'EXECUTING';

                return (
                  <tr
                    key={shelf.id}
                    onClick={() => onSelectAisle && onSelectAisle(shelf)}
                    style={{ cursor: onSelectAisle ? 'pointer' : 'default' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {shelf.aisle_name}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{shelf.category}</span>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar-container" style={{ flex: 1 }}>
                          <div
                            className={`progress-bar-fill ${
                              shelf.fill_percentage <= 15
                                ? 'fill-critical'
                                : shelf.fill_percentage <= 35
                                ? 'fill-warning'
                                : 'fill-good'
                            }`}
                            style={{ width: `${Math.max(5, shelf.fill_percentage)}%` }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'var(--font-family-mono)',
                            color: isCritical
                              ? 'var(--priority-critical-text)'
                              : 'var(--text-primary)',
                            minWidth: 42,
                          }}
                        >
                          {shelf.fill_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                        {shelf.product_count} units
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={shelf.status_label || (isCritical ? 'LOW_STOCK' : 'GOOD')} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isCritical ? (
                        <button
                          className="btn btn-action-warning btn-sm"
                          disabled={isExecuting}
                          onClick={(e) => {
                            e.stopPropagation();
                            executeAction({
                              id: `restock-${shelf.id}`,
                              type: 'DISPATCH_RESTOCK',
                              label: `DISPATCH RESTOCK`,
                              entityId: shelf.aisle_name,
                              endpoint: `/inventory/restock/${encodeURIComponent(shelf.aisle_name)}`,
                              method: 'POST',
                              status: 'AVAILABLE',
                            });
                          }}
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={12} />
                              <span>Dispatch Restock</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectAisle) onSelectAisle(shelf);
                          }}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
