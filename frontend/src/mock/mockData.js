// Simple pub/sub for mock data simulation
const listeners = new Set();

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getStoreData = () => ({ ...currentData });

let currentData = {
  telemetry: {
    npuActive: true,
    cloudCalls: 0,
    fps: 28.4,
    latency: 140,
  },
  healthScore: 85,
  healthStatus: 'Optimal',
  queueData: Array.from({ length: 20 }, (_, i) => ({
    time: `10:${i.toString().padStart(2, '0')}`,
    count: Math.floor(Math.random() * 4) + 1,
  })),
  zones: [
    { id: 'A1', name: 'Aisle 1', sku: 'Beverages', occupancy: 85, status: 'STOCKED' },
    { id: 'A2', name: 'Aisle 2', sku: 'Snacks', occupancy: 45, status: 'LOW' },
    { id: 'A3', name: 'Aisle 3', sku: 'Produce', occupancy: 15, status: 'EMPTY' },
  ],
  lanes: [
    { id: 1, name: 'Counter 1', status: 'Normal', occupancy: 2, waitTime: 3 },
    { id: 2, name: 'Counter 2', status: 'Normal', occupancy: 1, waitTime: 1.5 },
    { id: 3, name: 'Counter 3', status: 'Closed', occupancy: 0, waitTime: 0 },
    { id: 4, name: 'Counter 4', status: 'Closed', occupancy: 0, waitTime: 0 },
  ],
  restockList: [
    { id: 1, sku: 'Diet Coke 12-pk', rate: '-45/hr', urgency: 'High', dispatched: false },
    { id: 2, sku: 'Lays Classic 8oz', rate: '-20/hr', urgency: 'Medium', dispatched: false },
    { id: 3, sku: 'Organic Bananas', rate: '-15/hr', urgency: 'Low', dispatched: false },
  ],
  alerts: [
    { id: 1, message: '[Queue: 3 | Limit: 5]', llmText: 'Checkout queues are within normal limits.' },
    { id: 2, message: '[Aisle 2 Stock: 45%]', llmText: 'Restock recommended for Snacks in Aisle 2.' },
  ]
};

let scenarioMode = 'Normal';

export const setScenario = (mode) => {
  scenarioMode = mode;
  
  if (mode === 'Peak Rush') {
    const spike = 14;
    currentData.queueData = currentData.queueData.map((q, i) => ({
       ...q, 
       count: i > 15 ? spike + Math.floor(Math.random()*4) : q.count 
    }));
  } else if (mode === 'Stock Depleted') {
    currentData.zones = currentData.zones.map(z => ({ ...z, occupancy: Math.floor(Math.random()*20), status: 'EMPTY' }));
    currentData.restockList.forEach(r => { r.urgency = 'High'; r.dispatched = false; r.rate = '-50/hr' });
  } else {
    // Normal
    currentData.zones = currentData.zones.map(z => ({ ...z, occupancy: 85 + Math.floor(Math.random()*15), status: 'STOCKED' }));
    currentData.restockList.forEach((r, i) => { r.urgency = i === 0 ? 'Medium' : 'Low'; r.dispatched = false; });
    currentData.queueData = currentData.queueData.map(q => ({
       ...q, 
       count: Math.floor(Math.random() * 4) + 1
    }));
  }
  tickSimulation();
};

export const dispatchRestock = (id) => {
  const item = currentData.restockList.find(r => r.id === id);
  if (item) {
    item.dispatched = true;
    listeners.forEach(l => l(currentData));
  }
};

const tickSimulation = () => {
  // Update telemetry
  currentData.telemetry.fps = (28 + Math.random() * 2 - 1).toFixed(1);
  currentData.telemetry.latency = Math.floor(130 + Math.random() * 20);

  // Determine queue parameters based on scenario
  let queueBase = 2;
  if (scenarioMode === 'Peak Rush') queueBase = 12;
  
  let newQueueCount = Math.max(0, Math.floor(currentData.queueData[currentData.queueData.length - 1].count + (Math.random() * 4 - 2)));
  
  // Gravitate towards scenario base
  if (newQueueCount < queueBase) newQueueCount += 1;
  if (newQueueCount > queueBase + 4) newQueueCount -= 1;

  const nextMinute = parseInt(currentData.queueData[currentData.queueData.length - 1].time.split(':')[1]) + 1;
  const newTime = `10:${(nextMinute % 60).toString().padStart(2, '0')}`;
  
  currentData.queueData = [
    ...currentData.queueData.slice(1),
    { time: newTime, count: newQueueCount }
  ];

  // Update Zones
  currentData.zones = currentData.zones.map(z => {
    let change = Math.random() * 6 - 3;
    if (scenarioMode === 'Stock Depleted') change = Math.random() * 2 - 2; // only drop
    if (scenarioMode === 'Normal' && z.occupancy < 80) change = Math.random() * 5; // slowly restock
    
    let newOcc = Math.max(0, Math.min(100, z.occupancy + change));
    let newStatus = 'EMPTY';
    if (newOcc >= 70) newStatus = 'STOCKED';
    else if (newOcc >= 30) newStatus = 'LOW';
    return { ...z, occupancy: newOcc, status: newStatus };
  });

  // Update Lanes
  let unassigned = newQueueCount;
  let openLanesCount = newQueueCount > 8 ? 4 : (newQueueCount > 5 ? 3 : (newQueueCount > 2 ? 2 : 1));
  currentData.lanes = currentData.lanes.map((lane, i) => {
    if (i < openLanesCount) {
      const laneOcc = Math.floor(unassigned / (openLanesCount - i));
      unassigned -= laneOcc;
      return { ...lane, status: 'Normal', occupancy: laneOcc, waitTime: laneOcc * 1.5 };
    }
    return { ...lane, status: 'Closed', occupancy: 0, waitTime: 0 };
  });

  // Handle surge and recommended opens
  const hasSurge = currentData.lanes.some(l => l.occupancy > 3);
  if (hasSurge) {
    currentData.lanes.forEach(l => {
      if (l.occupancy > 3) l.status = 'Surge Warning';
    });
    const nextClosed = currentData.lanes.find(l => l.status === 'Closed');
    if (nextClosed) {
      nextClosed.status = 'Closed - Recommended Open';
    }
  }

  // Calculate Health Score
  let newHealth = 100;
  if (newQueueCount > 5) {
    newHealth -= (newQueueCount - 5) * 8;
  }
  const stockIssues = currentData.zones.filter(z => z.status !== 'STOCKED').length;
  newHealth -= (stockIssues * 10);
  
  newHealth = Math.max(0, Math.min(100, Math.floor(newHealth)));
  currentData.healthScore = newHealth;

  if (newHealth > 75) {
    currentData.healthStatus = 'Optimal';
  } else if (newHealth > 50) {
    currentData.healthStatus = 'Moderate Congestion';
  } else {
    currentData.healthStatus = 'Critical Congestion';
  }

  // Update alerts
  const alerts = [];
  if (newQueueCount > 5) {
      alerts.push({ id: Date.now(), message: `[Queue: ${newQueueCount} | Limit: 5]`, llmText: 'Counter 1 exceeding threshold. Recommend opening a new counter.' });
  }
  const lowZone = currentData.zones.find(z => z.status === 'LOW' || z.status === 'EMPTY');
  if(lowZone) {
      alerts.push({ id: Date.now()+1, message: `[${lowZone.name} Stock: ${Math.floor(lowZone.occupancy)}%]`, llmText: `Inventory depletion in ${lowZone.name} (${lowZone.sku}). Dispatched restock alert to floor staff.` });
  }
  
  if(alerts.length === 0) {
      alerts.push({ id: Date.now(), message: '[All systems nominal]', llmText: 'Store operations running smoothly. No critical alerts.' });
  }

  currentData.alerts = alerts.slice(0, 3); // keep last 3

  listeners.forEach(l => l(currentData));
};

setInterval(tickSimulation, 2000);
