from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(String(50), primary_key=True)  # e.g., "cam-01-entrance"
    name = Column(String(100), nullable=False)
    location_zone = Column(String(100), nullable=False)  # "Entrance", "Checkout Queue A", "Aisle 3 (Dairy)"
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, OFFLINE, MAINTENANCE
    edge_device_type = Column(String(100), default="Qualcomm Snapdragon SNPE Edge Node")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ShopperTelemetry(Base):
    __tablename__ = "shopper_telemetry"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    shopper_count = Column(Integer, default=0)
    avg_dwell_time_sec = Column(Float, default=0.0)
    spatial_coords = Column(JSON, nullable=True)  # List of [x, y] coordinates in 0-100% store grid
    demography_summary = Column(JSON, nullable=True)  # Privacy-anonymized aggregated stats

class QueueMetric(Base):
    __tablename__ = "queue_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    queue_id = Column(String(50), nullable=False)  # e.g., "queue-counter-1"
    queue_name = Column(String(100), nullable=False)  # "Cashier Counter 1"
    shopper_count = Column(Integer, default=0)
    estimated_wait_sec = Column(Float, default=0.0)
    is_bottleneck = Column(Boolean, default=False)
    cashier_status = Column(String(20), default="OPEN")  # OPEN, CLOSED, OVERLOADED

class ShelfMetric(Base):
    __tablename__ = "shelf_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    aisle_name = Column(String(50), nullable=False)  # "Aisle 1", "Aisle 2"
    category = Column(String(100), nullable=False)  # "Beverages", "Dairy & Eggs", "Snacks"
    fill_percentage = Column(Float, default=100.0)
    is_out_of_stock = Column(Boolean, default=False)
    product_count = Column(Integer, default=0)

class AlertLog(Base):
    __tablename__ = "alert_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    alert_type = Column(String(50), nullable=False)  # QUEUE_OVERFLOW, SHELF_EMPTY, HIGH_CONGESTION, HARDWARE_WARN
    severity = Column(String(20), default="WARNING")  # INFO, WARNING, CRITICAL
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    source_id = Column(String(100), nullable=True)  # camera_id or queue_id or aisle_name
    is_acknowledged = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class EdgeHardwareTelemetry(Base):
    __tablename__ = "edge_hardware_telemetry"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    device_id = Column(String(100), nullable=False)  # "Qualcomm-RB5-Edge-01"
    fps = Column(Float, default=30.0)
    npu_load_pct = Column(Float, default=45.0)
    memory_usage_mb = Column(Float, default=512.0)
    inference_latency_ms = Column(Float, default=12.4)
    bandwidth_saved_mb = Column(Float, default=15.2)  # Bandwidth saved by on-device processing vs cloud streaming

class CopilotChat(Base):
    __tablename__ = "copilot_chats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_query = Column(Text, nullable=False)
    llama_response = Column(Text, nullable=False)
    used_llm_model = Column(String(100), default="llama3.2")
    context_used = Column(JSON, nullable=True)
