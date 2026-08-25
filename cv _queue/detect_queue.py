cv-queue/detect_queue.py (minimal comments)
python
"""
SIH26179 - Queue Detection Pipeline
Detects people in a defined zone, counts them, outputs JSON for the backend.
"""

import argparse
import json
from datetime import datetime, timezone

import cv2
from ultralytics import YOLO

MODEL_PATH = "yolov8n.pt"
PERSON_CLASS_ID = 0        # COCO class 0 = person
CONF_THRESHOLD = 0.4

QUEUE_ZONE = (0.30, 0.30, 0.95, 0.95)   # (x1, y1, x2, y2) as fraction of frame size
SECONDS_PER_PERSON = 45                  # rough wait-time estimate per person


def in_zone(cx, cy, frame_w, frame_h, zone):
    # True if point (cx, cy) falls inside the queue zone rectangle
    x1, y1, x2, y2 = zone
    return (x1 * frame_w <= cx <= x2 * frame_w) and (y1 * frame_h <= cy <= y2 * frame_h)


def build_output(source_name, queue_count):
    # JSON payload sent to the backend
    return {
        "source": source_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "queue_count": queue_count,
        "avg_wait_estimate_sec": queue_count * SECONDS_PER_PERSON,
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
            queue_count = 0

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
                    queue_count += 1

                if show:
                    color = (0, 200, 0) if in_queue else (150, 150, 150)
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

            # Emit JSON every N frames (avoid flooding output every single frame)
            if frame_idx % print_every_n_frames == 0:
                payload = build_output(str(source), queue_count)
                print(json.dumps(payload))
                # TODO: replace print() with a POST request to the backend endpoint

            if show:
                zx1, zy1 = int(QUEUE_ZONE[0] * frame_w), int(QUEUE_ZONE[1] * frame_h)
                zx2, zy2 = int(QUEUE_ZONE[2] * frame_w), int(QUEUE_ZONE[3] * frame_h)
                cv2.rectangle(frame, (zx1, zy1), (zx2, zy2), (0, 0, 255), 2)
                cv2.putText(frame, f"Queue: {queue_count}", (zx1, zy1 - 10),
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
