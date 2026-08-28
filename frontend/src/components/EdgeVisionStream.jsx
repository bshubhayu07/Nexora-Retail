import React, { useState, useEffect } from 'react';
import { Camera, UploadCloud, Video } from 'lucide-react';

const EdgeVisionStream = () => {
  const [overlayOn, setOverlayOn] = useState(true);
  const [jiggle, setJiggle] = useState(0);
  const [pulseScale, setPulseScale] = useState(1);

  // Subtle animation loop
  useEffect(() => {
    let frameId;
    let time = 0;
    
    const animate = () => {
      time += 0.05;
      // Slight smooth jiggle using sine waves
      setJiggle(Math.sin(time) * 3);
      setPulseScale(1 + Math.abs(Math.cos(time * 0.5)) * 0.02);
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="bg-panelDark p-5 rounded-xl border border-gray-800 flex flex-col flex-grow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Camera className="text-blue-400" size={20} />
          <h3 className="font-semibold text-gray-200">Edge Vision Stream <span className="text-gray-500 font-normal text-sm">(Simulated)</span></h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">Live CV Feed</span>
          </div>
          
          <button 
            onClick={() => setOverlayOn(!overlayOn)}
            className={`text-xs font-medium px-3 py-1 rounded transition-colors border ${
              overlayOn 
                ? 'bg-blue-900/30 text-blue-400 border-blue-900' 
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            Overlay: {overlayOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full aspect-video bg-black/60 rounded-lg overflow-hidden border border-gray-800/50 flex items-center justify-center shadow-inner">
        {/* Placeholder for video feed (dark grid or subtle noise) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
           <Video size={48} className="text-gray-500" />
        </div>

        {/* Dynamic SVG Overlay */}
        {overlayOn && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Queue Zone (Dotted) */}
            <g transform={`translate(${jiggle * 0.2}, 0)`}>
              <rect x="5%" y="40%" width="30%" height="45%" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" rx="4" />
              <text x="6%" y="45%" fill="#60a5fa" fontSize="12" fontWeight="600" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Queue Zone</text>
              <text x="6%" y="51%" fill="#9ca3af" fontSize="10" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>(3 detected)</text>
            </g>

            {/* Shopper 1 (Inside queue zone) */}
            <g transform={`translate(${10 + jiggle}, ${55 - jiggle * 0.5}) scale(${pulseScale})`} transform-origin="15% 65%">
              <rect x="10%" y="55%" width="8%" height="25%" fill="transparent" stroke="#10b981" strokeWidth="1.5" />
              <rect x="10%" y="50%" width="12%" height="5%" fill="#10b981" />
              <text x="11%" y="53.5%" fill="#0B0F17" fontSize="10" fontWeight="bold">Shopper 1 [98%]</text>
            </g>

            {/* Shopper 2 (Outside) */}
            <g transform={`translate(${45 - jiggle * 1.2}, ${30 + jiggle * 0.3}) scale(${pulseScale})`} transform-origin="48% 40%">
              <rect x="45%" y="30%" width="7%" height="22%" fill="transparent" stroke="#10b981" strokeWidth="1.5" />
              <rect x="45%" y="25%" width="12%" height="5%" fill="#10b981" />
              <text x="46%" y="28.5%" fill="#0B0F17" fontSize="10" fontWeight="bold">Shopper 2 [97%]</text>
            </g>

            {/* Shelf A Polygon */}
            <g>
              <polygon points="70%,15% 95%,20% 95%,80% 65%,90%" fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth="2" />
              <rect x="73%" y="45%" width="17%" height="6%" fill="#a855f7" opacity="0.8" rx="2" />
              <text x="74%" y="49%" fill="#ffffff" fontSize="10" fontWeight="600">Shelf A | Beverages</text>
              <text x="76%" y="56%" fill="#fca5a5" fontSize="10" fontWeight="600" className="animate-pulse">LOW STOCK</text>
            </g>
          </svg>
        )}
      </div>

      {/* Footer / Telemetry Bar */}
      <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-400 font-mono">
          <span>Camera 01: Processed Frame (YOLOv8-Retail)</span>
          <span className="hidden sm:inline">|</span>
          <span className="text-amber-400/80">Inference Latency: 4ms</span>
          <span className="hidden sm:inline">|</span>
          <span className="text-green-400/80">Qualcomm NPU Active</span>
        </div>
        
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors border border-gray-700 hover:border-gray-500 whitespace-nowrap">
          <UploadCloud size={14} />
          <span>Upload Video / Switch Camera</span>
        </button>
      </div>
    </div>
  );
};

export default EdgeVisionStream;
