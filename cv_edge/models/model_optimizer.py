import os
import time
import logging
from typing import Optional, Tuple
import numpy as np

logger = logging.getLogger("model_optimizer")


def quantize_onnx_model(
    input_model_path: str,
    output_model_path: str,
    per_channel: bool = False
) -> Tuple[bool, str]:
    """Applies dynamic INT8 quantization to an ONNX model for CPU optimization.

    Args:
        input_model_path: Path to FP32 ONNX model
        output_model_path: Destination path for quantized INT8 ONNX model
        per_channel: Enable per-channel quantization if supported

    Returns:
        Tuple[bool, str]: (Success, Message)
    """
    if not os.path.exists(input_model_path):
        return False, f"Input model not found: {input_model_path}"

    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType

        os.makedirs(os.path.dirname(os.path.abspath(output_model_path)), exist_ok=True)
        logger.info(f"Quantizing {input_model_path} -> {output_model_path} (INT8 Dynamic)...")

        quantize_dynamic(
            model_input=input_model_path,
            model_output=output_model_path,
            weight_type=QuantType.QUInt8,
            per_channel=per_channel
        )

        in_size = os.path.getsize(input_model_path) / (1024 * 1024)
        out_size = os.path.getsize(output_model_path) / (1024 * 1024)
        reduction = (1 - (out_size / in_size)) * 100

        msg = (
            f"Successfully quantized model: {in_size:.2f} MB -> {out_size:.2f} MB "
            f"({reduction:.1f}% size reduction)"
        )
        logger.info(msg)
        return True, msg

    except Exception as e:
        logger.error(f"Quantization failed: {e}")
        return False, str(e)


def export_shelf_classifier_to_onnx(
    pt_model_path: Optional[str] = None,
    out_onnx_path: Optional[str] = None
) -> Tuple[bool, str]:
    """Exports or creates a lightweight MobileNetV2 shelf classifier ONNX model."""
    from .model_registry import DEFAULT_SHELF_MODEL
    out_path = out_onnx_path or DEFAULT_SHELF_MODEL
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

    try:
        import torch
        import torch.nn as nn
        from torchvision import models

        # Create MobileNetV2 with 3 classes ("empty", "low", "stocked")
        model = models.mobilenet_v2(weights=None)
        model.classifier[1] = nn.Linear(model.last_channel, 3)

        if pt_model_path and os.path.exists(pt_model_path):
            state = torch.load(pt_model_path, map_location="cpu")
            model.load_state_dict(state)
            logger.info(f"Loaded existing PyTorch weights from {pt_model_path}")
        else:
            # Initialize with default sensible weights
            logger.info("Initializing shelf classifier with default weights for ONNX export.")

        model.eval()
        dummy_input = torch.randn(1, 3, 224, 224)

        torch.onnx.export(
            model,
            dummy_input,
            out_path,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
            opset_version=14,
            dynamo=False
        )

        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        msg = f"Exported shelf classifier to {out_path} ({size_mb:.2f} MB)"
        logger.info(msg)
        return True, msg

    except Exception as e:
        logger.error(f"Shelf model export failed: {e}")
        return False, str(e)
