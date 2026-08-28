import { useState, useEffect } from 'react';
import { getStoreData, subscribe as mockSubscribe } from '../mock/mockData';

export const useStoreStream = (isLiveMode) => {
  const [data, setData] = useState(getStoreData());

  useEffect(() => {
    if (!isLiveMode) {
      // Use mock data pub/sub
      setData(getStoreData());
      const unsubscribe = mockSubscribe((newData) => {
        setData({ ...newData });
      });
      return unsubscribe;
    } else {
      // Phase 2: Live Backend Connection
      let ws;
      try {
        ws = new WebSocket('ws://localhost:8000/ws/store-stream');
        
        ws.onopen = () => console.log('Connected to live backend store stream');
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setData(parsed);
          } catch (e) {
            console.error("Error parsing live data", e);
          }
        };
        ws.onerror = (err) => console.error("WebSocket error:", err);
      } catch (err) {
        console.error("Failed to connect to live backend, falling back/failing:", err);
      }

      return () => {
        if (ws) {
          ws.close();
        }
      };
    }
  }, [isLiveMode]);

  return data;
};
