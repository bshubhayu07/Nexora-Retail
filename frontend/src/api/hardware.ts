import { apiClient } from './client';
import { EdgeHardwareTelemetryDTO } from '../types/api';

export async function fetchHardwareTelemetry(): Promise<EdgeHardwareTelemetryDTO> {
  return apiClient<EdgeHardwareTelemetryDTO>('/hardware/telemetry');
}
