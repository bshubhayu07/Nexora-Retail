import { apiClient } from './client';
import { QueueStatusResponseDTO } from '../types/api';

export async function fetchQueueStatuses(): Promise<QueueStatusResponseDTO[]> {
  return apiClient<QueueStatusResponseDTO[]>('/queue/status');
}

export async function toggleCounterStatus(
  queueId: string,
  action: 'OPEN' | 'CLOSE'
): Promise<{ status: string; queue_id: string; cashier_status: string; message: string }> {
  return apiClient(`/queue/${queueId}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}
