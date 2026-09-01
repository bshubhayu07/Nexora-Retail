import os
import time
import logging
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import cv2
import onnxruntime as ort

from .base import BaseDetector, Detection

logger = logging.getLogger("onnx_detector")


class ONNXDetector(BaseDetector):
    """Hardware-aware ONNX Runtime object detector supporting standard YOLO formats.

    Automatically detects available local execution providers (DirectML, CUDA, CPU)
    with zero-cloud dependency and reliable CPU fallback.
    """

    COCO_CLASSES = [
        "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
        "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
        "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
        "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
        "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
        "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
        "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
        "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
        "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
        "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
        "toothbrush"
    ]

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.40,
        iou_threshold: float = 0.45,
        target_classes: Optional[List[int]] = None,
        input_size: Tuple[int, int] = (640, 640),
        preferred_provider: Optional[str] = None,
        class_names: Optional[List[str]] = None
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.target_classes = target_classes  # None means all classes
        self.input_size = input_size
        self.class_names = class_names or self.COCO_CLASSES

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ONNX Model file not found at: {model_path}")

        # Hardware-aware provider selection
        self.session, self.active_provider = self._create_session(preferred_provider)
        
        # Inspect model inputs and outputs
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        self.output_names = [o.name for o in self.session.get_outputs()]

        logger.info(
            f"Loaded ONNX Model: {os.path.basename(model_path)} | "
            f"Provider: {self.active_provider} | Input: {self.input_shape}"
        )

    def _create_session(self, preferred_provider: Optional[str] = None) -> Tuple[ort.InferenceSession, str]:
        available = ort.get_available_providers()
        logger.info(f"Available ONNX Runtime execution providers: {available}")

        # Candidate order
        providers_to_try = []
        if preferred_provider and preferred_provider in available:
            providers_to_try.append(preferred_provider)
        
        # Check DirectML (Windows laptop GPU / NPU acceleration)
        if "DmlExecutionProvider" in available and "DmlExecutionProvider" not in providers_to_try:
            providers_to_try.append("DmlExecutionProvider")
        if "DirectMLExecutionProvider" in available and "DirectMLExecutionProvider" not in providers_to_try:
            providers_to_try.append("DirectMLExecutionProvider")
        # Check CUDA
        if "CUDAExecutionProvider" in available and "CUDAExecutionProvider" not in providers_to_try:
            providers_to_try.append("CUDAExecutionProvider")
        # Standard CPU Fallback (guaranteed on all Windows laptops)
        if "CPUExecutionProvider" not in providers_to_try:
            providers_to_try.append("CPUExecutionProvider")

        session = None
        active_provider = "CPUExecutionProvider"

        # Try configuring session options
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = min(4, os.cpu_count() or 2)

        for prov in providers_to_try:
            try:
                session = ort.InferenceSession(self.model_path, sess_options=opts, providers=[prov])
                active_provider = prov
                logger.info(f"Successfully initialized ONNX Runtime session using provider: {prov}")
                break
            except Exception as e:
                logger.warning(f"Failed to initialize provider {prov}: {e}. Falling back...")

        if session is None:
            # Absolute fallback
            session = ort.InferenceSession(self.model_path, providers=["CPUExecutionProvider"])
            active_provider = "CPUExecutionProvider"

        return session, active_provider

    def _letterbox(
        self,
        img: np.ndarray,
        new_shape: Tuple[int, int] = (640, 640),
        color: Tuple[int, int, int] = (114, 114, 114)
    ) -> Tuple[np.ndarray, float, Tuple[float, float]]:
        """Resize and pad image while maintaining aspect ratio."""
        shape = img.shape[:2]  # [height, width]
        r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
        new_unpad = (int(round(shape[1] * r)), int(round(shape[0] * r)))
        dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]
        dw /= 2
        dh /= 2

        if shape[::-1] != new_unpad:
            img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)

        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
        img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
        return img, r, (dw, dh)

    def detect(self, frame: np.ndarray) -> List[Detection]:
        """Runs full end-to-end inference on a frame."""
        if frame is None or frame.size == 0:
            return []

        orig_h, orig_w = frame.shape[:2]
        img, ratio, (dw, dh) = self._letterbox(frame, self.input_size)

        # Preprocessing: BGR -> RGB, HWC -> CHW, 0..255 -> 0..1 float32
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        blob = np.expand_dims(img, axis=0)

        # Inference
        outputs = self.session.run(self.output_names, {self.input_name: blob})
        output = outputs[0]  # Shape typically [1, 84, 8400] for YOLOv8 (4 box + 80 classes)

        # Parse YOLO output
        return self._postprocess(output, orig_w, orig_h, ratio, dw, dh)

    def _postprocess(
        self,
        output: np.ndarray,
        orig_w: int,
        orig_h: int,
        ratio: float,
        dw: float,
        dh: float
    ) -> List[Detection]:
        # Squeeze batch dim
        if output.ndim == 3:
            output = output[0]  # shape: [84, 8400] or [8400, 84]

        # Transpose if shape is [features, anchors] -> [anchors, features]
        if output.shape[0] < output.shape[1]:
            output = output.T  # shape [8400, 84]

        # Extract boxes and class scores
        # YOLOv8 format: columns 0-3 are cx, cy, w, h
        boxes_xywh = output[:, :4]
        scores = output[:, 4:]

        # Find best class per candidate anchor
        class_ids = np.argmax(scores, axis=1)
        confidences = np.max(scores, axis=1)

        # Filter by confidence threshold
        mask = confidences >= self.confidence_threshold
        if not np.any(mask):
            return []

        boxes_xywh = boxes_xywh[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        # Filter by target classes if requested
        if self.target_classes is not None:
            cls_mask = np.isin(class_ids, self.target_classes)
            if not np.any(cls_mask):
                return []
            boxes_xywh = boxes_xywh[cls_mask]
            confidences = confidences[cls_mask]
            class_ids = class_ids[cls_mask]

        # Convert [cx, cy, w, h] in letterboxed space to [x1, y1, x2, y2] in original image space
        cx = boxes_xywh[:, 0]
        cy = boxes_xywh[:, 1]
        w = boxes_xywh[:, 2]
        h = boxes_xywh[:, 3]

        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        # Invert letterbox padding & scaling
        x1 = (x1 - dw) / ratio
        y1 = (y1 - dh) / ratio
        x2 = (x2 - dw) / ratio
        y2 = (y2 - dh) / ratio

        # Clip to original image boundaries
        x1 = np.clip(x1, 0, orig_w)
        y1 = np.clip(y1, 0, orig_h)
        x2 = np.clip(x2, 0, orig_w)
        y2 = np.clip(y2, 0, orig_h)

        # OpenCV NMS
        boxes_for_nms = [[float(x1[i]), float(y1[i]), float(x2[i] - x1[i]), float(y2[i] - y1[i])] for i in range(len(x1))]
        indices = cv2.dnn.NMSBoxes(
            boxes_for_nms,
            confidences.tolist(),
            score_threshold=self.confidence_threshold,
            nms_threshold=self.iou_threshold
        )

        detections = []
        if len(indices) > 0:
            for idx in indices.flatten():
                cid = int(class_ids[idx])
                cname = self.class_names[cid] if cid < len(self.class_names) else f"class_{cid}"
                detections.append(
                    Detection(
                        box=(float(x1[idx]), float(y1[idx]), float(x2[idx]), float(y2[idx])),
                        confidence=float(confidences[idx]),
                        class_id=cid,
                        class_name=cname
                    )
                )

        return detections

    def get_device_info(self) -> dict:
        return {
            "model_path": self.model_path,
            "active_provider": self.active_provider,
            "available_providers": ort.get_available_providers(),
            "input_shape": self.input_shape,
            "input_size": self.input_size
        }
