import os
import sys
import time
import argparse
import logging
import base64
import yaml
import numpy as np
import cv2

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from cv_edge.pipelines.shopper_pipeline import ShopperIntelligencePipeline
from cv_edge.pipelines.inventory_pipeline import InventoryIntelligencePipeline
from cv_edge.models.model_registry import ModelRegistry
from cv_edge.integration.backend_client import BackendIntegrationClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("run_cv")


def create_demo_frame(frame_idx: int, width: int = 1280, height: int = 720):
    """Generates synthetic visual frames with realistic moving shopper avatars and shelf regions for demo/testing."""
    frame = np.full((height, width, 3), (25, 30, 42), dtype=np.uint8)

    # Draw store floor grid tiles
    for x in range(0, width, 80):
        cv2.line(frame, (x, 0), (x, height), (35, 42, 56), 1)
    for y in range(0, height, 80):
        cv2.line(frame, (0, y), (width, y), (35, 42, 56), 1)

    # Draw Store Entrance Area (Top-Left)
    cv2.rectangle(frame, (30, 20), (380, 160), (45, 38, 30), -1)
    cv2.rectangle(frame, (30, 20), (380, 160), (90, 75, 55), 2)
    cv2.putText(frame, "Store Entrance & Virtual Gate", (45, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (220, 200, 170), 2)

    # Draw Promotional Display Area (Top-Center)
    cv2.rectangle(frame, (int(0.1 * width), int(0.1 * height)), (int(0.45 * width), int(0.45 * height)), (40, 50, 65), 1)
    cv2.putText(frame, "Promotional Display Zone", (int(0.1 * width) + 10, int(0.1 * height) + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (140, 180, 220), 1)

    # Draw Aisle 3 Shelf Monitoring Area (Center-Right)
    cv2.rectangle(frame, (520, 40), (820, 320), (28, 42, 35), -1)
    cv2.rectangle(frame, (520, 40), (820, 320), (60, 100, 80), 2)
    cv2.putText(frame, "Aisle 3: Dairy & Milk Shelf", (535, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (160, 230, 190), 2)

    # Time oscillation
    t = frame_idx * 0.035

    # Simulated shelf counts: Upper shelf well-stocked (6-8), Lower shelf low stock (1-3)
    upper_count = max(4, min(8, int(6 + 2.0 * np.sin(t * 0.1))))
    lower_count = max(1, min(3, int(1 + 1.2 * np.sin(t * 0.15))))
    shelf_counts = [upper_count, lower_count]

    # Draw Upper Shelf product slot block (Expected 8 items)
    cv2.rectangle(frame, (540, 95), (805, 185), (38, 55, 48), -1)
    cv2.rectangle(frame, (540, 95), (805, 185), (55, 90, 75), 1)
    cv2.putText(frame, f"Upper Shelf (Expected: 8 | Detected: {upper_count})", (548, 114), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 220, 200), 1)

    for i in range(8):
        sx = 548 + i * 31
        if i < upper_count:
            # Draw milk bottle avatar
            cv2.rectangle(frame, (sx, 124), (sx + 22, 175), (235, 245, 255), -1)
            cv2.rectangle(frame, (sx, 124), (sx + 22, 175), (70, 130, 180), 1)
            cv2.rectangle(frame, (sx + 6, 118), (sx + 16, 124), (50, 100, 220), -1)
            cv2.putText(frame, "M", (sx + 4, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (50, 100, 220), 1)
        else:
            # Draw empty slot outline
            cv2.rectangle(frame, (sx, 124), (sx + 22, 175), (45, 60, 52), 1)
            cv2.putText(frame, "--", (sx + 3, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (70, 90, 80), 1)

    # Draw Lower Shelf product slot block (Expected 10 items)
    cv2.rectangle(frame, (540, 205), (805, 295), (38, 55, 48), -1)
    cv2.rectangle(frame, (540, 205), (805, 295), (55, 90, 75), 1)
    cv2.putText(frame, f"Lower Shelf (Expected: 10 | Detected: {lower_count})", (548, 224), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (245, 170, 100), 1)

    for i in range(10):
        sx = 546 + i * 25
        if i < lower_count:
            # Draw yogurt / juice carton avatar
            cv2.rectangle(frame, (sx, 234), (sx + 18, 285), (180, 240, 210), -1)
            cv2.rectangle(frame, (sx, 234), (sx + 18, 285), (30, 140, 90), 1)
            cv2.rectangle(frame, (sx + 4, 228), (sx + 14, 234), (20, 100, 60), -1)
            cv2.putText(frame, "J", (sx + 3, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (20, 100, 60), 1)
        else:
            # Draw empty slot outline
            cv2.rectangle(frame, (sx, 234), (sx + 18, 285), (45, 60, 52), 1)
            cv2.putText(frame, "--", (sx + 2, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.30, (70, 90, 80), 1)

    # Draw Checkout Counter 1 Area (Bottom-Right)
    cv2.rectangle(frame, (width - 520, height - 380), (width - 40, height - 40), (35, 52, 42), -1)
    cv2.rectangle(frame, (width - 520, height - 380), (width - 40, height - 40), (60, 110, 80), 2)
    cv2.putText(frame, "Checkout Counter 1 & POS Terminal", (width - 490, height - 340), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (180, 230, 180), 2)

    # Distinct non-overlapping people trajectories
    # Person 1 traverses vertically across the entrance line (y=360)
    p1_y = int(360 + 160 * np.sin(t * 0.6))
    p1_x = int(140 + 35 * np.cos(t * 0.4))

    people_positions = [
        # Person 1: Crossing virtual entry line
        (p1_x, p1_y),
        # Person 2: In Aisle 1 Produce / Snacks area
        (int(360 + 60 * np.cos(t * 0.4)), int(460 + 40 * np.sin(t * 0.5))),
        # Person 3: In checkout queue spot 1 (front)
        (int(width - 380 + 10 * np.sin(t * 0.2)), int(height - 230 + 8 * np.cos(t * 0.2))),
        # Person 4: In checkout queue spot 2 (middle)
        (int(width - 290 + 8 * np.cos(t * 0.2)), int(height - 180 + 6 * np.sin(t * 0.2))),
        # Person 5: In checkout queue spot 3 (back)
        (int(width - 200 + 6 * np.sin(t * 0.3)), int(height - 130 + 5 * np.cos(t * 0.3))),
        # Person 6: In Promotional Display Zone
        (int(240 + 40 * np.sin(t * 0.25)), int(110 + 25 * np.cos(t * 0.25)))
    ]

    demo_boxes = []
    # Draw person avatars (head + body + drop shadow)
    for idx, (px, py) in enumerate(people_positions):
        px = max(60, min(width - 60, px))
        py = max(80, min(height - 90, py))
        # Drop shadow
        cv2.ellipse(frame, (px, py + 58), (28, 10), 0, 0, 360, (15, 18, 25), -1)
        # Body
        body_color = (65, 125, 195) if idx == 0 else ((190, 110, 60) if idx == 1 else (75, 155, 95))
        cv2.rectangle(frame, (px - 26, py - 32), (px + 26, py + 54), body_color, -1)
        cv2.rectangle(frame, (px - 26, py - 32), (px + 26, py + 54), (230, 240, 255), 1)
        # Head
        cv2.circle(frame, (px, py - 48), 17, (215, 190, 155), -1)
        cv2.circle(frame, (px, py - 48), 17, (245, 225, 200), 1)

        # Bounding box for detector/tracker
        demo_boxes.append((float(px - 30), float(py - 68), float(px + 30), float(py + 58)))

    return frame, demo_boxes, shelf_counts


def load_config(config_path: str) -> dict:
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return yaml.safe_load(f) or {}
    return {}


def main():
    parser = argparse.ArgumentParser(description="Nexora Retail On-Device Edge Computer Vision Runner")
    parser.add_argument("--pipeline", choices=["shopper", "inventory", "all"], default="shopper",
                        help="CV pipeline to execute (shopper, inventory, or all)")
    parser.add_argument("--source", choices=["webcam", "video", "demo"], default="demo",
                        help="Input video feed source (webcam, video, demo)")
    parser.add_argument("--path", type=str, default="", help="File path when --source is video")
    parser.add_argument("--show", action="store_true", help="Display real-time OpenCV graphical window")
    parser.add_argument("--headless", action="store_true", help="Run in headless background mode (no GUI)")
    parser.add_argument("--config", type=str, default="cv_edge/config/cv_config.yaml", help="Config file path")
    parser.add_argument("--prefer-int8", action="store_true", help="Use INT8 Quantized ONNX model")
    parser.add_argument("--backend-url", type=str, default="http://127.0.0.1:8000", help="FastAPI Backend URL")
    args = parser.parse_args()

    # Determine display mode
    show_gui = args.show and not args.headless
    cfg = load_config(args.config)

    logger.info("==========================================================")
    logger.info("  NEXORA RETAIL INTELLIGENCE - 100% LOCAL EDGE CV ENGINE")
    logger.info("  Zero-Cloud Architecture | On-Device Privacy Guaranteed")
    logger.info("==========================================================")
    logger.info(f"Pipeline: {args.pipeline.upper()} | Source: {args.source.upper()}")
    logger.info(f"Backend Integration Target: {args.backend_url}")

    # Shared Backend Client for Camera Frame streaming
    backend_client = BackendIntegrationClient(base_url=args.backend_url)

    # Initialize video capture
    cap = None
    if args.source == "webcam":
        cam_idx = cfg.get("camera", {}).get("source", 0)
        logger.info(f"Opening webcam index {cam_idx}...")
        cap = cv2.VideoCapture(cam_idx)
        if not cap.isOpened():
            logger.warning(f"Webcam {cam_idx} not accessible. Falling back to DEMO simulation mode.")
            args.source = "demo"
    elif args.source == "video":
        if not os.path.exists(args.path):
            logger.warning(f"Video file not found at '{args.path}'. Falling back to DEMO simulation mode.")
            args.source = "demo"
        else:
            logger.info(f"Opening video file: {args.path}")
            cap = cv2.VideoCapture(args.path)

    # Initialize requested pipelines
    shopper_pipeline = None
    inventory_pipeline = None

    if args.pipeline in ("shopper", "all"):
        logger.info("Initializing Shopper & Queue Intelligence Pipeline...")
        shopper_pipeline = ShopperIntelligencePipeline(
            backend_url=args.backend_url,
            prefer_int8=args.prefer_int8
        )

    if args.pipeline in ("inventory", "all"):
        logger.info("Initializing Shelf & Inventory Intelligence Pipeline...")
        inventory_pipeline = InventoryIntelligencePipeline(
            mode=cfg.get("shelf_model", {}).get("mode", "generic"),
            backend_url=args.backend_url
        )

    frame_idx = 0
    last_frame_stream_time = 0.0
    logger.info("Edge CV processing loop started. Press Ctrl+C or 'q' in window to exit.\n")

    try:
        while True:
            demo_boxes = None
            shelf_counts = None

            # 1. Read Frame
            if args.source == "demo":
                frame, demo_boxes, shelf_counts = create_demo_frame(frame_idx)
                time.sleep(0.033)  # Emulate 30 FPS
            else:
                ret, frame = cap.read()
                if not ret:
                    logger.info("Video stream ended or frame unreadable.")
                    break

            display_frame = frame.copy()
            current_fps = 30.0
            active_shopper_count = 0

            # 2. Execute Shopper Pipeline
            if shopper_pipeline is not None:
                shopper_out = shopper_pipeline.process_frame(
                    display_frame,
                    annotate=show_gui or True,
                    simulated_boxes=demo_boxes
                )
                if shopper_out.annotated_frame is not None:
                    display_frame = shopper_out.annotated_frame

                current_fps = shopper_out.fps
                active_shopper_count = len(shopper_out.tracks)

                if frame_idx % 30 == 0:
                    q = shopper_out.queue
                    qp = shopper_out.queue_prediction
                    f = shopper_out.footfall
                    logger.info(
                        f"[Shopper & Queue] InStore: {f.current_occupancy} (In:{f.entries}/Out:{f.exits}) | "
                        f"Queue: {q.shopper_count} ({q.status}) | "
                        f"Wait: {q.estimated_wait_sec/60:.1f}m | "
                        f"Pred: {qp.predicted_queue_length} | FPS: {shopper_out.fps:.1f}"
                    )

            # 3. Execute Inventory Pipeline on top of current display frame
            if inventory_pipeline is not None:
                shelf_out = inventory_pipeline.process_frame(
                    display_frame,
                    annotate=show_gui or True,
                    simulated_counts=shelf_counts
                )
                if shelf_out.annotated_frame is not None:
                    display_frame = shelf_out.annotated_frame

                if frame_idx % 30 == 0:
                    for s in shelf_out.results:
                        logger.info(
                            f"[Shelf] {s.aisle_name} ({s.category}): {s.status} | "
                            f"Fill: {s.smoothed_fill_pct:.1f}% ({s.detected_count}/{s.expected_count})"
                        )

            # 4. Stream Live Visual Preview Frame to Web Dashboard (~3 times/sec)
            now = time.time()
            if now - last_frame_stream_time >= 0.35:
                try:
                    preview_img = cv2.resize(display_frame, (640, 360))
                    _, buf = cv2.imencode(".jpg", preview_img, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                    b64_str = base64.b64encode(buf).decode("utf-8")
                    backend_client.send_camera_frame(
                        camera_id="cam-01-entrance",
                        image_base64=b64_str,
                        fps=current_fps,
                        shopper_count=active_shopper_count,
                        status_label="LIVE EDGE STREAM"
                    )
                except Exception as e:
                    logger.debug(f"Frame preview stream skipped: {e}")
                last_frame_stream_time = now

            # 5. Display Window (if enabled)
            if show_gui:
                cv2.imshow("Nexora Edge AI Intelligence Feed", display_frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q") or key == 27:
                    logger.info("Quit requested via keyboard.")
                    break

            frame_idx += 1

    except KeyboardInterrupt:
        logger.info("\nExecution interrupted by user.")
    finally:
        if cap is not None:
            cap.release()
        if show_gui:
            cv2.destroyAllWindows()
        logger.info("Edge CV Pipeline terminated cleanly.")


if __name__ == "__main__":
    main()
