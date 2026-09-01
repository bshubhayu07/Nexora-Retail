import { apiClient } from './client';
import { SimulatorStatusResponseDTO } from '../types/api';

export async function fetchSimulatorStatus(): Promise<SimulatorStatusResponseDTO> {
  return apiClient<SimulatorStatusResponseDTO>('/simulator/status');
}

export async function startSimulator(): Promise<{ status: string; message: string }> {
  return apiClient('/simulator/start', { method: 'POST' });
}

export async function stopSimulator(): Promise<{ status: string; message: string }> {
  return apiClient('/simulator/stop', { method: 'POST' });
}
