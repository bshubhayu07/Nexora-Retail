import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { startSimulator, stopSimulator } from '../../api/simulator';
import { Play, Square, Video, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const SimulatorControls: React.FC = () => {
  const { simulator, refreshAll } = useStore();
  const { showToast } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const isRunning = simulator?.is_running ?? false;

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (isRunning) {
        await stopSimulator();
        showToast('Edge camera stream simulator stopped.', 'info');
      } else {
        await startSimulator();
        showToast('Edge camera stream simulator started! Emitting live frame events.', 'success');
      }
      await refreshAll();
    } catch (err: any) {
      showToast(`Simulator error: ${err.message || 'Action failed'}`, 'error');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header flex-between">
        <div>
          <h2 className="text-h2">Edge Camera Feed Simulator</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Emulate multi-camera retail store edge intelligence feeds in real-time
          </p>
        </div>

        <button
          className={`btn ${isRunning ? 'btn-action-critical' : 'btn-primary'} btn-sm`}
          disabled={isToggling}
          onClick={handleToggle}
        >
          {isToggling ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : isRunning ? (
            <>
              <Square size={13} />
              <span>Stop Simulator</span>
            </>
          ) : (
            <>
              <Play size={13} />
              <span>Start Live Simulation</span>
            </>
          )}
        </button>
      </div>

      <div className="grid-3">
        <div className="card-subtle">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Simulation Worker State</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: isRunning ? 'var(--priority-normal-text)' : 'var(--text-muted)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isRunning ? 'var(--priority-normal-border)' : 'var(--text-muted)',
              }}
            />
            <span>{isRunning ? 'ACTIVE EMISSION (2.5s interval)' : 'IDLE / PAUSED'}</span>
          </div>
        </div>

        <div className="card-subtle">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Simulated Camera Streams</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
            {isRunning ? '4 Synchronized Feeds' : '0 Active Feeds'}
          </div>
        </div>

        <div className="card-subtle">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Frames Emitted to WebSocket</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-family-mono)', marginTop: 4 }}>
            {simulator?.frames_emitted ?? 0} frames
          </div>
        </div>
      </div>
    </div>
  );
};
