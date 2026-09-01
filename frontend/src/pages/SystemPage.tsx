import React from 'react';
import { useStore } from '../context/StoreContext';
import { NpuDiagnostics } from '../components/system/NpuDiagnostics';
import { SimulatorControls } from '../components/system/SimulatorControls';
import { EdgeArchitecture } from '../components/system/EdgeArchitecture';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const SystemPage: React.FC = () => {
  const { hardware, isLoading } = useStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <LoadingSkeleton height={120} />
        <div className="grid-4">
          <LoadingSkeleton height={80} count={4} />
        </div>
        <LoadingSkeleton height={180} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* 1. Qualcomm Hardware Telemetry */}
      <NpuDiagnostics hardware={hardware} />

      {/* 2. Edge Camera Stream Simulator Controls */}
      <SimulatorControls />

      {/* 3. Privacy & Architectural Advantage */}
      <EdgeArchitecture />
    </div>
  );
};
