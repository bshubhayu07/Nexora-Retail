import { apiClient } from './client';
import { OverviewKPIDTO, HeatmapGridResponseDTO, AnalyticsTrendsResponseDTO } from '../types/api';

export async function fetchOverviewKPI(): Promise<OverviewKPIDTO> {
  return apiClient<OverviewKPIDTO>('/analytics/overview');
}

export async function fetchHeatmap(gridSize = 20, timeWindowMinutes = 60): Promise<HeatmapGridResponseDTO> {
  return apiClient<HeatmapGridResponseDTO>(`/analytics/heatmap?grid_size=${gridSize}&time_window_minutes=${timeWindowMinutes}`);
}

export async function fetchTrends(timeWindowMinutes = 180): Promise<AnalyticsTrendsResponseDTO> {
  return apiClient<AnalyticsTrendsResponseDTO>(`/analytics/trends?time_window_minutes=${timeWindowMinutes}`);
}
