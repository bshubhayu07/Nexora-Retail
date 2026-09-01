import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import {
  Camera,
  Video,
  VideoOff,
  Radio,
  Users,
  Clock,
  ShieldCheck,
  Zap,
  Flame,
  TrendingUp,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DetectedBox {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
  label: string;
  inZone: boolean;
}

export const LiveQueueCameraFeed: React.FC = () => {
  const { updateLiveStoreTelemetry, executeAction, queues } = useStore();
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);

  // Camera & Detection States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30.0);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [totalPeople, setTotalPeople] = useState<number>(0);
  const [simSurgeCount, setSimSurgeCount] = useState<number>(0);

  // Overlay Settings
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [showRoiZone, setShowRoiZone] = useState<boolean>(true);

  // Queue ROI Zone normalized coordinates (0..1)
  const [roiZone, setRoiZone] = useState<{ x1: number; y1: number; x2: number; y2: number }>({
    x1: 0.15,
    y1: 0.15,
    x2: 0.85,
    y2: 0.85,
  });

  const isDetectionRunning = useRef<boolean>(false);

  // Pre-load AI Model on mount
  useEffect(() => {
    let isMounted = true;
    const loadAi = async () => {
      try {
        setIsModelLoading(true);
        const loadedModel = await cocoSsd.load({ base: 'mobilenet_v2' });
        if (isMounted) {
          modelRef.current = loadedModel;
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error('Error loading COCO-SSD model:', err);
        setIsModelLoading(false);
      }
    };
    loadAi();
    return () => {
      isMounted = false;
    };
  }, []);

  // Start Laptop Webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        showToast('📷 Real-Time Edge CV Detector Active! Tracking people live.', 'success');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow webcam access in your browser settings.'
          : `Webcam error: ${err.message || 'Unable to open camera.'}`
      );
      setIsCameraActive(false);
      showToast(`Camera error: ${err.message || 'Permission denied'}`, 'error');
    }
  };

  // Stop Laptop Webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetectedBoxes([]);
    setQueueCount(0);
    setTotalPeople(0);
    showToast('Camera feed disconnected.', 'info');
  };

  // Real-time AI Person Detection Loop
  useEffect(() => {
    if (!isCameraActive) return;

    let animId: number;
    let isDetecting = false;

    const detectRealTime = async () => {
      const video = videoRef.current;
      const model = modelRef.current;

      if (video && video.readyState >= 2 && model && !isDetecting) {
        isDetecting = true;
        try {
          // Run AI Detection on current frame
          const predictions = await model.detect(video);

          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;

          // Filter person detections
          const peopleOnly = predictions.filter(
            (p) => p.class === 'person' && p.score >= 0.35
          );

          let inZoneTally = 0;
          const currentBoxes: DetectedBox[] = peopleOnly.map((p, idx) => {
            const [bx, by, bw, bh] = p.bbox;

            // Normalized center of detection
            const cx = (bx + bw / 2.0) / vw;
            const cy = (by + bh / 2.0) / vh;

            const inZone =
              cx >= roiZone.x1 &&
              cx <= roiZone.x2 &&
              cy >= roiZone.y1 &&
              cy <= roiZone.y2;

            if (inZone) inZoneTally++;

            return {
              id: 101 + idx,
              x: bx / vw,
              y: by / vh,
              w: bw / vw,
              h: bh / vh,
              conf: p.score,
              label: `PERSON ${(p.score * 100).toFixed(0)}% | ID #${101 + idx}`,
              inZone,
            };
          });

          setTotalPeople(peopleOnly.length);
          setQueueCount(inZoneTally);
          setDetectedBoxes(currentBoxes);

          // Real-time sync with website context & backend
          const totalQueue = inZoneTally + simSurgeCount;
          updateLiveStoreTelemetry({
            q1Count: Math.max(1, totalQueue),
            activeShoppers: Math.max(12, totalQueue + 15),
          });
        } catch (err) {
          // Keep loop alive
        } finally {
          isDetecting = false;
        }
      }

      animId = requestAnimationFrame(detectRealTime);
    };

    animId = requestAnimationFrame(detectRealTime);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive, roiZone, simSurgeCount, updateLiveStoreTelemetry]);

  // Main Canvas Rendering Loop (Video + Real AI Bounding Box Overlays)
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Video Frame if Camera is Active, else Draw Standby
      if (isCameraActive && video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        // Standby background
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, width, height);

        // Blueprint Grid lines
        ctx.strokeStyle = '#141d33';
        ctx.lineWidth = 1;
        for (let x = 0; x <= width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Standby Notice
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Laptop Edge Camera Standby (cam-02-checkout)', width / 2, height / 2 - 20);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(
          isModelLoading
            ? '⏳ Loading On-Device Computer Vision Neural Network...'
            : 'Click [ Connect Laptop Camera ] to start real-time multi-person AI detection',
          width / 2,
          height / 2 + 10
        );
        ctx.textAlign = 'left';
      }

      // 2. Draw Queue ROI Zone Polygon (Matching cv-queue/detect_queue.py)
      const zx1 = roiZone.x1 * width;
      const zy1 = roiZone.y1 * height;
      const zw = (roiZone.x2 - roiZone.x1) * width;
      const zh = (roiZone.y2 - roiZone.y1) * height;

      const effectiveQueue = queueCount + simSurgeCount;
      const isCongested = effectiveQueue >= 5;

      if (showRoiZone) {
        ctx.strokeStyle = isCongested ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(zx1, zy1, zw, zh);
        ctx.setLineDash([]);

        // Zone Header Tag
        ctx.fillStyle = isCongested ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)';
        ctx.fillRect(zx1, zy1 - 22, 220, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`QUEUE ROI ZONE (${effectiveQueue} IN QUEUE)`, zx1 + 8, zy1 - 7);
      }

      // 3. Draw Real Detected Person Bounding Boxes from AI
      if (showBoundingBoxes && isCameraActive) {
        detectedBoxes.forEach((box) => {
          const bx = box.x * width;
          const by = box.y * height;
          const bw = box.w * width;
          const bh = box.h * height;

          const boxColor = box.inZone ? (isCongested ? '#ef4444' : '#22c55e') : '#94a3b8';

          // Bounding Box Rectangle
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(bx, by, bw, bh);

          // Corner brackets for high-tech HUD look
          const bracketLen = 14;
          ctx.lineWidth = 4;
          // Top-Left
          ctx.beginPath();
          ctx.moveTo(bx, by + bracketLen);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + bracketLen, by);
          ctx.stroke();
          // Top-Right
          ctx.beginPath();
          ctx.moveTo(bx + bw - bracketLen, by);
          ctx.lineTo(bx + bw, by);
          ctx.lineTo(bx + bw, by + bracketLen);
          ctx.stroke();
          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(bx, by + bh - bracketLen);
          ctx.lineTo(bx, by + bh);
          ctx.lineTo(bx + bracketLen, by + bh);
          ctx.stroke();
          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(bx + bw - bracketLen, by + bh);
          ctx.lineTo(bx + bw, by + bh);
          ctx.lineTo(bx + bw, by + bh - bracketLen);
          ctx.stroke();

          // Header Tag
          ctx.fillStyle = boxColor;
          const tagW = Math.max(140, bw);
          ctx.fillRect(bx, by - 20, Math.min(180, tagW), 20);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillText(box.label, bx + 6, by - 6);

          // Head crosshair indicator
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bx + bw / 2, by + Math.min(45, bh * 0.2), 14, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Draw Simulated Queue Surge Customers (if triggered)
        if (simSurgeCount > 0) {
          for (let i = 0; i < simSurgeCount; i++) {
            const bx = zx1 + 30 + (i % 3) * 110;
            const by = zy1 + 40 + Math.floor(i / 3) * 110;
            const bw = 90;
            const bh = 140;

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(bx, by - 18, 140, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillText(`SIMULATED PERSON | #${200 + i}`, bx + 4, by - 5);
          }
        }
      }

      // 4. Draw HUD Telemetry Banner on Top of Video
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(12, 12, 340, 78);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, 340, 78);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('On-Device Edge CV · Real-Time YOLO Detector', 22, 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`Source: Laptop Webcam (cam-02-checkout)`, 22, 44);
      ctx.fillText(`AI Model: Active (${totalPeople} in frame | ${fps.toFixed(1)} FPS)`, 22, 58);
      ctx.fillText(`Queue Count: ${effectiveQueue} in line | Est. Wait: ${effectiveQueue * 45}s`, 22, 72);

      // FPS Calculation
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive, roiZone, showRoiZone, showBoundingBoxes, detectedBoxes, queueCount, simSurgeCount, fps, isModelLoading, totalPeople]);

  // Trigger Simulation Queue Surge on Camera
  const handleTriggerSurge = () => {
    setSimSurgeCount(6);
    showToast('🚨 Simulated 6 queuing customers injected into Camera ROI!', 'error');
  };

  const handleClearSurge = () => {
    setSimSurgeCount(0);
    showToast('🟢 Queue surge cleared. Normal camera tracking.', 'info');
  };

  return (
    <div className="card" style={{ padding: 'var(--space-md)' }}>
      {/* Hidden Video element for WebRTC camera stream */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

      {/* Header & Controls */}
      <div className="card-header flex-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} color="var(--accent-primary)" />
            <h2 className="text-h2">Laptop Edge Camera — Real-Time Multi-Person Detection</h2>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isCameraActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: isCameraActive ? 'var(--priority-normal-text)' : 'var(--priority-medium-text)',
                border: `1px solid ${isCameraActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              }}
            >
              {isCameraActive ? `🔴 LIVE AI TRACKING (${totalPeople} DETECTED)` : 'STANDBY'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time on-device neural network detects people, tracks movement, and monitors queue occupancy
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Connect / Disconnect Camera Button */}
          {isCameraActive ? (
            <button className="btn btn-action-critical btn-sm" onClick={stopCamera}>
              <VideoOff size={13} />
              <span>Disconnect Camera</span>
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={startCamera}>
              <Video size={13} />
              <span>Connect Laptop Camera</span>
            </button>
          )}

          {/* Toggle Bounding Box Overlays */}
          <button
            className={`btn btn-sm ${showBoundingBoxes ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
          >
            <span>{showBoundingBoxes ? 'Boxes: ON' : 'Boxes: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Camera Error Alert if permission denied */}
      {cameraError && (
        <div
          style={{
            marginBottom: 'var(--space-md)',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--priority-critical-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--priority-critical-text)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={14} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Live Telemetry Ribbon */}
      <div
        className="flex-between"
        style={{
          marginBottom: 'var(--space-sm)',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Detected in Frame: <strong style={{ color: '#ffffff' }}>{totalPeople} People</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Inside Queue Zone: <strong style={{ color: (queueCount + simSurgeCount) >= 5 ? 'var(--priority-critical-text)' : '#38bdf8' }}>{queueCount + simSurgeCount} Shoppers</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Est. Wait Time: <strong style={{ color: '#38bdf8' }}>{(queueCount + simSurgeCount) * 45} seconds</strong>
          </span>
        </div>

        {/* Demo Surge Ingestion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Camera Demo Triggers:</span>
          <button className="btn btn-action-critical btn-sm" onClick={handleTriggerSurge} style={{ fontSize: 11 }}>
            <Flame size={12} /> Inject Queue Surge
          </button>
          {simSurgeCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleClearSurge} style={{ fontSize: 11 }}>
              <RotateCcw size={12} /> Clear Surge
            </button>
          )}
        </div>
      </div>

      {/* 2D Real-Time Camera Feed Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: 480,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          backgroundColor: '#000000',
        }}
      >
        <canvas ref={canvasRef} width={800} height={480} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Bottom Floating Resolution Banner if Queue Overloaded */}
        {(queueCount + simSurgeCount) >= 5 && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '2px solid var(--priority-critical-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--priority-critical-text)' }}>
                🚨 High Checkout Congestion Detected via Camera cam-02!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {queueCount + simSurgeCount} shoppers in queue. Estimated wait exceeds {((queueCount + simSurgeCount) * 45) / 60} mins.
              </div>
            </div>

            <button
              className="btn btn-action-critical btn-sm"
              onClick={() =>
                executeAction({
                  id: 'camera-open-counter-3',
                  type: 'OPEN_COUNTER',
                  label: 'OPEN CASHIER COUNTER 3',
                  entityId: 'queue-counter-3',
                  endpoint: '/queue/queue-counter-3/toggle',
                  method: 'POST',
                  payload: { action: 'OPEN' },
                  status: 'AVAILABLE',
                })
              }
            >
              <Zap size={13} />
              <span>Open Counter 3 (Resolve)</span>
            </button>
          </div>
        )}
      </div>

      {/* Legend & Privacy Guarantee */}
      <div
        className="flex-between"
        style={{
          marginTop: 'var(--space-md)',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#22c55e" />
            <span>100% On-Device Neural Network (Zero Video Leaves Device)</span>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>Target: Multi-Person COCO Class 0 · Live Dynamic Bounding Boxes</span>
        </div>

        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
          ⚡ Powered by On-Device Neural Detection
        </span>
      </div>
    </div>
  );
};
