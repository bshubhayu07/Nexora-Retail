import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Play,
  Pause,
  ShoppingBag,
  Flame,
  Users,
  Eye,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export type TrafficSimMode =
  | 'STANDARD'
  | 'RUSH_HOUR_SURGE'
  | 'PROMO_HOTSPOT'
  | 'DAIRY_STOCKOUT'
  | 'AI_REBALANCED';

interface ShopperAgent {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  angle: number;
  state:
    | 'ENTERING'
    | 'BROWSING_PROMO'
    | 'BROWSING_AISLE_1'
    | 'BROWSING_AISLE_2'
    | 'BROWSING_AISLE_3'
    | 'BROWSING_AISLE_4'
    | 'QUEUING'
    | 'CHECKING_OUT'
    | 'EXITING';
  assignedQueue?: string;
  dwellTimer: number;
  isStaff?: boolean;
}

export const StoreTrafficSimulation: React.FC = () => {
  const { queues, shelves, executeAction, updateLiveStoreTelemetry } = useStore();
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation State & Mode
  const [mode, setMode] = useState<TrafficSimMode>('STANDARD');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.5);
  const [simSeconds, setSimSeconds] = useState<number>(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Real-Time Dynamic Stock Levels (Simulated Live Depletion & Restock)
  const [liveStockLevels, setLiveStockLevels] = useState<{
    aisle1: number;
    aisle2: number;
    aisle3: number;
    aisle4: number;
  }>({
    aisle1: 88,
    aisle2: 65,
    aisle3: 75,
    aisle4: 79,
  });

  const [footfallIn, setFootfallIn] = useState<number>(148);
  const [footfallOut, setFootfallOut] = useState<number>(116);

  // Waypoints matching Store Blueprint (800 x 480)
  const WAYPOINTS = useMemo(
    () => ({
      ENTRANCE: { x: 100, y: 70 },
      PROMO_DISPLAY: { x: 260, y: 80 },
      AISLE_1_PRODUCE: { x: 620, y: 80 },
      AISLE_2_SNACKS: { x: 220, y: 220 },
      AISLE_3_DAIRY: { x: 440, y: 220 },
      AISLE_4_BEVERAGES: { x: 660, y: 220 },
      CHECKOUT_LOBBY: { x: 420, y: 330 },
      COUNTER_1: { x: 530, y: 380 },
      COUNTER_2: { x: 620, y: 380 },
      COUNTER_3: { x: 710, y: 380 },
      EXIT: { x: 90, y: 410 },
    }),
    []
  );

  const agentsRef = useRef<ShopperAgent[]>([]);

  const counter3 = queues.find((q) => q.queue_id === 'queue-counter-3');
  const isCounter3Open = counter3?.cashier_status === 'OPEN' || mode === 'AI_REBALANCED';

  const isAisle3Low = liveStockLevels.aisle3 <= 25.0;
  const q1Count = mode === 'RUSH_HOUR_SURGE' ? 8 : mode === 'AI_REBALANCED' ? 2 : 5;
  const isQ1Overloaded = q1Count >= 5 && !isCounter3Open;

  // Initialize Agents according to selected Traffic Mode
  useEffect(() => {
    const count =
      mode === 'RUSH_HOUR_SURGE' ? 34 : mode === 'PROMO_HOTSPOT' ? 26 : mode === 'AI_REBALANCED' ? 22 : 18;

    const initial: ShopperAgent[] = [];
    for (let i = 0; i < count; i++) {
      let state: ShopperAgent['state'] = 'BROWSING_AISLE_1';
      let targetX = WAYPOINTS.AISLE_1_PRODUCE.x + (Math.random() * 50 - 25);
      let targetY = WAYPOINTS.AISLE_1_PRODUCE.y + 70 + (Math.random() * 20 - 10);

      if (mode === 'PROMO_HOTSPOT' && i < 10) {
        state = 'BROWSING_PROMO';
        targetX = WAYPOINTS.PROMO_DISPLAY.x + (Math.random() * 40 - 20);
        targetY = WAYPOINTS.PROMO_DISPLAY.y + 60 + (Math.random() * 30 - 15);
      } else if (mode === 'RUSH_HOUR_SURGE' && i < 14) {
        state = 'QUEUING';
        targetX = WAYPOINTS.COUNTER_1.x + (Math.random() * 12 - 6);
        targetY = WAYPOINTS.COUNTER_1.y - (i * 11 + 15);
      } else if (mode === 'DAIRY_STOCKOUT' && i < 8) {
        state = 'BROWSING_AISLE_3';
        targetX = WAYPOINTS.AISLE_3_DAIRY.x + (Math.random() * 40 - 20);
        targetY = WAYPOINTS.AISLE_3_DAIRY.y + 80 + (Math.random() * 20 - 10);
      }

      initial.push({
        id: i,
        x: 60 + Math.random() * 100,
        y: 40 + Math.random() * 80,
        targetX,
        targetY,
        speed: 0.32 + Math.random() * 0.2,
        angle: 0,
        state,
        dwellTimer: 60 + Math.random() * 100,
      });
    }

    agentsRef.current = initial;
  }, [mode, WAYPOINTS]);

  // Real-Time Stock Depletion / Replenishment & Website Telemetry Sync
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimSeconds((s) => s + 1);

      setLiveStockLevels((prev) => {
        let newAisle3 = prev.aisle3;
        let newAisle1 = prev.aisle1;
        let newAisle2 = prev.aisle2;
        let newAisle4 = prev.aisle4;

        if (mode === 'DAIRY_STOCKOUT') {
          // Deplete rapidly to 14.5%
          newAisle3 = Math.max(14.5, prev.aisle3 - 1.5);
        } else if (mode === 'AI_REBALANCED') {
          // Replenish to 95%
          newAisle3 = Math.min(95.0, prev.aisle3 + 4.0);
        } else if (mode === 'RUSH_HOUR_SURGE') {
          newAisle3 = Math.max(28.0, prev.aisle3 - 0.4);
          newAisle2 = Math.max(45.0, prev.aisle2 - 0.3);
        } else {
          // Standard gentle oscillation
          newAisle3 = Math.max(60.0, Math.min(85.0, prev.aisle3 + (Math.random() * 0.4 - 0.2)));
        }

        // Broadcast to whole website context!
        const activeCount = Math.max(12, footfallIn - footfallOut);
        updateLiveStoreTelemetry({
          activeShoppers: activeCount,
          footfallIn: footfallIn,
          q1Count: q1Count,
          q2Count: mode === 'AI_REBALANCED' ? 3 : 2,
          q3Count: isCounter3Open ? 3 : 0,
          aisle1Stock: Number(newAisle1.toFixed(1)),
          aisle2Stock: Number(newAisle2.toFixed(1)),
          aisle3Stock: Number(newAisle3.toFixed(1)),
          aisle4Stock: Number(newAisle4.toFixed(1)),
        });

        return {
          aisle1: newAisle1,
          aisle2: newAisle2,
          aisle3: newAisle3,
          aisle4: newAisle4,
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, mode, footfallIn, footfallOut, q1Count, isCounter3Open, updateLiveStoreTelemetry]);

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Professional Top-Down Shopper Avatar Icon
    const drawShopperAvatar = (
      x: number,
      y: number,
      angle: number,
      isQueuing: boolean,
      isStaff?: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Subtle ambient ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer radar pulse halo
      ctx.fillStyle = isQueuing
        ? 'rgba(244, 63, 94, 0.15)'
        : isStaff
        ? 'rgba(168, 85, 247, 0.15)'
        : 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Rotate to walking direction
      ctx.rotate(angle);

      // Shoulders / Torso (Modern Rounded Capsule)
      ctx.fillStyle = isStaff
        ? '#a855f7'
        : isQueuing
        ? isQ1Overloaded
          ? '#f43f5e'
          : '#38bdf8'
        : '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-5, -2.5, 10, 5, [2.5]);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Head (Crisp Circle)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -0.5, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Directional Vision Pointer (Gaze notch)
      ctx.fillStyle = isStaff ? '#7e22ce' : '#0f172a';
      ctx.beginPath();
      ctx.arc(1.5, -0.5, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Dark Mission-Control Blueprint Grid
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#141d33';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Outer Store Wall
      ctx.strokeStyle = '#253554';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // 2. Zone 1: Main Entrance Foyer & Virtual Footfall Line
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(20, 20, 150, 95);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 20, 150, 95);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('STORE ENTRANCE', 32, 40);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Cam 01 (Entrance Node)', 32, 55);

      // Virtual Counting Line (Dashed Green)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(25, 80);
      ctx.lineTo(165, 80);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#22c55e';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('VIRTUAL ENTRY LINE', 40, 95);

      // Zone 2: Promotional Endcap Display Zone
      const isPromoActive = mode === 'PROMO_HOTSPOT';
      ctx.fillStyle = isPromoActive ? 'rgba(234, 179, 8, 0.15)' : 'rgba(30, 41, 59, 0.8)';
      ctx.fillRect(190, 20, 150, 95);
      ctx.strokeStyle = isPromoActive ? '#eab308' : '#334155';
      ctx.lineWidth = isPromoActive ? 2 : 1;
      ctx.strokeRect(190, 20, 150, 95);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('PROMO ENDCAP', 200, 40);
      ctx.fillStyle = isPromoActive ? '#fef08a' : '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(isPromoActive ? '🔥 High Dwell Hotspot' : 'Seasonal Displays', 200, 55);
      ctx.fillStyle = '#64748b';
      ctx.fillText('Dwell: 4.2m avg', 200, 70);

      // Zone 3: Store Shelves (Aisles 1 - 4) with Real-Time Live Stock Bars
      const drawShelf = (
        name: string,
        category: string,
        x: number,
        y: number,
        w: number,
        h: number,
        fillPct: number,
        isCritical: boolean
      ) => {
        ctx.fillStyle = isCritical ? 'rgba(239, 68, 68, 0.14)' : 'rgba(18, 26, 48, 0.95)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = isCritical ? '#ef4444' : '#334155';
        ctx.lineWidth = isCritical ? 2 : 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(name, x + 10, y + 20);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(category, x + 10, y + 34);

        // Fill Progress Bar
        const barX = x + 10;
        const barY = y + 42;
        const barW = w - 20;
        const barH = 6;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = isCritical ? '#ef4444' : fillPct < 40 ? '#eab308' : '#22c55e';
        ctx.fillRect(barX, barY, (barW * Math.max(5, fillPct)) / 100, barH);

        ctx.fillStyle = isCritical ? '#fca5a5' : '#e2e8f0';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`Stock: ${fillPct.toFixed(0)}%`, x + 10, y + 62);

        if (isCritical) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x + w - 16, y + 18, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px Inter, sans-serif';
          ctx.fillText('!', x + w - 18, y + 21);
        }
      };

      // Aisle 1 (Produce - Top Right)
      drawShelf('Aisle 1', 'Fresh Produce & Fruits', 550, 20, 220, 75, liveStockLevels.aisle1, false);

      // Aisle 2 (Snacks - Center Left)
      drawShelf('Aisle 2', 'Packaged Snacks', 150, 150, 160, 75, liveStockLevels.aisle2, false);

      // Aisle 3 (Dairy - Center Middle - Critical ROI)
      drawShelf('Aisle 3', 'Dairy & Fresh Milk', 350, 150, 165, 75, liveStockLevels.aisle3, isAisle3Low);

      // Aisle 4 (Beverages - Center Right)
      drawShelf('Aisle 4', 'Juices & Soft Drinks', 560, 150, 180, 75, liveStockLevels.aisle4, false);

      // Zone 4: Cashier Checkout Zone
      const drawCounter = (
        label: string,
        x: number,
        y: number,
        w: number,
        h: number,
        count: number,
        isOpen: boolean,
        isOverloaded: boolean
      ) => {
        ctx.fillStyle = isOverloaded
          ? 'rgba(239, 68, 68, 0.15)'
          : isOpen
          ? 'rgba(16, 32, 60, 0.95)'
          : 'rgba(15, 23, 42, 0.6)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = isOverloaded ? '#ef4444' : isOpen ? '#3b82f6' : '#334155';
        ctx.lineWidth = isOverloaded ? 2 : 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(label, x + 8, y + 18);

        ctx.fillStyle = isOpen ? (isOverloaded ? '#ef4444' : '#22c55e') : '#64748b';
        ctx.beginPath();
        ctx.arc(x + w - 12, y + 14, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = isOpen ? (isOverloaded ? '#fca5a5' : '#86efac') : '#64748b';
        ctx.fillText(isOpen ? (isOverloaded ? 'OVERLOADED' : 'OPEN') : 'CLOSED', x + 8, y + 32);

        if (isOpen) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText(`Queue: ${count} in line`, x + 8, y + 46);
        }
      };

      const q2Count = mode === 'AI_REBALANCED' ? 3 : 2;
      const q3Shoppers = isCounter3Open ? (mode === 'AI_REBALANCED' ? 3 : 2) : 0;

      drawCounter('Counter 1', 470, 360, 85, 55, q1Count, true, q1Count >= 5);
      drawCounter('Counter 2', 570, 360, 85, 55, q2Count, true, false);
      drawCounter('Counter 3', 670, 360, 85, 55, q3Shoppers, isCounter3Open, false);

      // Register Conveyor barrier
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(460, 425, 305, 12);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('CASHIER SCANNING DESKS · CAM-02 CHECKOUT VISION ROI', 480, 434);

      // Zone 5: Exit Gate (Bottom Left)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(20, 355, 150, 95);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 355, 150, 95);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('STORE EXIT', 32, 380);
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Safe Baggage Check', 32, 396);

      // 4. Update Agents Physics & State Machine
      if (isPlaying) {
        agentsRef.current.forEach((agent) => {
          const dx = agent.targetX - agent.x;
          const dy = agent.targetY - agent.y;
          const dist = Math.hypot(dx, dy);

          const step = agent.speed * speedMultiplier;

          if (dist > 3) {
            agent.angle = Math.atan2(dy, dx);
            agent.x += (dx / dist) * step;
            agent.y += (dy / dist) * step;
          } else {
            if (agent.dwellTimer > 0) {
              agent.dwellTimer -= speedMultiplier;
            } else {
              // State Machine Progression
              if (agent.state === 'ENTERING') {
                if (mode === 'PROMO_HOTSPOT') {
                  agent.state = 'BROWSING_PROMO';
                  agent.targetX = WAYPOINTS.PROMO_DISPLAY.x + (Math.random() * 40 - 20);
                  agent.targetY = WAYPOINTS.PROMO_DISPLAY.y + 60 + Math.random() * 20;
                  agent.dwellTimer = 90;
                } else {
                  agent.state = 'BROWSING_AISLE_1';
                  agent.targetX = WAYPOINTS.AISLE_1_PRODUCE.x + (Math.random() * 50 - 25);
                  agent.targetY = WAYPOINTS.AISLE_1_PRODUCE.y + 70 + Math.random() * 20;
                  agent.dwellTimer = 60 + Math.random() * 50;
                }
              } else if (agent.state === 'BROWSING_PROMO') {
                agent.state = 'BROWSING_AISLE_2';
                agent.targetX = WAYPOINTS.AISLE_2_SNACKS.x + (Math.random() * 40 - 20);
                agent.targetY = WAYPOINTS.AISLE_2_SNACKS.y + 70 + Math.random() * 20;
                agent.dwellTimer = 50;
              } else if (agent.state === 'BROWSING_AISLE_1') {
                agent.state = 'BROWSING_AISLE_3';
                agent.targetX = WAYPOINTS.AISLE_3_DAIRY.x + (Math.random() * 40 - 20);
                agent.targetY = WAYPOINTS.AISLE_3_DAIRY.y + 70 + Math.random() * 20;
                agent.dwellTimer = 50;
              } else if (agent.state === 'BROWSING_AISLE_2' || agent.state === 'BROWSING_AISLE_3') {
                // Head to checkout queue
                agent.state = 'QUEUING';
                if (isCounter3Open && Math.random() < 0.35) {
                  agent.assignedQueue = 'COUNTER_3';
                  agent.targetX = WAYPOINTS.COUNTER_3.x + (Math.random() * 16 - 8);
                  agent.targetY = WAYPOINTS.COUNTER_3.y - (Math.random() * 35 + 10);
                } else if (Math.random() < 0.4) {
                  agent.assignedQueue = 'COUNTER_2';
                  agent.targetX = WAYPOINTS.COUNTER_2.x + (Math.random() * 16 - 8);
                  agent.targetY = WAYPOINTS.COUNTER_2.y - (Math.random() * 35 + 10);
                } else {
                  agent.assignedQueue = 'COUNTER_1';
                  agent.targetX = WAYPOINTS.COUNTER_1.x + (Math.random() * 16 - 8);
                  agent.targetY = WAYPOINTS.COUNTER_1.y - (Math.random() * 50 + 10);
                }
                agent.dwellTimer = 70 + Math.random() * 60;
              } else if (agent.state === 'QUEUING') {
                agent.state = 'CHECKING_OUT';
                agent.targetY = 440;
                agent.dwellTimer = 30;
              } else if (agent.state === 'CHECKING_OUT') {
                agent.state = 'EXITING';
                agent.targetX = WAYPOINTS.EXIT.x + (Math.random() * 30 - 15);
                agent.targetY = WAYPOINTS.EXIT.y + (Math.random() * 30 - 15);
              } else if (agent.state === 'EXITING') {
                // Recycle back through entrance
                setFootfallIn((f) => f + 1);
                setFootfallOut((f) => f + 1);
                agent.state = 'ENTERING';
                agent.x = WAYPOINTS.ENTRANCE.x + (Math.random() * 20 - 10);
                agent.y = WAYPOINTS.ENTRANCE.y + (Math.random() * 20 - 10);
                agent.targetX = WAYPOINTS.AISLE_1_PRODUCE.x + (Math.random() * 50 - 25);
                agent.targetY = WAYPOINTS.AISLE_1_PRODUCE.y + 70;
                agent.dwellTimer = 50;
              }
            }
          }
        });
      }

      // 5. Draw Clean Shopper Avatars
      agentsRef.current.forEach((agent) => {
        const isQueuing = agent.state === 'QUEUING';
        drawShopperAvatar(agent.x, agent.y, agent.angle, isQueuing, agent.isStaff);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    speedMultiplier,
    mode,
    WAYPOINTS,
    isCounter3Open,
    isAisle3Low,
    isQ1Overloaded,
    liveStockLevels,
    q1Count,
  ]);

  // Click on zones directly from map
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check Aisle 3 (350, 150, 165, 75)
    if (clickX >= 350 && clickX <= 515 && clickY >= 150 && clickY <= 225) {
      setSelectedZone('AISLE_3');
    }
    // Check Counter 3 (670, 360, 85, 55)
    else if (clickX >= 670 && clickX <= 755 && clickY >= 360 && clickY <= 415) {
      setSelectedZone('COUNTER_3');
    }
    // Check Counter 1 (470, 360, 85, 55)
    else if (clickX >= 470 && clickX <= 555 && clickY >= 360 && clickY <= 415) {
      setSelectedZone('COUNTER_1');
    }
    // Check Promo Display (190, 20, 150, 95)
    else if (clickX >= 190 && clickX <= 340 && clickY >= 20 && clickY <= 115) {
      setSelectedZone('PROMO');
    } else {
      setSelectedZone(null);
    }
  };

  const handleModeChange = (newMode: TrafficSimMode) => {
    setMode(newMode);
    if (newMode === 'RUSH_HOUR_SURGE') {
      showToast('🚨 Mode: Evening Rush Hour & Queue Surge Injected (+1.8 shoppers/min growth)!', 'error');
    } else if (newMode === 'PROMO_HOTSPOT') {
      showToast('🔥 Mode: Promotional Endcap Hotspot Surge Active (Dwell > 4m)!', 'info');
    } else if (newMode === 'DAIRY_STOCKOUT') {
      showToast('⚠️ Mode: Dairy Supply Depletion Crisis Triggered (<15% Stock)!', 'error');
    } else if (newMode === 'AI_REBALANCED') {
      showToast('✅ Mode: AI Recommended Action Executed — Rebalancing Queues & Aisles!', 'success');
    } else {
      showToast('🟢 Mode: Standard Baseline Daytime Store Flow.', 'info');
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-md)' }}>
      {/* Simulation Header */}
      <div className="card-header flex-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={18} color="var(--accent-primary)" />
            <h2 className="text-h2">Store Digital Twin — Multi-Mode Edge Traffic Simulation</h2>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              REAL-TIME SYNCED
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Simulates real-time ONNX tracking, live shelf stock depletion, and linear queue predictions
          </p>
        </div>

        {/* Speed & Play/Pause */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <button
            className={`btn btn-sm ${speedMultiplier === 0.5 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSpeedMultiplier(speedMultiplier === 0.5 ? 1.0 : 0.5)}
          >
            <span>{speedMultiplier === 0.5 ? 'Normal (0.5x)' : 'Fast (1.0x)'}</span>
          </button>
          <button
            className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </button>
        </div>
      </div>

      {/* 5 TRAFFIC SIMULATION MODES SELECTOR */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
          Select Store Traffic Simulation Mode:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { id: 'STANDARD', label: '🟢 1. Standard Daytime Flow', desc: 'Nominal traffic, balanced queues' },
            { id: 'RUSH_HOUR_SURGE', label: '🚨 2. Evening Rush Peak Surge', desc: 'Counter 1 bottleneck, queue growth +1.8/min' },
            { id: 'PROMO_HOTSPOT', label: '🔥 3. Promotional Hotspot Rush', desc: 'High dwell cluster at Promo Endcap' },
            { id: 'DAIRY_STOCKOUT', label: '⚠️ 4. Dairy Stockout Crisis', desc: 'Aisle 3 drops to 14.5% fill' },
            { id: 'AI_REBALANCED', label: '⚡ 5. AI Closed-Loop Rebalanced', desc: 'Counter 3 opened + Restock dispatched' },
          ].map((m) => (
            <button
              key={m.id}
              className={`btn btn-sm ${mode === m.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => handleModeChange(m.id as TrafficSimMode)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Status Ribbon */}
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
            Virtual Gate Footfall: <strong style={{ color: '#ffffff' }}>IN: {footfallIn}</strong> | <strong style={{ color: '#ffffff' }}>OUT: {footfallOut}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Active Occupancy: <strong style={{ color: '#38bdf8' }}>{Math.max(12, footfallIn - footfallOut)} in store</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: isQ1Overloaded ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)', fontWeight: 700 }}>
            {isQ1Overloaded ? 'Queue Growth: +1.8 shoppers/min (Critical Surge)' : 'Queue Growth: 0.0 shoppers/min (Optimal)'}
          </span>
        </div>
      </div>

      {/* 2D Digital Twin Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: 480,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          cursor: 'pointer',
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Interactive Zone Modal Popup */}
        {selectedZone && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            {selectedZone === 'AISLE_3' && (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    Aisle 3 (Dairy & Milk Shelf ROI) — ONNX Classifier Monitored
                  </div>
                  <div style={{ fontSize: 12, color: isAisle3Low ? 'var(--priority-critical-text)' : 'var(--priority-normal-text)' }}>
                    Fill Rate: {liveStockLevels.aisle3.toFixed(1)}% · Expected 10 items
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-action-warning btn-sm"
                    onClick={() => {
                      executeAction({
                        id: 'restock-canvas-3',
                        type: 'DISPATCH_RESTOCK',
                        label: 'DISPATCH RESTOCK',
                        entityId: 'Aisle 3',
                        endpoint: '/inventory/restock/Aisle%203',
                        method: 'POST',
                        status: 'AVAILABLE',
                      });
                      setMode('AI_REBALANCED');
                    }}
                  >
                    <ShoppingBag size={13} />
                    <span>Dispatch Restock Team</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>
                    Dismiss
                  </button>
                </div>
              </>
            )}

            {selectedZone === 'COUNTER_3' && (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    Cashier Counter 3 — Overflow Lane
                  </div>
                  <div style={{ fontSize: 12, color: isCounter3Open ? 'var(--priority-normal-text)' : 'var(--text-muted)' }}>
                    Status: {isCounter3Open ? 'OPEN (Handling 3 Shoppers)' : 'CLOSED (Available to Allocate)'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`btn ${isCounter3Open ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={() => {
                      executeAction({
                        id: 'counter-canvas-3',
                        type: isCounter3Open ? 'CLOSE_COUNTER' : 'OPEN_COUNTER',
                        label: isCounter3Open ? 'CLOSE COUNTER 3' : 'OPEN COUNTER 3',
                        entityId: 'queue-counter-3',
                        endpoint: '/queue/queue-counter-3/toggle',
                        method: 'POST',
                        payload: { action: isCounter3Open ? 'CLOSE' : 'OPEN' },
                        status: 'AVAILABLE',
                      });
                      if (!isCounter3Open) setMode('AI_REBALANCED');
                    }}
                  >
                    <span>{isCounter3Open ? 'Close Counter 3' : 'Open Counter 3'}</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>
                    Dismiss
                  </button>
                </div>
              </>
            )}

            {selectedZone === 'PROMO' && (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    Promotional Endcap Display Zone
                  </div>
                  <div style={{ fontSize: 12, color: '#fbbf24' }}>
                    Polygon Dwell Time Analytics: 4.2m average dwell duration · High engagement
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>
                  Dismiss
                </button>
              </>
            )}

            {selectedZone === 'COUNTER_1' && (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    Cashier Counter 1 — Cam 02 Queue Detector & Linear Predictor
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Linear Growth: y = 0.03x + 6 · Forecast: 8 shoppers at +5 min horizon
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0284c7' }} />
            <span>Shopper Avatar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f43f5e' }} />
            <span>Queuing Customer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span>Healthy Stock (&gt;40%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <span>Low Stock / Surge</span>
          </div>
        </div>

        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
          💡 Click any zone on the map to inspect camera metrics or trigger actions
        </span>
      </div>
    </div>
  );
};
