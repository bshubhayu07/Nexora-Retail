import React from 'react';
import { Shield, EyeOff, Zap, Lock, Cpu, Server } from 'lucide-react';

export const EdgeArchitecture: React.FC = () => {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="text-h2">Qualcomm Edge-First Architecture & Privacy</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Why on-device SNPE intelligence is superior to legacy cloud CCTV streaming
          </p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card-subtle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <EyeOff size={16} color="var(--priority-normal-border)" />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              100% Shopper Privacy
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Raw video feeds never leave the local store camera hardware. Only anonymized bounding box coordinates and shopper counts are transmitted.
          </p>
        </div>

        <div className="card-subtle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Zap size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Sub-15ms Latency
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Qualcomm Hexagon NPU processes video frames locally in 12.4ms, enabling instantaneous queue bottleneck alerts before customers abandon carts.
          </p>
        </div>

        <div className="card-subtle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Lock size={16} color="var(--priority-high-border)" />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Offline Fault-Tolerance
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            The retail store command center and local LLaMA copilot run completely offline without depending on continuous internet connectivity.
          </p>
        </div>
      </div>
    </div>
  );
};
