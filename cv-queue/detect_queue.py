import argparse
import json
from datetime import datetime, timezone
 
import cv2
import requests
from ultralytics import YOLO
 
MODEL_PATH = "yolov8n.pt"
PERSON_CLASS_ID = 0        # COCO class 0 = person
CONF_THRESHOLD = 0.4
 
QUEUE_ZONE = (0.0, 0.0, 1.0, 1.0)   # (x1, y1, x2, y2) as fraction of frame size
SECONDS_PER_PERSON = 45                  # rough wait-time estimate per person
 
# Identity fields required by the backend's QueueMetricPayload schema.
# Update these per physical camera/queue if you run more than one.
CAMERA_ID = "queue_camera_1"
QUEUE_ID = "q1"
QUEUE_NAME = "Checkout Queue 1"
 
# Confirmed live from backend/app/api/v1/edge.py + app/config.py's API_V1_STR
BACKEND_URL = "http://localhost:8000"
INGEST_ENDPOINT = f"{BACKEND_URL}/api/v1/edge/queue"
 
 
def in_zone(cx, cy, frame_w, frame_h, zone):
    # True if point (cx, cy) falls inside the queue zone rectangle
    x1, y1, x2, y2 = zone
    return (x1 * frame_w <= cx <= x2 * frame_w) and (y1 * frame_h <= cy <= y2 * frame_h)
 
 
def build_output(camera_id, queue_id, queue_name, shopper_count):
    # Matches backend's QueueMetricPayload schema exactly - field names are final,
    # confirmed against backend/app/schemas/. No "timestamp" field here - the
    # backend stamps that itself on ingest.
    return {
        "camera_id": camera_id,
        "queue_id": queue_id,
        "queue_name": queue_name,
        "shopper_count": shopper_count,
        "estimated_wait_sec": shopper_count * SECONDS_PER_PERSON,
        "cashier_status": "OPEN",  # TODO: wire up real cashier-status input if available
    }
 
 
def run(source, show=False, print_every_n_frames=15):
    model = YOLO(MODEL_PATH)
    cap_source = int(source) if str(source).isdigit() else source
    cap = cv2.VideoCapture(cap_source)
 
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video source: {source}")
 
    frame_idx = 0
    print(f"[INFO] Running on source={source} ... Ctrl+C to stop.\n")
 
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("[INFO] Stream ended.")
                break
 
            frame_h, frame_w = frame.shape[:2]
            results = model(frame, verbose=False)[0]
            shopper_count = 0
 
            # Loop over detections, keep only confident person detections
            for box in results.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if cls_id != PERSON_CLASS_ID or conf < CONF_THRESHOLD:
                    continue
 
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                in_queue = in_zone(cx, cy, frame_w, frame_h, QUEUE_ZONE)
                if in_queue:
                    shopper_count += 1
 
                if show:
                    color = (0, 200, 0) if in_queue else (150, 150, 150)
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
 
            # Emit JSON every N frames (avoid flooding output every single frame)
            if frame_idx % print_every_n_frames == 0:
                payload = build_output(CAMERA_ID, QUEUE_ID, QUEUE_NAME, shopper_count)
                try:
                    resp = requests.post(INGEST_ENDPOINT, json=payload, timeout=2)
                    if resp.status_code == 201:
                        print(f"[SENT] {json.dumps(payload)}")
                    else:
                        print(f"[WARN] Backend returned {resp.status_code}: {resp.text}")
                except requests.exceptions.RequestException as e:
                    # Backend down/unreachable - log and keep the detection loop alive
                    print(f"[ERROR] Could not reach backend: {e}")
 
            if show:
                zx1, zy1 = int(QUEUE_ZONE[0] * frame_w), int(QUEUE_ZONE[1] * frame_h)
                zx2, zy2 = int(QUEUE_ZONE[2] * frame_w), int(QUEUE_ZONE[3] * frame_h)
                cv2.rectangle(frame, (zx1, zy1), (zx2, zy2), (0, 0, 255), 2)
                cv2.putText(frame, f"Queue: {shopper_count}", (zx1, zy1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                cv2.imshow("Queue Detection", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
 
            frame_idx += 1
 
    except KeyboardInterrupt:
        print("\n[INFO] Stopped by user.")
    finally:
        cap.release()
        if show:
            cv2.destroyAllWindows()
 
 
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="0", help="Webcam index or video file path")
    parser.add_argument("--show", action="store_true", help="Show live detection window")
    args = parser.parse_args()
    run(args.source, show=args.show)
