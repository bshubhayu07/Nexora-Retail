// Raw backend DTO interfaces matching FastAPI Pydantic schemas

export interface OverviewKPIDTO {
  total_footfall_today: number;
  active_shoppers_now: number;
  avg_dwell_time_minutes: number;
  active_queues_count: number;
  peak_hour: string;
  low_stock_shelves_count: number;
  critical_alerts_count: number;
  edge_npu_health_pct: number;
}

export interface HeatmapPointDTO {
  x: number;
  y: number;
  value: number; // 0.0 to 1.0
}

export interface HeatmapGridResponseDTO {
  grid_size: number;
  points: HeatmapPointDTO[];
  total_samples: number;
  high_dwell_zones: string[];
}

export interface QueueStatusResponseDTO {
  queue_id: string;
  queue_name: string;
  camera_id: string;
  shopper_count: number;
  estimated_wait_sec: number;
  cashier_status: 'OPEN' | 'BUSY' | 'OVERLOADED' | 'CLOSED' | string;
  recommendation: string;
}

export interface ShelfStatusResponseDTO {
  id: number;
  aisle_name: string;
  category: string;
  fill_percentage: number;
  is_out_of_stock: boolean;
  product_count: number;
  status_label: 'GOOD' | 'LOW_STOCK' | 'CRITICAL_OUT_OF_STOCK' | string;
}

export interface AlertLogResponseDTO {
  id: number;
  timestamp: string;
  alert_type: 'QUEUE_OVERFLOW' | 'SHELF_EMPTY' | 'HIGH_CONGESTION' | 'HARDWARE_WARN' | string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  title: string;
  message: string;
  source_id?: string | null;
  is_acknowledged: boolean;
  resolved_at?: string | null;
}

export interface EdgeHardwareTelemetryDTO {
  device_id: string;
  fps: number;
  npu_load_pct: number;
  memory_usage_mb: number;
  inference_latency_ms: number;
  bandwidth_saved_mb: number;
}

export interface CopilotChatResponseDTO {
  user_query: string;
  llama_response: string;
  used_llm_model: string;
  is_live_llama: boolean;
  sources_used: string[];
  timestamp: string;
}

export interface SimulatorStatusResponseDTO {
  is_running: boolean;
  active_cameras_simulated: number;
  frames_emitted: number;
  current_mode: string;
}

export interface AnalyticsTrendsResponseDTO {
  time_window_minutes: number;
  footfall_trend: Array<{
    timestamp: string;
    time_label: string;
    shopper_count: number;
    avg_dwell_min: number;
  }>;
  queue_trend: Array<{
    timestamp: string;
    time_label: string;
    queue_id: string;
    queue_name: string;
    shopper_count: number;
    estimated_wait_min: number;
    cashier_status: string;
  }>;
  shelf_inventory: Array<{
    aisle_name: string;
    category: string;
    fill_percentage: number;
    product_count: number;
    is_out_of_stock: boolean;
  }>;
}
