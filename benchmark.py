import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from cv_edge.benchmark.benchmark_runner import EdgeBenchmarkRunner


def main():
    runner = EdgeBenchmarkRunner(warmup_runs=5, benchmark_runs=25)
    runner.run_comprehensive_benchmark()


if __name__ == "__main__":
    main()
