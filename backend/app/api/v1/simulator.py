from fastapi import APIRouter
from app.services.edge_simulator import edge_simulator
from app.schemas.schemas import SimulatorStatusResponse

router = APIRouter(prefix="/simulator", tags=["Mock Camera Simulator"])

@router.post("/start")
async def start_simulator():
    """Start mock camera stream simulation background worker."""
    edge_simulator.start()
    return {"status": "success", "message": "Edge camera simulator started."}

@router.post("/stop")
async def stop_simulator():
    """Stop mock camera stream simulation background worker."""
    edge_simulator.stop()
    return {"status": "success", "message": "Edge camera simulator stopped."}

@router.get("/status", response_model=SimulatorStatusResponse)
async def get_simulator_status():
    """Fetch status of mock camera background simulator."""
    return SimulatorStatusResponse(
        is_running=edge_simulator.is_running,
        active_cameras_simulated=4 if edge_simulator.is_running else 0,
        frames_emitted=edge_simulator.frames_emitted,
        current_mode="ACTIVE_RETAIL_SIMULATION" if edge_simulator.is_running else "IDLE"
    )
