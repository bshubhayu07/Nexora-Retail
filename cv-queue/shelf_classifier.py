import argparse
import json
 
import requests
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
 
CLASSES = ["empty", "low", "stocked"]  # must match training order exactly
MODEL_PATH = "shelf_classifier.pt"
 
# Category -> approximate fill percentage band. Simple, defensible mapping -
# swap for true regression later if you have time and more labeled data.
FILL_PERCENTAGE_MAP = {
    "empty": 10.0,
    "low": 40.0,
    "stocked": 85.0,
}
 
BACKEND_URL = "http://localhost:8000"
INGEST_ENDPOINT = f"{BACKEND_URL}/api/v1/edge/shelf"
 
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])
 
 
def load_model(model_path=MODEL_PATH):
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, len(CLASSES))
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    return model
 
 
def classify_image(model, image_path):
    img = Image.open(image_path).convert("RGB")
    tensor = TRANSFORM(img).unsqueeze(0)
    with torch.no_grad():
        outputs = model(tensor)
        pred_idx = outputs.argmax(dim=1).item()
    return CLASSES[pred_idx]
 
 
def build_output(aisle_name, category, fill_percentage, product_count):
    # Matches backend's ShelfMetricPayload schema exactly - confirmed against
    # backend/app/schemas/schemas.py. No stock_status/confidence field exists
    # there, so we only send what they accept.
    return {
        "aisle_name": aisle_name,
        "category": category,
        "fill_percentage": fill_percentage,
        "product_count": product_count,
    }
 
 
def run(image_path, aisle_name, category, product_count, dry_run=False):
    model = load_model()
    predicted_class = classify_image(model, image_path)
    fill_percentage = FILL_PERCENTAGE_MAP[predicted_class]
 
    payload = build_output(aisle_name, category, fill_percentage, product_count)
    print(f"[INFO] Predicted class: {predicted_class} -> fill_percentage={fill_percentage}")
    print(json.dumps(payload, indent=2))
 
    if dry_run:
        print("[DRY RUN] Not sending to backend.")
        return
 
    try:
        resp = requests.post(INGEST_ENDPOINT, json=payload, timeout=2)
        if resp.status_code == 201:
            print(f"[SENT] {resp.json()}")
        else:
            print(f"[WARN] Backend returned {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Could not reach backend: {e}")
 
 
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to a shelf photo")
    parser.add_argument("--aisle", required=True, help="Aisle name, e.g. 'Aisle 3'")
    parser.add_argument("--category", required=True, help="Product category, e.g. 'Snacks'")
    parser.add_argument("--count", type=int, required=True, help="Approximate product_count on shelf")
    parser.add_argument("--dry-run", action="store_true", help="Classify + print only, skip POST")
    args = parser.parse_args()
    run(args.image, args.aisle, args.category, args.count, dry_run=args.dry_run)
