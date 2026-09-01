import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { AppShell } from './components/layout/AppShell';

import { CommandCenterPage } from './pages/CommandCenterPage';
import { ShopperIntelligencePage } from './pages/ShopperIntelligencePage';
import { OperationsPage } from './pages/OperationsPage';
import { QueuePage } from './pages/QueuePage';
import { InventoryPage } from './pages/InventoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { ActivityPage } from './pages/ActivityPage';
import { CopilotPage } from './pages/CopilotPage';
import { SystemPage } from './pages/SystemPage';

const AppContent: React.FC = () => {
  const { currentRoute } = useStore();

  const renderRoute = () => {
    switch (currentRoute) {
      case 'command-center':
        return <CommandCenterPage />;
      case 'shoppers':
        return <ShopperIntelligencePage />;
      case 'operations':
        return <OperationsPage />;
      case 'queues':
        return <QueuePage />;
      case 'inventory':
        return <InventoryPage />;
      case 'insights':
        return <InsightsPage />;
      case 'activity':
        return <ActivityPage />;
      case 'copilot':
        return <CopilotPage />;
      case 'diagnostics':
        return <SystemPage />;
      default:
        return <CommandCenterPage />;
    }
  };

  return <AppShell>{renderRoute()}</AppShell>;
};

function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ToastProvider>
  );
}

export default App;
