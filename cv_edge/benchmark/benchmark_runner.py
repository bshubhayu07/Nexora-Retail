import os
import time
import json
import csv
import psutil
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import onnxruntime as ort

logger = logging.getLogger("benchmark_runner")


class EdgeBenchmarkRunner:
    """Automated benchmark utility measuring real on-device latency, FPS, memory, and quantization."""

    def __init__(self, warmup_runs: int = 5, benchmark_runs: int = 30):
        self.warmup_runs = warmup_runs
        self.benchmark_runs = benchmark_runs
        self.process = psutil.Process(os.getpid())

    def benchmark_onnx_model(
        self,
        model_path: str,
        input_shape: tuple = (1, 3, 640, 640),
        provider: str = "CPUExecutionProvider",
        model_tag: str = "Model"
    ) -> Dict[str, Any]:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        model_size_mb = os.path.getsize(model_path) / (1024 * 1024)
        session = ort.InferenceSession(model_path, providers=[provider])
        active_provider = session.get_providers()[0]
        input_name = session.get_inputs()[0].name

        # Create dummy input tensor
        dummy_data = np.random.randn(*input_shape).astype(np.float32)

        # 1. Warmup Runs
        for _ in range(self.warmup_runs):
            _ = session.run(None, {input_name: dummy_data})

        # 2. Benchmark Runs
        latencies: List[float] = []
        start_time_all = time.time()

        for _ in range(self.benchmark_runs):
            t0 = time.perf_counter()
            _ = session.run(None, {input_name: dummy_data})
            t1 = time.perf_counter()
            latencies.append((t1 - t0) * 1000.0)  # ms

        total_time = time.time() - start_time_all
        fps = float(self.benchmark_runs / total_time) if total_time > 0 else 0.0

        mem_info = self.process.memory_info()
        ram_mb = mem_info.rss / (1024 * 1024)

        avg_lat = float(np.mean(latencies))
        p50_lat = float(np.percentile(latencies, 50))
        p95_lat = float(np.percentile(latencies, 95))

        return {
            "model_tag": model_tag,
            "model_name": os.path.basename(model_path),
            "model_path": model_path,
            "model_size_mb": round(model_size_mb, 2),
            "execution_provider": active_provider,
            "input_resolution": f"{input_shape[2]}x{input_shape[3]}",
            "frames_processed": self.benchmark_runs,
            "average_latency_ms": round(avg_lat, 2),
            "p50_latency_ms": round(p50_lat, 2),
            "p95_latency_ms": round(p95_lat, 2),
            "throughput_fps": round(fps, 1),
            "memory_usage_mb": round(ram_mb, 1)
        }

    def run_comprehensive_benchmark(self, models_dir: str = "models", out_dir: str = "results") -> List[Dict[str, Any]]:
        os.makedirs(out_dir, exist_ok=True)
        results: List[Dict[str, Any]] = []

        models_to_test = [
            ("models/shopper/yolov8n.onnx", (1, 3, 640, 640), "Shopper Detector (FP32)"),
            ("models/shopper/yolov8n_int8.onnx", (1, 3, 640, 640), "Shopper Detector (INT8 Dynamic)"),
            ("models/shelf/shelf_detector.onnx", (1, 3, 224, 224), "Shelf Classifier (FP32)"),
            ("models/shelf/shelf_detector_int8.onnx", (1, 3, 224, 224), "Shelf Classifier (INT8 Dynamic)")
        ]

        print("\n" + "=" * 65)
        print("          NEXORA EDGE AI HARDWARE BENCHMARK")
        print("=" * 65)
        print(f"Device: {os.environ.get('COMPUTERNAME', 'Windows Laptop')} | CPU Cores: {os.cpu_count()}")
        print(f"Warmup: {self.warmup_runs} frames | Benchmark: {self.benchmark_runs} frames\n")

        for path, shape, tag in models_to_test:
            if os.path.exists(path):
                print(f"Benchmarking: {tag} ({os.path.basename(path)})...")
                res = self.benchmark_onnx_model(path, input_shape=shape, model_tag=tag)
                results.append(res)
                print(
                    f" -> Size: {res['model_size_mb']} MB | Latency: {res['average_latency_ms']} ms "
                    f"(P95: {res['p95_latency_ms']} ms) | FPS: {res['throughput_fps']} | RAM: {res['memory_usage_mb']} MB"
                )

        # Save JSON
        json_path = os.path.join(out_dir, "benchmark_results.json")
        with open(json_path, "w") as f:
            json.dump(results, f, indent=2)

        # Save CSV
        csv_path = os.path.join(out_dir, "benchmark_results.csv")
        if results:
            keys = list(results[0].keys())
            with open(csv_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(results)

        print("\n" + "=" * 65)
        print(f"Results saved to:\n  - {json_path}\n  - {csv_path}")
        print("=" * 65 + "\n")

        return results
