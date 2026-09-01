import os
import logging
from typing import Optional

logger = logging.getLogger("model_registry")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "models")
SHOPPER_MODEL_DIR = os.path.join(MODELS_DIR, "shopper")
SHELF_MODEL_DIR = os.path.join(MODELS_DIR, "shelf")

DEFAULT_PERSON_MODEL = os.path.join(SHOPPER_MODEL_DIR, "yolov8n.onnx")
DEFAULT_PERSON_INT8_MODEL = os.path.join(SHOPPER_MODEL_DIR, "yolov8n_int8.onnx")
DEFAULT_SHELF_MODEL = os.path.join(SHELF_MODEL_DIR, "shelf_detector.onnx")


class ModelRegistry:
    """Manages local ONNX model artifacts for Edge AI execution."""

    @classmethod
    def ensure_directories(cls):
        os.makedirs(SHOPPER_MODEL_DIR, exist_ok=True)
        os.makedirs(SHELF_MODEL_DIR, exist_ok=True)

    @classmethod
    def get_person_model_path(cls, prefer_int8: bool = False) -> str:
        cls.ensure_directories()

        if prefer_int8 and os.path.exists(DEFAULT_PERSON_INT8_MODEL):
            return DEFAULT_PERSON_INT8_MODEL

        if os.path.exists(DEFAULT_PERSON_MODEL):
            return DEFAULT_PERSON_MODEL

        # Check if local PyTorch weights exist and export locally to ONNX
        logger.info("Exporting local YOLOv8n to ONNX format...")
        try:
            from ultralytics import YOLO
            model = YOLO("yolov8n.pt")
            exported_path = model.export(format="onnx", imgsz=640, dynamic=False, opset=12)
            if os.path.exists(exported_path):
                import shutil
                shutil.move(exported_path, DEFAULT_PERSON_MODEL)
                logger.info(f"YOLOv8n ONNX exported to {DEFAULT_PERSON_MODEL}")
                return DEFAULT_PERSON_MODEL
        except Exception as e:
            logger.warning(f"Could not automatically export YOLOv8n: {e}")

        return DEFAULT_PERSON_MODEL

    @classmethod
    def get_shelf_model_path(cls) -> str:
        cls.ensure_directories()
        return DEFAULT_SHELF_MODEL

    @classmethod
    def verify_local_models(cls) -> dict:
        """Verifies that models are present on the local filesystem."""
        cls.ensure_directories()
        models = {
            "person_fp32": {
                "path": DEFAULT_PERSON_MODEL,
                "exists": os.path.exists(DEFAULT_PERSON_MODEL),
                "size_mb": os.path.getsize(DEFAULT_PERSON_MODEL) / (1024 * 1024) if os.path.exists(DEFAULT_PERSON_MODEL) else 0.0
            },
            "person_int8": {
                "path": DEFAULT_PERSON_INT8_MODEL,
                "exists": os.path.exists(DEFAULT_PERSON_INT8_MODEL),
                "size_mb": os.path.getsize(DEFAULT_PERSON_INT8_MODEL) / (1024 * 1024) if os.path.exists(DEFAULT_PERSON_INT8_MODEL) else 0.0
            },
            "shelf_detector": {
                "path": DEFAULT_SHELF_MODEL,
                "exists": os.path.exists(DEFAULT_SHELF_MODEL),
                "size_mb": os.path.getsize(DEFAULT_SHELF_MODEL) / (1024 * 1024) if os.path.exists(DEFAULT_SHELF_MODEL) else 0.0
            }
        }
        return models
