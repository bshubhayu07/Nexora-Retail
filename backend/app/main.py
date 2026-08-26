from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.services.edge_simulator import edge_simulator

# Import API Routers
from app.api.v1.edge import router as edge_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.queue import router as queue_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.hardware import router as hardware_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.simulator import router as simulator_router
from app.api.v1.dashboard_ws import router as ws_router

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing SQLite database & creating tables...")
    await init_db()
    logger.info("Starting Edge Camera Background Simulator...")
    #edge_simulator.start()
    
    yield
    
    # Shutdown tasks
    logger.info("Stopping Edge Camera Background Simulator...")
    #edge_simulator.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API powering On-Device AI Retail Intelligence, Real-time Queues, Store Heatmaps & Local LLaMA Copilot for Qualcomm SIH26-26179.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(edge_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(queue_router, prefix=settings.API_V1_STR)
app.include_router(inventory_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(hardware_router, prefix=settings.API_V1_STR)
app.include_router(copilot_router, prefix=settings.API_V1_STR)
app.include_router(simulator_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "dashboard": "/dashboard",
        "docs": "/docs",
        "local_llama_status": "Enabled (Ollama / Fallback)"
    }

@app.get("/dashboard")
async def get_dashboard():
    dashboard_path = os.path.join(os.path.dirname(__file__), "static", "dashboard.html")
    return FileResponse(dashboard_path)

