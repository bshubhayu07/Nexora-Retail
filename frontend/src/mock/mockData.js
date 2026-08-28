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
  healthStatus: 'Optimal', // 'Optimal' | 'Moderate Congestion' | 'Critical Congestion'
  queueData: Array.from({ length: 20 }, (_, i) => ({
    time: `10:${i.toString().padStart(2, '0')}`,
    count: Math.floor(Math.random() * 4) + 1,
  })),
  zones: [
    { id: 'A1', name: 'Aisle 1', sku: 'Beverages', occupancy: 85, status: 'STOCKED' }, // STOCKED | LOW | EMPTY
    { id: 'A2', name: 'Aisle 2', sku: 'Snacks', occupancy: 45, status: 'LOW' },
    { id: 'A3', name: 'Aisle 3', sku: 'Produce', occupancy: 15, status: 'EMPTY' },
  ],
  alerts: [
    { id: 1, message: 'Queue = 3 | Limit = 5', llmText: 'Checkout queues are within normal limits.' },
    { id: 2, message: 'Aisle 2 Stock = 45%', llmText: 'Restock recommended for Snacks in Aisle 2.' },
  ]
};

// Simulation loop
setInterval(() => {
  // Update telemetry
  currentData.telemetry.fps = (28 + Math.random() * 2 - 1).toFixed(1);
  currentData.telemetry.latency = Math.floor(130 + Math.random() * 20);

  // Update queue
  const newQueueCount = Math.max(0, Math.floor(currentData.queueData[currentData.queueData.length - 1].count + (Math.random() * 4 - 1.5))); // can go up more now
  const nextMinute = parseInt(currentData.queueData[currentData.queueData.length - 1].time.split(':')[1]) + 1;
  const newTime = `10:${(nextMinute % 60).toString().padStart(2, '0')}`;
  
  currentData.queueData = [
    ...currentData.queueData.slice(1),
    { time: newTime, count: newQueueCount }
  ];

  // Update Zones (occupancy is how full the shelf is: 100 = full, 0 = empty)
  currentData.zones = currentData.zones.map(z => {
    let newOcc = Math.max(0, Math.min(100, z.occupancy + (Math.random() * 10 - 5)));
    let newStatus = 'EMPTY';
    if (newOcc >= 70) newStatus = 'STOCKED';
    else if (newOcc >= 30) newStatus = 'LOW';
    return { ...z, occupancy: newOcc, status: newStatus };
  });

  // Calculate Health Score based on active queue and stock
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

  // Update alerts based on state
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
}, 2000);
