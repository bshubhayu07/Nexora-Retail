import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CounterCard } from '../components/queue/CounterCard';
import { QueueDrawer } from '../components/queue/QueueDrawer';
import { MetricCard } from '../components/common/MetricCard';
import { QueueStatusResponseDTO } from '../types/api';
import { Flame, Clock, Users, ShieldCheck } from 'lucide-react';

export const QueuePage: React.FC = () => {
  const { queues } = useStore();
  const [selectedQueue, setSelectedQueue] = useState<QueueStatusResponseDTO | null>(null);

  const totalWaiting = queues.reduce((sum, q) => sum + (q.cashier_status !== 'CLOSED' ? q.shopper_count : 0), 0);
  const openCounters = queues.filter((q) => q.cashier_status !== 'CLOSED').length;
  const maxWait = queues.length > 0 ? Math.max(...queues.map((q) => (q.cashier_status !== 'CLOSED' ? q.estimated_wait_sec : 0))) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Queue Summary KPI Row */}
      <div className="grid-3">
        <MetricCard
          label="Total Waiting Shoppers"
          value={totalWaiting}
          sub="Across all checkout lanes"
          icon={<Users size={16} color="var(--accent-primary)" />}
          trend={totalWaiting > 5 ? 'High Congestion' : 'Smooth Flow'}
        />
        <MetricCard
          label="Max Estimated Wait Time"
          value={`${Math.round(maxWait / 60)} min`}
          sub="At peak checkout counter"
          icon={<Clock size={16} color="var(--priority-high-border)" />}
        />
        <MetricCard
          label="Active Open Counters"
          value={`${openCounters} of ${queues.length}`}
          sub="Currently staffed"
          icon={<Flame size={16} color="var(--priority-normal-border)" />}
        />
      </div>

      {/* Counter Grid */}
      <div>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-md)' }}>
          Checkout Lanes & Cashier Allocation
        </h2>
        <div className="grid-3">
          {queues.map((q) => (
            <CounterCard
              key={q.queue_id}
              queue={q}
              onInspect={() => setSelectedQueue(q)}
            />
          ))}
        </div>
      </div>

      <QueueDrawer queue={selectedQueue} onClose={() => setSelectedQueue(null)} />
    </div>
  );
};
