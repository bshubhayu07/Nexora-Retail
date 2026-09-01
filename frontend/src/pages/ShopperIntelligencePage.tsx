import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ShopperMetrics } from '../components/shoppers/ShopperMetrics';
import { LiveQueueCameraFeed } from '../components/shoppers/LiveQueueCameraFeed';
import { StoreTrafficSimulation } from '../components/shoppers/StoreTrafficSimulation';
import { HeatmapView } from '../components/shoppers/HeatmapView';
import { HighDwellList } from '../components/shoppers/HighDwellList';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Camera, Eye, Layers } from 'lucide-react';

export const ShopperIntelligencePage: React.FC = () => {
  const { overview, heatmap, isLoading } = useStore();
  const [viewMode, setViewMode] = useState<'LIVE_CAMERA' | 'SIMULATION' | 'HEATMAP'>('LIVE_CAMERA');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <div className="grid-4">
          <LoadingSkeleton height={90} count={4} />
        </div>
        <LoadingSkeleton height={480} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* 1. Shopper Footfall & Dwell Metrics */}
      <ShopperMetrics overview={overview} />

      {/* 2. Mode Selector Header */}
      <div className="flex-between">
        <div>
          <h2 className="text-h2">Store Spatial & Edge Computer Vision Intelligence</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Live laptop webcam CV detection node, digital twin traffic simulation, and spatial density heatmaps
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${viewMode === 'LIVE_CAMERA' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('LIVE_CAMERA')}
          >
            <Camera size={13} />
            <span>Live Laptop Camera (cv-queue)</span>
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'SIMULATION' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('SIMULATION')}
          >
            <Eye size={13} />
            <span>Store Digital Twin Simulation</span>
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'HEATMAP' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('HEATMAP')}
          >
            <Layers size={13} />
            <span>Density Heatmap</span>
          </button>
        </div>
      </div>

      {/* 3. Main Visualizer: Live Webcam, Traffic Simulation, or Heatmap */}
      {viewMode === 'LIVE_CAMERA' && <LiveQueueCameraFeed />}
      {viewMode === 'SIMULATION' && <StoreTrafficSimulation />}
      {viewMode === 'HEATMAP' && <HeatmapView heatmapData={heatmap} />}

      {/* 4. High-Dwell Zone Breakdown */}
      <HighDwellList
        heatmapData={heatmap}
        avgDwellMinutes={overview?.avg_dwell_time_minutes ?? 3.0}
      />
    </div>
  );
};
