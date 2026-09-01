import os
import sys
import pytest
import numpy as np

# Ensure root in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cv_edge.models.base import Detection
from cv_edge.models.onnx_detector import ONNXDetector
from cv_edge.models.model_registry import ModelRegistry


def test_detection_dataclass():
    det = Detection(box=(10.0, 20.0, 100.0, 200.0), confidence=0.85, class_id=0, class_name="person")
    assert det.class_name == "person"
    assert det.confidence == 0.85
    assert det.box == (10.0, 20.0, 100.0, 200.0)


def test_onnx_model_registry():
    models = ModelRegistry.verify_local_models()
    assert models["person_fp32"]["exists"] is True
    assert models["person_fp32"]["size_mb"] > 1.0
    assert models["shelf_detector"]["exists"] is True


def test_onnx_detector_cpu_loading():
    person_path = ModelRegistry.get_person_model_path()
    detector = ONNXDetector(person_path, confidence_threshold=0.3)
    info = detector.get_device_info()
    assert info["active_provider"] in ("CPUExecutionProvider", "DirectMLExecutionProvider", "CUDAExecutionProvider")
    assert "input_shape" in info


def test_onnx_detector_inference_on_synthetic_image():
    person_path = ModelRegistry.get_person_model_path()
    detector = ONNXDetector(person_path, confidence_threshold=0.2)
    # 640x640 blank image
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    dets = detector.detect(img)
    assert isinstance(dets, list)


def test_onnx_letterbox():
    person_path = ModelRegistry.get_person_model_path()
    detector = ONNXDetector(person_path)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    boxed, ratio, (dw, dh) = detector._letterbox(img, new_shape=(640, 640))
    assert boxed.shape == (640, 640, 3)
    assert ratio > 0
