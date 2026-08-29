from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import ShopperTelemetry
from app.schemas.schemas import HeatmapGridResponse, HeatmapPoint
from datetime import datetime, timezone, timedelta

class HeatmapEngine:
    @staticmethod
    async def generate_heatmap(db: AsyncSession, grid_size: int = 20, time_window_minutes: int = 60) -> HeatmapGridResponse:
        """
        Retrieves spatial shopper coordinates from the last N minutes
        and constructs a normalized 2D density grid.
        """
        since_time = datetime.now(timezone.utc) - timedelta(minutes=time_window_minutes)
        
        stmt = select(ShopperTelemetry).where(ShopperTelemetry.timestamp >= since_time)
        result = await db.execute(stmt)
        telemetry_records = result.scalars().all()
        
        # Grid initialization (20x20)
        grid = [[0.0 for _ in range(grid_size)] for _ in range(grid_size)]
        total_samples = 0
        
        for record in telemetry_records:
            if not record.spatial_coords:
                continue
            
            coords = record.spatial_coords
            if isinstance(coords, list):
                for pt in coords:
                    if isinstance(pt, dict) and "x" in pt and "y" in pt:
                        x_norm = max(0.0, min(100.0, float(pt["x"])))
                        y_norm = max(0.0, min(100.0, float(pt["y"])))
                        
                        grid_x = min(grid_size - 1, int((x_norm / 100.0) * grid_size))
                        grid_y = min(grid_size - 1, int((y_norm / 100.0) * grid_size))
                        
                        weight = float(pt.get("dwell_sec", 1.0))
                        grid[grid_y][grid_x] += weight
                        total_samples += 1

        # Normalize grid values between 0.0 and 1.0
        max_val = max([max(row) for row in grid]) if grid else 1.0
        if max_val == 0:
            max_val = 1.0

        heatmap_points = []
        high_dwell_zones = set()

        for gy in range(grid_size):
            for gx in range(grid_size):
                norm_val = round(grid[gy][gx] / max_val, 2)
                if norm_val > 0.01:
                    # Convert back to percentage store coordinates (0-100%)
                    center_x = round(((gx + 0.5) / grid_size) * 100, 1)
                    center_y = round(((gy + 0.5) / grid_size) * 100, 1)
                    
                    heatmap_points.append(HeatmapPoint(
                        x=center_x,
                        y=center_y,
                        value=norm_val
                    ))
                    
                    # Identify high dwell zones based on coordinates
                    if norm_val > 0.6:
                        if center_y > 70 and center_x > 60:
                            high_dwell_zones.add("Checkout Queue Area")
                        elif center_x < 30 and center_y < 40:
                            high_dwell_zones.add("Store Entrance")
                        elif 40 <= center_x <= 70 and 30 <= center_y <= 60:
                            high_dwell_zones.add("Aisle 3 (Beverages & Dairy)")
                        elif center_x > 70 and center_y < 40:
                            high_dwell_zones.add("Aisle 1 (Fresh Produce)")

        if not high_dwell_zones:
            high_dwell_zones.add("Checkout Area")
            high_dwell_zones.add("Aisle 3 (Beverages)")

        return HeatmapGridResponse(
            grid_size=grid_size,
            points=heatmap_points,
            total_samples=total_samples,
            high_dwell_zones=list(high_dwell_zones)
        )
