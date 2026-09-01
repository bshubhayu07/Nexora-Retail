import React from 'react';
import { SituationCenter } from '../components/command-center/SituationCenter';
import { LiveOperations } from '../components/command-center/LiveOperations';
import { AttentionQueue } from '../components/command-center/AttentionQueue';
import { RecentActivity } from '../components/command-center/RecentActivity';
import { useStore } from '../context/StoreContext';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';

export const CommandCenterPage: React.FC = () => {
  const { isLoading, error, refreshAll } = useStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <LoadingSkeleton height={220} borderRadius="var(--radius-xl)" />
        <div className="grid-4">
          <LoadingSkeleton height={90} count={4} />
        </div>
        <div className="grid-2">
          <LoadingSkeleton height={300} count={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={refreshAll} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* 1. Primary AI Situation Center (Hero decision interface) */}
      <SituationCenter />

      {/* 2. Live Operations Pulse */}
      <div>
        <h3 className="text-h3" style={{ marginBottom: 10 }}>
          Live Store Operations Pulse
        </h3>
        <LiveOperations />
      </div>

      {/* 3. Secondary Attention Queue & Recent AI Detections */}
      <div className="grid-2">
        <AttentionQueue />
        <RecentActivity />
      </div>
    </div>
  );
};
