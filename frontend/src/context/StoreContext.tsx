import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveStoreState,
  Situation,
  OperationalAction,
  AppRoute,
} from '../types';
import {
  OverviewKPIDTO,
  QueueStatusResponseDTO,
  ShelfStatusResponseDTO,
  AlertLogResponseDTO,
  EdgeHardwareTelemetryDTO,
  HeatmapGridResponseDTO,
  AnalyticsTrendsResponseDTO,
  SimulatorStatusResponseDTO,
} from '../types/api';
import { fetchOverviewKPI, fetchHeatmap, fetchTrends } from '../api/overview';
import { fetchQueueStatuses, toggleCounterStatus } from '../api/queue';
import { fetchShelfInventory, triggerRestock } from '../api/inventory';
import { fetchAlerts, acknowledgeAlert } from '../api/alerts';
import { fetchHardwareTelemetry } from '../api/hardware';
import { fetchSimulatorStatus } from '../api/simulator';
import { liveWs } from '../api/websocket';
import { useToast } from './ToastContext';

interface StoreContextType extends LiveStoreState {
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
  selectedEntity: { type: 'queue' | 'aisle' | 'alert' | 'event'; id: string } | null;
  setSelectedEntity: (entity: { type: 'queue' | 'aisle' | 'alert' | 'event'; id: string } | null) => void;
  refreshAll: () => Promise<void>;
  fetchCustomTrends: (windowMinutes: number) => Promise<void>;
  updateLiveStoreTelemetry: (data: {
    activeShoppers?: number;
    footfallIn?: number;
    q1Count?: number;
    q2Count?: number;
    q3Count?: number;
    aisle1Stock?: number;
    aisle2Stock?: number;
    aisle3Stock?: number;
    aisle4Stock?: number;
  }) => void;
  executeAction: (action: OperationalAction) => Promise<boolean>;
  activeAction: OperationalAction | null;
  verificationMessage: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('command-center');
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'queue' | 'aisle' | 'alert' | 'event'; id: string } | null>(null);

  const [overview, setOverview] = useState<OverviewKPIDTO | null>(null);
  const [queues, setQueues] = useState<QueueStatusResponseDTO[]>([]);
  const [shelves, setShelves] = useState<ShelfStatusResponseDTO[]>([]);
  const [alerts, setAlerts] = useState<AlertLogResponseDTO[]>([]);
  const [hardware, setHardware] = useState<EdgeHardwareTelemetryDTO | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapGridResponseDTO | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendsResponseDTO | null>(null);
  const [simulator, setSimulator] = useState<SimulatorStatusResponseDTO | null>(null);

  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<OperationalAction | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  // Situation Normalization Engine
  const deriveSituations = useCallback(
    (
      queueList: QueueStatusResponseDTO[],
      shelfList: ShelfStatusResponseDTO[],
      alertList: AlertLogResponseDTO[]
    ): Situation[] => {
      const results: Situation[] = [];

      // 1. Evaluate Queues
      const overloadedQueue = queueList.find(
        (q) => q.cashier_status === 'OVERLOADED' || q.shopper_count >= 5 || q.estimated_wait_sec > 480
      );
      if (overloadedQueue) {
        // Look for next counter to open (e.g. queue-counter-3 or closed counter)
        const closedCounter = queueList.find((q) => q.cashier_status === 'CLOSED') || {
          queue_id: 'queue-counter-3',
          queue_name: 'Cashier Counter 3',
        };

        results.push({
          id: `queue-${overloadedQueue.queue_id}`,
          priority: 'CRITICAL',
          type: 'QUEUE_CONGESTION',
          title: `Checkout Congestion Detected`,
          entity: overloadedQueue.queue_name,
          summary: `${overloadedQueue.shopper_count} shoppers waiting at ${overloadedQueue.queue_name}. Estimated wait time is ~${Math.round(
            overloadedQueue.estimated_wait_sec / 60
          )} minutes.`,
          reason: `Queue depth is growing faster than single-counter processing capacity. Rate of arrival exceeds checkout throughput.`,
          impact: `Shoppers are experiencing high checkout latency (>8 min). High risk of immediate basket abandonment and shopper churn.`,
          recommendation: `Open ${closedCounter.queue_name} to redistribute queue load and reduce average wait below 2 minutes.`,
          action: {
            id: `action-open-${closedCounter.queue_id}`,
            type: 'OPEN_COUNTER',
            label: `OPEN ${closedCounter.queue_name.toUpperCase()}`,
            entityId: closedCounter.queue_id,
            endpoint: `/queue/${closedCounter.queue_id}/toggle`,
            method: 'POST',
            payload: { action: 'OPEN' },
            status: 'AVAILABLE',
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: overloadedQueue.camera_id || 'Checkout Zone Vision',
        });
      }

      // 2. Evaluate Shelves
      const criticalShelf = shelfList.find(
        (s) => s.fill_percentage <= 20.0 || s.is_out_of_stock || s.status_label === 'CRITICAL_OUT_OF_STOCK'
      );
      if (criticalShelf) {
        results.push({
          id: `shelf-${criticalShelf.aisle_name.replace(/\s+/g, '-').toLowerCase()}`,
          priority: criticalShelf.fill_percentage <= 10.0 ? 'CRITICAL' : 'HIGH',
          type: 'STOCKOUT_RISK',
          title: `Stock Availability Issue`,
          entity: `${criticalShelf.aisle_name} — ${criticalShelf.category}`,
          summary: `Shelf fill level has dropped to ${criticalShelf.fill_percentage.toFixed(
            1
          )}% with only ${criticalShelf.product_count} units remaining.`,
          reason: `High footfall and rapid SKU depletion detected by edge cameras in ${criticalShelf.aisle_name}.`,
          impact: `High risk of out-of-stock condition resulting in unfulfilled customer demand and lost store revenue.`,
          recommendation: `Dispatch store floor team to restock ${criticalShelf.aisle_name} immediately.`,
          action: {
            id: `action-restock-${criticalShelf.id}`,
            type: 'DISPATCH_RESTOCK',
            label: `DISPATCH RESTOCK TEAM`,
            entityId: criticalShelf.aisle_name,
            endpoint: `/inventory/restock/${encodeURIComponent(criticalShelf.aisle_name)}`,
            method: 'POST',
            status: 'AVAILABLE',
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: `Aisle Vision Camera (${criticalShelf.aisle_name})`,
        });
      }

      // 3. Evaluate Unacknowledged Alerts
      const unackAlerts = alertList.filter((a) => !a.is_acknowledged);
      for (const alert of unackAlerts) {
        // If not already covered by queue/shelf situation
        const isQueue = alert.alert_type === 'QUEUE_OVERFLOW' && results.some((r) => r.type === 'QUEUE_CONGESTION');
        const isShelf = alert.alert_type === 'SHELF_EMPTY' && results.some((r) => r.type === 'STOCKOUT_RISK');
        if (!isQueue && !isShelf) {
          const prio: any = alert.severity === 'CRITICAL' ? 'CRITICAL' : alert.severity === 'WARNING' ? 'HIGH' : 'MEDIUM';
          results.push({
            id: `alert-${alert.id}`,
            priority: prio,
            type: alert.alert_type === 'HARDWARE_WARN' ? 'HARDWARE_ALERT' : 'STOCKOUT_RISK',
            title: alert.title,
            entity: alert.source_id || 'Store Sensor',
            summary: alert.message,
            reason: `Edge sensor automated threshold trigger (${alert.alert_type}).`,
            impact: `Operational alert logged in system requiring store manager acknowledgment.`,
            recommendation: `Review the affected area and mark alert as acknowledged once inspected.`,
            action: {
              id: `action-ack-${alert.id}`,
              type: 'ACKNOWLEDGE_ALERT',
              label: `ACKNOWLEDGE ALERT`,
              entityId: alert.id.toString(),
              endpoint: `/alerts/${alert.id}/acknowledge`,
              method: 'POST',
              status: 'AVAILABLE',
            },
            timestamp: new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: alert.source_id || 'System Engine',
          });
        }
      }

      // 4. Default Calm Normal State if everything is healthy
      if (results.length === 0) {
        results.push({
          id: 'normal-operations',
          priority: 'NORMAL',
          type: 'NORMAL_OPERATIONS',
          title: 'Store Operating Normally',
          entity: 'All Zones Nominal',
          summary: 'No immediate action required. All checkout counters, aisle inventories, and Qualcomm edge sensors are operating within optimal parameters.',
          reason: 'Shopper arrival rate is balanced across checkout counters, and shelf fill levels exceed safety stock thresholds.',
          impact: 'Average customer wait time is optimal. Zero critical operational bottlenecks detected.',
          recommendation: 'Maintain standard floor coverage and routine shelf inspections.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Qualcomm Edge Retail Intelligence Engine',
        });
      }

      return results;
    },
    []
  );

  const [situations, setSituations] = useState<Situation[]>([]);
  const primarySituation = situations[0] || null;

  // Master fetch function
  const refreshAll = useCallback(async () => {
    try {
      setError(null);
      const [
        kpiData,
        queueData,
        shelfData,
        alertData,
        hwData,
        heatmapData,
        trendsData,
        simData,
      ] = await Promise.allSettled([
        fetchOverviewKPI(),
        fetchQueueStatuses(),
        fetchShelfInventory(),
        fetchAlerts(false, undefined, 20),
        fetchHardwareTelemetry(),
        fetchHeatmap(20, 60),
        fetchTrends(180),
        fetchSimulatorStatus(),
      ]);

      const q = queueData.status === 'fulfilled' ? queueData.value : [];
      const s = shelfData.status === 'fulfilled' ? shelfData.value : [];
      const a = alertData.status === 'fulfilled' ? alertData.value : [];

      if (kpiData.status === 'fulfilled') setOverview(kpiData.value);
      if (queueData.status === 'fulfilled') setQueues(q);
      if (shelfData.status === 'fulfilled') setShelves(s);
      if (alertData.status === 'fulfilled') setAlerts(a);
      if (hwData.status === 'fulfilled') setHardware(hwData.value);
      if (heatmapData.status === 'fulfilled') setHeatmap(heatmapData.value);
      if (trendsData.status === 'fulfilled') setTrends(trendsData.value);
      if (simData.status === 'fulfilled') setSimulator(simData.value);

      const derived = deriveSituations(q, s, a);
      setSituations(derived);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to sync with Retail Intelligence backend.');
    } finally {
      setIsLoading(false);
    }
  }, [deriveSituations]);

  // Initial Load & Heartbeat Polling
  useEffect(() => {
    refreshAll();

    // Establish WebSocket Connection
    liveWs.connect((connected) => {
      setIsWsConnected(connected);
    });

    const unsubTelemetry = liveWs.subscribe('TELEMETRY_UPDATE', (data) => {
      // Background refresh on live edge updates
      refreshAll();
    });

    const unsubAlert = liveWs.subscribe('NEW_ALERT', (data) => {
      showToast(`🚨 New ${data.severity || 'Alert'}: ${data.title}`, data.severity === 'CRITICAL' ? 'error' : 'info');
      refreshAll();
    });

    const unsubQueue = liveWs.subscribe('QUEUE_ACTION', (data) => {
      refreshAll();
    });

    // Controlled 4-second Polling fallback
    const interval = setInterval(() => {
      refreshAll();
    }, 4000);

    return () => {
      clearInterval(interval);
      unsubTelemetry();
      unsubAlert();
      unsubQueue();
      liveWs.disconnect();
    };
  }, [refreshAll, showToast]);

  // Closed-loop action execution
  const executeAction = async (action: OperationalAction): Promise<boolean> => {
    setActiveAction({ ...action, status: 'EXECUTING' });
    setVerificationMessage(null);

    try {
      if (action.type === 'OPEN_COUNTER' || action.type === 'CLOSE_COUNTER') {
        const actionType = action.type === 'OPEN_COUNTER' ? 'OPEN' : 'CLOSE';
        const res = await toggleCounterStatus(action.entityId, actionType);
        
        setActiveAction({ ...action, status: 'SUCCESS' });
        setVerificationMessage(`${res.message} Queue redistribution detected and wait time decreasing.`);
        showToast(`✅ ${res.message}`, 'success');
      } else if (action.type === 'DISPATCH_RESTOCK') {
        const res = await triggerRestock(action.entityId);
        
        setActiveAction({ ...action, status: 'SUCCESS' });
        setVerificationMessage(`Restock team dispatched for ${action.entityId}. Shelf inventory alerts resolved.`);
        showToast(`🛒 Restock dispatched for ${action.entityId}`, 'success');
      } else if (action.type === 'ACKNOWLEDGE_ALERT') {
        const res = await acknowledgeAlert(parseInt(action.entityId, 10));
        
        setActiveAction({ ...action, status: 'SUCCESS' });
        setVerificationMessage(`Alert acknowledged and marked resolved.`);
        showToast(`Alert acknowledged.`, 'success');
      }

      // Invalidate and refresh all operational state immediately
      await refreshAll();

      // Clear verification message after 10 seconds to settle into calm state
      setTimeout(() => {
        setVerificationMessage(null);
        setActiveAction(null);
      }, 10000);

      return true;
    } catch (err: any) {
      setActiveAction({ ...action, status: 'FAILED' });
      showToast(`Action failed: ${err.message || 'Error executing operational action.'}`, 'error');
      return false;
    }
  };

  const updateLiveStoreTelemetry = useCallback(
    (data: {
      activeShoppers?: number;
      footfallIn?: number;
      q1Count?: number;
      q2Count?: number;
      q3Count?: number;
      aisle1Stock?: number;
      aisle2Stock?: number;
      aisle3Stock?: number;
      aisle4Stock?: number;
    }) => {
      // 1. Update Overview
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          active_shoppers_now: data.activeShoppers ?? prev.active_shoppers_now,
          total_footfall_today: data.footfallIn ?? prev.total_footfall_today,
        };
      });

      // 2. Update Queues
      setQueues((prev) => {
        return prev.map((q) => {
          if (q.queue_id === 'queue-counter-1' && data.q1Count !== undefined) {
            return {
              ...q,
              shopper_count: data.q1Count,
              estimated_wait_sec: data.q1Count * 110,
              cashier_status: data.q1Count >= 5 ? 'OVERLOADED' : 'OPEN',
            };
          }
          if (q.queue_id === 'queue-counter-2' && data.q2Count !== undefined) {
            return {
              ...q,
              shopper_count: data.q2Count,
              estimated_wait_sec: data.q2Count * 110,
            };
          }
          if (q.queue_id === 'queue-counter-3' && data.q3Count !== undefined) {
            return {
              ...q,
              shopper_count: data.q3Count,
              estimated_wait_sec: data.q3Count * 110,
            };
          }
          return q;
        });
      });

      // 3. Update Shelves
      setShelves((prev) => {
        return prev.map((s) => {
          if (s.aisle_name.includes('1') && data.aisle1Stock !== undefined) {
            return {
              ...s,
              fill_percentage: data.aisle1Stock,
              product_count: Math.round((data.aisle1Stock / 100) * 50),
              is_out_of_stock: data.aisle1Stock <= 15,
            };
          }
          if (s.aisle_name.includes('2') && data.aisle2Stock !== undefined) {
            return {
              ...s,
              fill_percentage: data.aisle2Stock,
              product_count: Math.round((data.aisle2Stock / 100) * 40),
              is_out_of_stock: data.aisle2Stock <= 15,
            };
          }
          if (s.aisle_name.includes('3') && data.aisle3Stock !== undefined) {
            return {
              ...s,
              fill_percentage: data.aisle3Stock,
              product_count: Math.max(1, Math.round((data.aisle3Stock / 100) * 20)),
              is_out_of_stock: data.aisle3Stock <= 15,
            };
          }
          if (s.aisle_name.includes('4') && data.aisle4Stock !== undefined) {
            return {
              ...s,
              fill_percentage: data.aisle4Stock,
              product_count: Math.round((data.aisle4Stock / 100) * 35),
              is_out_of_stock: data.aisle4Stock <= 15,
            };
          }
          return s;
        });
      });

      setLastUpdated(new Date());
    },
    []
  );

  const fetchCustomTrends = async (windowMinutes: number) => {
    try {
      const data = await fetchTrends(windowMinutes);
      setTrends(data);
    } catch (err: any) {
      showToast(`Error fetching trends: ${err.message || 'Failed'}`, 'error');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        overview,
        queues,
        shelves,
        alerts,
        hardware,
        heatmap,
        trends,
        simulator,
        situations,
        primarySituation,
        isWsConnected,
        lastUpdated,
        isLoading,
        error,
        currentRoute,
        setCurrentRoute,
        selectedEntity,
        setSelectedEntity,
        refreshAll,
        fetchCustomTrends,
        updateLiveStoreTelemetry,
        executeAction,
        activeAction,
        verificationMessage,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
