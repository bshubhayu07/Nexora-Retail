from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Qualcomm Edge AI Retail Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///./retail_intelligence.db"
    
    # Local LLaMA Settings (Ollama / Local Inference)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLAMA_MODEL_NAME: str = "llama3.2"
    
    # Rule Engine Thresholds
    QUEUE_ALERT_THRESHOLD: int = 5  # Shoppers in single queue
    QUEUE_AVG_CHECKOUT_TIME_SEC: int = 120  # Avg checkout time per customer
    SHELF_RESTOCK_THRESHOLD_PCT: float = 20.0  # Shelf fill percentage
    CONGESTION_ALERT_THRESHOLD: int = 8  # Shoppers in 2m radius
    NPU_HIGH_LOAD_THRESHOLD_PCT: float = 90.0
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
