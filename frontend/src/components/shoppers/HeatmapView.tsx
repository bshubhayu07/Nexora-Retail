import React, { useRef, useEffect } from 'react';
import { HeatmapGridResponseDTO } from '../../types/api';
import { MapPin, Info } from 'lucide-react';

interface HeatmapViewProps {
  heatmapData: HeatmapGridResponseDTO | null;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({ heatmapData }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw floorplan architectural zones background
    ctx.fillStyle = '#0b101c';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Store Zone Outlines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';

    // Entrance Zone (Top Left)
    ctx.fillRect(10, 10, width * 0.28, height * 0.25);
    ctx.strokeRect(10, 10, width * 0.28, height * 0.25);

    // Aisle 1 (Produce - Top Right)
    ctx.fillRect(width * 0.68, 10, width * 0.28, height * 0.35);
    ctx.strokeRect(width * 0.68, 10, width * 0.28, height * 0.35);

    // Aisle 3 (Dairy/Snacks - Center)
    ctx.fillRect(width * 0.35, height * 0.3, width * 0.3, height * 0.38);
    ctx.strokeRect(width * 0.35, height * 0.3, width * 0.3, height * 0.38);

    // Checkout Queues Zone (Bottom Right)
    ctx.fillRect(width * 0.58, height * 0.72, width * 0.38, height * 0.24);
    ctx.strokeRect(width * 0.58, height * 0.72, width * 0.38, height * 0.24);

    // Zone Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('ENTRANCE', 18, 28);
    ctx.fillText('AISLE 1 (PRODUCE)', width * 0.7, 28);
    ctx.fillText('AISLE 3 (DAIRY & BEVERAGES)', width * 0.37, height * 0.34);
    ctx.fillText('CHECKOUT ZONE', width * 0.6, height * 0.76);

    // Draw Density Radial Points
    if (heatmapData.points && heatmapData.points.length > 0) {
      heatmapData.points.forEach((pt) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;
        const intensity = pt.value; // 0.0 to 1.0
        const radius = Math.max(16, intensity * 42);

        const gradient = ctx.createRadialGradient(px, py, 2, px, py, radius);

        if (intensity > 0.7) {
          gradient.addColorStop(0, `rgba(239, 68, 68, ${0.7 * intensity})`);
          gradient.addColorStop(0.5, `rgba(249, 115, 22, ${0.4 * intensity})`);
          gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else if (intensity > 0.4) {
          gradient.addColorStop(0, `rgba(234, 179, 8, ${0.6 * intensity})`);
          gradient.addColorStop(0.6, `rgba(59, 130, 246, ${0.3 * intensity})`);
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        } else {
          gradient.addColorStop(0, `rgba(59, 130, 246, ${0.4 * intensity})`);
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [heatmapData]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="text-h2">Store Spatial Footfall Heatmap</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Real-time shopper coordinates aggregated across Qualcomm RB5 edge cameras
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Intensity Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Low</span>
            <div
              style={{
                width: 70,
                height: 8,
                borderRadius: 4,
                background: 'linear-gradient(90deg, #3b82f6 0%, #eab308 50%, #ef4444 100%)',
              }}
            />
            <span>High Density</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: 460,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      <div style={{ marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        <Info size={14} color="var(--accent-primary)" />
        <span>
          Density calculated from {heatmapData?.total_samples || 0} spatial telemetry samples over the last 60 minutes.
        </span>
      </div>
    </div>
  );
};
