import React, { useState } from 'react';
import TopNav from './components/TopNav';
import HeroHealth from './components/HeroHealth';
import AnalyticsPanels from './components/AnalyticsPanels';
import ManagerCopilot from './components/ManagerCopilot';
import { useStoreStream } from './hooks/useStoreStream';
import { setScenario } from './mock/mockData';
import { Play } from 'lucide-react';

function App() {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState('Normal');
  const storeData = useStoreStream(isLiveMode);

  const handleScenarioChange = (scenario) => {
    setActiveScenario(scenario);
    if (!isLiveMode) {
      setScenario(scenario);
    }
  };

  if (!storeData) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans relative pb-16">
      <TopNav isLiveMode={isLiveMode} setIsLiveMode={setIsLiveMode} telemetry={storeData.telemetry} />
      <main className="flex-grow p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <HeroHealth data={storeData} />
        <AnalyticsPanels data={storeData} />
        <ManagerCopilot data={storeData} />
      </main>

      {/* Demo Scenario Controller (Floating Bottom Bar) */}
      {!isLiveMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-panelDark border border-blue-900/50 shadow-2xl rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2 text-blue-400 mr-2 border-r border-gray-700 pr-4">
              <Play size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Demo Mode</span>
            </div>
            
            {['Normal', 'Peak Rush', 'Stock Depleted'].map(scenario => (
              <button
                key={scenario}
                onClick={() => handleScenarioChange(scenario)}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all ${
                  activeScenario === scenario 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-edgeDark text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-700'
                }`}
              >
                Scenario: {scenario}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
