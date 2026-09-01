import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { useStore } from '../../context/StoreContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentRoute } = useStore();

  const getPageMeta = () => {
    switch (currentRoute) {
      case 'command-center':
        return { title: 'AI Situation & Command Center', subtitle: 'Real-time operational decision center' };
      case 'shoppers':
        return { title: 'Shopper Intelligence & Density', subtitle: 'Footfall, dwell zones, and spatial heatmap' };
      case 'operations':
        return { title: 'Store Operations Hub', subtitle: 'Consolidated checkout queue & shelf inventory control' };
      case 'queues':
        return { title: 'Checkout Queue Intelligence', subtitle: 'Wait times, congestion alerts, and counter allocation' };
      case 'inventory':
        return { title: 'Shelf & Inventory Intelligence', subtitle: 'Monitored stock levels, out-of-stock risk, and restock actions' };
      case 'insights':
        return { title: 'Insights & Historical Trends', subtitle: 'Aggregated analytics and operational patterns' };
      case 'activity':
        return { title: 'AI Activity & Event Timeline', subtitle: 'Edge detection log, alerts, and resolution state' };
      case 'copilot':
        return { title: 'Retail AI Copilot', subtitle: 'Conversational assistant with live store context' };
      case 'diagnostics':
        return { title: 'Edge Hardware & System Diagnostics', subtitle: 'Qualcomm Snapdragon SNPE NPU performance telemetry' };
      default:
        return { title: 'Command Center', subtitle: 'Store Operations' };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-viewport">
        <TopHeader title={meta.title} subtitle={meta.subtitle} />
        <main className="page-content-area">{children}</main>
      </div>
    </div>
  );
};
