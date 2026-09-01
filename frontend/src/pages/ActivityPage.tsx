import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Activity, CheckCircle2, Filter, Search, Loader2, Download, CheckCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ActivityPage: React.FC = () => {
  const { alerts, executeAction, activeAction, refreshAll } = useStore();
  const { showToast } = useToast();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBulkAck, setIsBulkAck] = useState<boolean>(false);

  const activeAlerts = alerts.filter((a) => !a.is_acknowledged);

  const handleExportCSV = () => {
    if (alerts.length === 0) {
      showToast('No alerts to export.', 'info');
      return;
    }
    const headers = 'ID,Timestamp,Severity,Type,Title,Message,Source,Resolved\n';
    const rows = alerts
      .map(
        (a) =>
          `"${a.id}","${a.timestamp}","${a.severity}","${a.alert_type}","${a.title.replace(/"/g, '""')}","${a.message.replace(/"/g, '""')}","${a.source_id || ''}","${a.is_acknowledged}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexora_retail_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Audit log exported to CSV successfully!', 'success');
  };

  const handleAcknowledgeAll = async () => {
    if (activeAlerts.length === 0) {
      showToast('No active unresolved alerts.', 'info');
      return;
    }
    setIsBulkAck(true);
    try {
      for (const alert of activeAlerts) {
        await executeAction({
          id: `ack-${alert.id}`,
          type: 'ACKNOWLEDGE_ALERT',
          label: 'ACKNOWLEDGE',
          entityId: alert.id.toString(),
          endpoint: `/alerts/${alert.id}/acknowledge`,
          method: 'POST',
          status: 'AVAILABLE',
        });
      }
      showToast(`Acknowledged ${activeAlerts.length} unresolved alerts.`, 'success');
      await refreshAll();
    } catch (err: any) {
      showToast(`Bulk acknowledge error: ${err.message || 'Failed'}`, 'error');
    } finally {
      setIsBulkAck(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity =
      filterSeverity === 'ALL' ||
      (filterSeverity === 'CRITICAL' && a.severity === 'CRITICAL') ||
      (filterSeverity === 'WARNING' && a.severity === 'WARNING') ||
      (filterSeverity === 'RESOLVED' && a.is_acknowledged) ||
      (filterSeverity === 'ACTIVE' && !a.is_acknowledged);

    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.source_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSeverity && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Search & Filter Header */}
      <div className="card-header flex-between" style={{ padding: '0 0 var(--space-md) 0' }}>
        <div>
          <h2 className="text-h2">Edge AI Detection & Event Timeline</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Chronological audit log of computer vision threshold triggers and resolutions
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Export CSV Button */}
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} title="Export audit events as CSV">
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {/* Acknowledge All Active Button */}
          {activeAlerts.length > 0 && (
            <button
              className="btn btn-action-warning btn-sm"
              disabled={isBulkAck}
              onClick={handleAcknowledgeAll}
              title="Acknowledge all unresolved alerts"
            >
              <CheckCheck size={13} />
              <span>{isBulkAck ? 'Resolving...' : `Resolve All (${activeAlerts.length})`}</span>
            </button>
          )}
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
              placeholder="Search events or sources..."
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

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['ALL', 'ACTIVE', 'CRITICAL', 'WARNING', 'RESOLVED'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filterSeverity === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 11 }}
                onClick={() => setFilterSeverity(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Stream */}
      <div className="card">
        {filteredAlerts.length === 0 ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No operational events matching selected filters.
          </div>
        ) : (
          <div className="timeline-feed">
            {filteredAlerts.map((alert) => {
              const timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dateStr = new Date(alert.timestamp).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });
              const isResolved = alert.is_acknowledged;
              const isExecuting =
                activeAction?.entityId === alert.id.toString() && activeAction?.status === 'EXECUTING';

              return (
                <div
                  key={alert.id}
                  className="timeline-item"
                  style={{
                    backgroundColor: isResolved ? 'var(--bg-card-subtle)' : 'rgba(239, 68, 68, 0.05)',
                    borderColor: isResolved ? 'var(--border-subtle)' : 'var(--priority-critical-border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span className="timeline-time" style={{ fontWeight: 600 }}>{timeStr}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dateStr}</span>
                  </div>

                  <div className="timeline-content">
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PriorityBadge
                          priority={
                            alert.severity === 'CRITICAL'
                              ? 'CRITICAL'
                              : alert.severity === 'INFO'
                              ? 'LOW'
                              : 'HIGH'
                          }
                        />
                        <span className="timeline-title">{alert.title}</span>
                      </div>

                      {isResolved ? (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--priority-normal-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Acknowledged & Resolved</span>
                        </span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isExecuting}
                          onClick={() =>
                            executeAction({
                              id: `ack-page-${alert.id}`,
                              type: 'ACKNOWLEDGE_ALERT',
                              label: 'ACKNOWLEDGE',
                              entityId: alert.id.toString(),
                              endpoint: `/alerts/${alert.id}/acknowledge`,
                              method: 'POST',
                              status: 'AVAILABLE',
                            })
                          }
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Resolving...</span>
                            </>
                          ) : (
                            <span>Acknowledge Alert</span>
                          )}
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {alert.message}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Source ID: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{alert.source_id || 'System'}</strong></span>
                      <span>Type: <strong style={{ color: 'var(--text-secondary)' }}>{alert.alert_type}</strong></span>
                      {alert.resolved_at && (
                        <span>Resolved At: {new Date(alert.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
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
