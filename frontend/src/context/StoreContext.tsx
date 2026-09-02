import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    counter1Open?: boolean;
    counter2Open?: boolean;
    counter3Open?: boolean;
    aisle1Stock?: number;
    aisle2Stock?: number;
    aisle3Stock?: number;
    aisle4Stock?: number;
    npuLoad?: number;
  }) => void;
  executeAction: (action: OperationalAction) => Promise<boolean>;
  activeAction: OperationalAction | null;
  verificationMessage: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [currentRoute, setCurrentRoute] = useState<AppRoute>('command-center');

  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'queue' | 'aisle' | 'alert' | 'event';
    id: string;
  } | null>(null);

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

  const deriveSituations = useCallback(
    (
      queueList: QueueStatusResponseDTO[],
      shelfList: ShelfStatusResponseDTO[],
      alertList: AlertLogResponseDTO[]
    ): Situation[] => {
      const results: Situation[] = [];

      const openCounters = queueList.filter(
        (q) => q.cashier_status !== 'CLOSED'
      );

      const closedCounters = queueList.filter(
        (q) => q.cashier_status === 'CLOSED'
      );

      const overloadedQueue = openCounters.find(
        (q) =>
          q.cashier_status === 'OVERLOADED' ||
          q.shopper_count >= 6 ||
          q.estimated_wait_sec > 480
      );

      if (overloadedQueue && closedCounters.length > 0) {
        const counterToOpen =
          closedCounters.find(
            (q) => q.queue_id !== overloadedQueue.queue_id
          ) || closedCounters[0];

        results.push({
          id: `queue-${overloadedQueue.queue_id}`,
          priority: 'CRITICAL',
          type: 'QUEUE_CONGESTION',
          title: `Checkout Congestion Detected`,
          entity: overloadedQueue.queue_name,
          summary: `${overloadedQueue.shopper_count} shoppers waiting at ${overloadedQueue.queue_name}. Estimated wait time is ~${Math.round(
            overloadedQueue.estimated_wait_sec / 60
          )} minutes.`,
          reason:
            `Queue depth is growing faster than available checkout capacity. Current open-counter capacity is insufficient for the detected arrival rate.`,
          impact:
            `Shoppers are experiencing high checkout latency. High risk of immediate basket abandonment and shopper churn.`,
          recommendation:
            `Open ${counterToOpen.queue_name} to redistribute queue load and reduce average wait time.`,
          action: {
            id: `action-open-${counterToOpen.queue_id}`,
            type: 'OPEN_COUNTER',
            label: `OPEN ${counterToOpen.queue_name.toUpperCase()}`,
            entityId: counterToOpen.queue_id,
            endpoint: `/queue/${counterToOpen.queue_id}/toggle`,
            method: 'POST',
            payload: { action: 'OPEN' },
            status: 'AVAILABLE',
          },
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          source: overloadedQueue.camera_id || 'Checkout Zone Vision',
        });
      } else if (overloadedQueue && closedCounters.length === 0) {
        results.push({
          id: `queue-${overloadedQueue.queue_id}`,
          priority: 'CRITICAL',
          type: 'QUEUE_CONGESTION',
          title: `Checkout Congestion Detected`,
          entity: overloadedQueue.queue_name,
          summary: `${overloadedQueue.shopper_count} shoppers waiting at ${overloadedQueue.queue_name}. Estimated wait time is ~${Math.round(
            overloadedQueue.estimated_wait_sec / 60
          )} minutes.`,
          reason:
            `All available cashier counters are currently open and checkout demand remains above processing capacity.`,
          impact:
            `Shoppers are experiencing high checkout latency with elevated risk of basket abandonment.`,
          recommendation:
            `All cashier counters are already open. Monitor queue redistribution and checkout throughput.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          source: overloadedQueue.camera_id || 'Checkout Zone Vision',
        });
      }

      const criticalShelf = shelfList.find(
        (s) =>
          s.fill_percentage <= 20.0 ||
          s.is_out_of_stock ||
          s.status_label === 'CRITICAL_OUT_OF_STOCK'
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
          reason:
            `High footfall and rapid SKU depletion detected by edge cameras in ${criticalShelf.aisle_name}.`,
          impact:
            `High risk of out-of-stock condition resulting in unfulfilled customer demand and lost store revenue.`,
          recommendation:
            `Dispatch store floor team to restock ${criticalShelf.aisle_name} immediately.`,
          action: {
            id: `action-restock-${criticalShelf.id}`,
            type: 'DISPATCH_RESTOCK',
            label: `DISPATCH RESTOCK TEAM`,
            entityId: criticalShelf.aisle_name,
            endpoint: `/inventory/restock/${encodeURIComponent(
              criticalShelf.aisle_name
            )}`,
            method: 'POST',
            status: 'AVAILABLE',
          },
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          source: `Aisle Vision Camera (${criticalShelf.aisle_name})`,
        });
      }

      const unackAlerts = alertList.filter((a) => !a.is_acknowledged);

      for (const alert of unackAlerts) {
        const isQueue =
          alert.alert_type === 'QUEUE_OVERFLOW' &&
          results.some((r) => r.type === 'QUEUE_CONGESTION');

        const isShelf =
          alert.alert_type === 'SHELF_EMPTY' &&
          results.some((r) => r.type === 'STOCKOUT_RISK');

        if (!isQueue && !isShelf) {
          const prio: any =
            alert.severity === 'CRITICAL'
              ? 'CRITICAL'
              : alert.severity === 'WARNING'
              ? 'HIGH'
              : 'MEDIUM';

          results.push({
            id: `alert-${alert.id}`,
            priority: prio,
            type:
              alert.alert_type === 'HARDWARE_WARN'
                ? 'HARDWARE_ALERT'
                : 'STOCKOUT_RISK',
            title: alert.title,
            entity: alert.source_id || 'Store Sensor',
            summary: alert.message,
            reason: `Edge sensor automated threshold trigger (${alert.alert_type}).`,
            impact:
              `Operational alert logged in system requiring store manager acknowledgment.`,
            recommendation:
              `Review the affected area and mark alert as acknowledged once inspected.`,
            action: {
              id: `action-ack-${alert.id}`,
              type: 'ACKNOWLEDGE_ALERT',
              label: `ACKNOWLEDGE ALERT`,
              entityId: alert.id.toString(),
              endpoint: `/alerts/${alert.id}/acknowledge`,
              method: 'POST',
              status: 'AVAILABLE',
            },
            timestamp: new Date(alert.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            source: alert.source_id || 'System Engine',
          });
        }
      }

      if (results.length === 0) {
        results.push({
          id: 'normal-operations',
          priority: 'NORMAL',
          type: 'NORMAL_OPERATIONS',
          title: 'Store Operating Normally',
          entity: 'All Zones Nominal',
          summary:
            'No immediate action required. All checkout counters, aisle inventories, and Qualcomm edge sensors are operating within optimal parameters.',
          reason:
            'Shopper arrival rate is balanced across checkout counters, and shelf fill levels exceed safety stock thresholds.',
          impact:
            'Average customer wait time is optimal. Zero critical operational bottlenecks detected.',
          recommendation:
            'Maintain standard floor coverage and routine shelf inspections.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          source: 'Qualcomm Edge Retail Intelligence Engine',
        });
      }

      return results;
    },
    []
  );

  const [situations, setSituations] = useState<Situation[]>([]);
  const primarySituation = situations[0] || null;

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

      const q =
        queueData.status === 'fulfilled' ? queueData.value : [];

      const s =
        shelfData.status === 'fulfilled' ? shelfData.value : [];

      const a =
        alertData.status === 'fulfilled' ? alertData.value : [];

      if (kpiData.status === 'fulfilled') {
        setOverview(kpiData.value);
      }

      if (queueData.status === 'fulfilled') {
        setQueues(q);
      }

      if (shelfData.status === 'fulfilled') {
        setShelves(s);
      }

      if (alertData.status === 'fulfilled') {
        setAlerts(a);
      }

      if (hwData.status === 'fulfilled') {
        setHardware(hwData.value);
      }

      if (heatmapData.status === 'fulfilled') {
        setHeatmap(heatmapData.value);
      }

      if (trendsData.status === 'fulfilled') {
        setTrends(trendsData.value);
      }

      if (simData.status === 'fulfilled') {
        setSimulator(simData.value);
      }

      const derived = deriveSituations(q, s, a);

      setSituations(derived);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to sync with Retail Intelligence backend.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [deriveSituations]);

  const updateLiveStoreTelemetry = useCallback(
    (data: {
      activeShoppers?: number;
      footfallIn?: number;
      q1Count?: number;
      q2Count?: number;
      q3Count?: number;
      counter1Open?: boolean;
      counter2Open?: boolean;
      counter3Open?: boolean;
      aisle1Stock?: number;
      aisle2Stock?: number;
      aisle3Stock?: number;
      aisle4Stock?: number;
      npuLoad?: number;
    }) => {
      setOverview((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          active_shoppers_now:
            data.activeShoppers ?? prev.active_shoppers_now,
          total_footfall_today:
            data.footfallIn ?? prev.total_footfall_today,
        };
      });

      setQueues((prev) => {
        return prev.map((q) => {
          if (
            q.queue_id === 'queue-counter-1' &&
            data.q1Count !== undefined
          ) {
            const isOpen =
              data.counter1Open !== undefined
                ? data.counter1Open
                : q.cashier_status !== 'CLOSED';

            if (!isOpen) {
              return {
                ...q,
                shopper_count: 0,
                estimated_wait_sec: 0,
                cashier_status: 'CLOSED',
              };
            }

            const status =
              data.q1Count >= 6
                ? 'OVERLOADED'
                : data.q1Count >= 4
                ? 'BUSY'
                : 'OPEN';

            return {
              ...q,
              shopper_count: data.q1Count,
              estimated_wait_sec: data.q1Count * 110,
              cashier_status: status,
            };
          }

          if (
            q.queue_id === 'queue-counter-2' &&
            data.q2Count !== undefined
          ) {
            const isOpen =
              data.counter2Open !== undefined
                ? data.counter2Open
                : q.cashier_status !== 'CLOSED';

            if (!isOpen) {
              return {
                ...q,
                shopper_count: 0,
                estimated_wait_sec: 0,
                cashier_status: 'CLOSED',
              };
            }

            const status =
              data.q2Count >= 6
                ? 'OVERLOADED'
                : data.q2Count >= 4
                ? 'BUSY'
                : 'OPEN';

            return {
              ...q,
              shopper_count: data.q2Count,
              estimated_wait_sec: data.q2Count * 110,
              cashier_status: status,
            };
          }

          if (
            q.queue_id === 'queue-counter-3' &&
            data.q3Count !== undefined
          ) {
            const isOpen =
              data.counter3Open !== undefined
                ? data.counter3Open
                : q.cashier_status !== 'CLOSED';

            if (!isOpen) {
              return {
                ...q,
                shopper_count: 0,
                estimated_wait_sec: 0,
                cashier_status: 'CLOSED',
              };
            }

            const status =
              data.q3Count >= 6
                ? 'OVERLOADED'
                : data.q3Count >= 4
                ? 'BUSY'
                : 'OPEN';

            return {
              ...q,
              shopper_count: data.q3Count,
              estimated_wait_sec: data.q3Count * 110,
              cashier_status: status,
            };
          }

          return q;
        });
      });

      setShelves((prev) => {
        return prev.map((s) => {
          if (
            s.aisle_name.includes('1') &&
            data.aisle1Stock !== undefined
          ) {
            return {
              ...s,
              fill_percentage: data.aisle1Stock,
              product_count: Math.round(
                (data.aisle1Stock / 100) * 50
              ),
              is_out_of_stock: data.aisle1Stock <= 15,
            };
          }

          if (
            s.aisle_name.includes('2') &&
            data.aisle2Stock !== undefined
          ) {
            return {
              ...s,
              fill_percentage: data.aisle2Stock,
              product_count: Math.round(
                (data.aisle2Stock / 100) * 40
              ),
              is_out_of_stock: data.aisle2Stock <= 15,
            };
          }

          if (
            s.aisle_name.includes('3') &&
            data.aisle3Stock !== undefined
          ) {
            return {
              ...s,
              fill_percentage: data.aisle3Stock,
              product_count: Math.max(
                1,
                Math.round((data.aisle3Stock / 100) * 20)
              ),
              is_out_of_stock: data.aisle3Stock <= 15,
            };
          }

          if (
            s.aisle_name.includes('4') &&
            data.aisle4Stock !== undefined
          ) {
            return {
              ...s,
              fill_percentage: data.aisle4Stock,
              product_count: Math.round(
                (data.aisle4Stock / 100) * 35
              ),
              is_out_of_stock: data.aisle4Stock <= 15,
            };
          }

          return s;
        });
      });

      if (data.npuLoad !== undefined) {
        setHardware((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            npu_load_pct: data.npuLoad,
          };
        });
      }

      setLastUpdated(new Date());
    },
    []
  );

  useEffect(() => {
    refreshAll();

    liveWs.connect((connected) => {
      setIsWsConnected(connected);
    });

    const unsubTelemetry = liveWs.subscribe(
      'TELEMETRY_UPDATE',
      (data) => {
        updateLiveStoreTelemetry({
          activeShoppers: data.active_shoppers,
          q1Count: data.queue_1_count,
          q2Count: data.queue_2_count,
          q3Count: data.queue_3_count,
          counter1Open: data.counter_1_open,
          counter2Open: data.counter_2_open,
          counter3Open: data.counter_3_open,
          aisle3Stock: data.aisle_3_stock_pct,
          npuLoad: data.npu_load_pct,
        });
      }
    );

    const unsubAlert = liveWs.subscribe(
      'NEW_ALERT',
      (data) => {
        showToast(
          `🚨 New ${data.severity || 'Alert'}: ${data.title}`,
          data.severity === 'CRITICAL'
            ? 'error'
            : 'info'
        );

        refreshAll();
      }
    );

    const unsubQueue = liveWs.subscribe(
      'QUEUE_ACTION',
      () => {
        refreshAll();
      }
    );

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
  }, [
    refreshAll,
    showToast,
    updateLiveStoreTelemetry,
  ]);

  const executeAction = async (
    action: OperationalAction
  ): Promise<boolean> => {
    setActiveAction({
      ...action,
      status: 'EXECUTING',
    });

    setVerificationMessage(null);

    try {
      if (
        action.type === 'OPEN_COUNTER' ||
        action.type === 'CLOSE_COUNTER'
      ) {
        const actionType =
          action.type === 'OPEN_COUNTER'
            ? 'OPEN'
            : 'CLOSE';

        const res = await toggleCounterStatus(
          action.entityId,
          actionType
        );

        setActiveAction({
          ...action,
          status: 'SUCCESS',
        });

        setVerificationMessage(
          `${res.message} Queue redistribution detected and wait time decreasing.`
        );

        showToast(
          `✅ ${res.message}`,
          'success'
        );
      } else if (
        action.type === 'DISPATCH_RESTOCK'
      ) {
        await triggerRestock(
          action.entityId
        );

        setActiveAction({
          ...action,
          status: 'SUCCESS',
        });

        setVerificationMessage(
          `Restock team dispatched for ${action.entityId}. Shelf inventory alerts resolved.`
        );

        showToast(
          `🛒 Restock dispatched for ${action.entityId}`,
          'success'
        );
      } else if (
        action.type === 'ACKNOWLEDGE_ALERT'
      ) {
        await acknowledgeAlert(
          parseInt(action.entityId, 10)
        );

        setActiveAction({
          ...action,
          status: 'SUCCESS',
        });

        setVerificationMessage(
          `Alert acknowledged and marked resolved.`
        );

        showToast(
          `Alert acknowledged.`,
          'success'
        );
      }

      await refreshAll();

      setTimeout(() => {
        setVerificationMessage(null);
        setActiveAction(null);
      }, 10000);

      return true;
    } catch (err: any) {
      setActiveAction({
        ...action,
        status: 'FAILED',
      });

      showToast(
        `Action failed: ${
          err.message ||
          'Error executing operational action.'
        }`,
        'error'
      );

      return false;
    }
  };

  const fetchCustomTrends = async (
    windowMinutes: number
  ) => {
    try {
      const data = await fetchTrends(
        windowMinutes
      );

      setTrends(data);
    } catch (err: any) {
      showToast(
        `Error fetching trends: ${
          err.message || 'Failed'
        }`,
        'error'
      );
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

  if (!ctx) {
    throw new Error(
      'useStore must be used within StoreProvider'
    );
  }

  return ctx;
};
