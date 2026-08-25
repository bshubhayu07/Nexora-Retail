from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Telemetry & Ingestion ---
class SpatialCoord(BaseModel):
    x: float = Field(..., description="X coordinate in 0-100% store grid")
    y: float = Field(..., description="Y coordinate in 0-100% store grid")
    dwell_sec: Optional[float] = 0.0

class ShopperTelemetryPayload(BaseModel):
    camera_id: str
    shopper_count: int
    avg_dwell_time_sec: float
    spatial_coords: List[SpatialCoord] = []
    demography_summary: Optional[Dict[str, Any]] = None

class QueueMetricPayload(BaseModel):
    camera_id: str
    queue_id: str
    queue_name: str
    shopper_count: int
    estimated_wait_sec: Optional[float] = None
    cashier_status: Optional[str] = "OPEN"

class ShelfMetricPayload(BaseModel):
    aisle_name: str
    category: str
    fill_percentage: float
    product_count: int

class EdgeHardwareTelemetryPayload(BaseModel):
    device_id: str
    fps: float
    npu_load_pct: float
    memory_usage_mb: float
    inference_latency_ms: float
    bandwidth_saved_mb: float

# --- Analytics Responses ---
class OverviewKPI(BaseModel):
    total_footfall_today: int
    active_shoppers_now: int
    avg_dwell_time_minutes: float
    active_queues_count: int
    peak_hour: str
    low_stock_shelves_count: int
    critical_alerts_count: int
    edge_npu_health_pct: float

class HeatmapPoint(BaseModel):
    x: float
    y: float
    value: float  # Intensity 0.0 - 1.0

class HeatmapGridResponse(BaseModel):
    grid_size: int = 20
    points: List[HeatmapPoint]
    total_samples: int
    high_dwell_zones: List[str]

class QueueStatusResponse(BaseModel):
    queue_id: str
    queue_name: str
    camera_id: str
    shopper_count: int
    estimated_wait_sec: float
    cashier_status: str
    recommendation: str  # e.g., "Optimal", "Open Counter 3", "Overloaded"

class ShelfStatusResponse(BaseModel):
    id: int
    aisle_name: str
    category: str
    fill_percentage: float
    is_out_of_stock: bool
    product_count: int
    status_label: str  # "GOOD", "LOW_STOCK", "CRITICAL_OUT_OF_STOCK"

class AlertLogResponse(BaseModel):
    id: int
    timestamp: datetime
    alert_type: str
    severity: str
    title: str
    message: str
    source_id: Optional[str]
    is_acknowledged: bool
    resolved_at: Optional[datetime]

# --- Copilot / LLaMA Schemas ---
class CopilotChatRequest(BaseModel):
    user_query: str = Field(..., json_schema_extra={"example": "Why is the checkout area backed up right now?"})
    use_llama: bool = True

class CopilotChatResponse(BaseModel):
    user_query: str
    llama_response: str
    used_llm_model: str
    is_live_llama: bool
    sources_used: List[str]
    timestamp: datetime

# --- Simulator Schemas ---
class SimulatorStatusResponse(BaseModel):
    is_running: bool
    active_cameras_simulated: int
    frames_emitted: int
    current_mode: str
