import React, { useState } from 'react';
import TopNav from './components/TopNav';
import HeroHealth from './components/HeroHealth';
import AnalyticsPanels from './components/AnalyticsPanels';
import ManagerCopilot from './components/ManagerCopilot';
import { useStoreStream } from './hooks/useStoreStream';

function App() {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const storeData = useStoreStream(isLiveMode);

  if (!storeData) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <TopNav isLiveMode={isLiveMode} setIsLiveMode={setIsLiveMode} telemetry={storeData.telemetry} />
      <main className="flex-grow p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <HeroHealth data={storeData} />
        <AnalyticsPanels data={storeData} />
        <ManagerCopilot data={storeData} />
      </main>
    </div>
  );
}

export default App;
