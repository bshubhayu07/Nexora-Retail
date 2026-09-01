import { apiClient } from './client';
import { AlertLogResponseDTO } from '../types/api';

export async function fetchAlerts(
  unacknowledgedOnly = false,
  severity?: string,
  limit = 25
): Promise<AlertLogResponseDTO[]> {
  const params = new URLSearchParams();
  if (unacknowledgedOnly) params.append('unacknowledged_only', 'true');
  if (severity) params.append('severity', severity);
  params.append('limit', limit.toString());

  return apiClient<AlertLogResponseDTO[]>(`/alerts?${params.toString()}`);
}

export async function acknowledgeAlert(alertId: number): Promise<{ status: string; message: string }> {
  return apiClient(`/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  });
}
