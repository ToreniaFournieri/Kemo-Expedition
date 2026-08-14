#!/usr/bin/env python3
"""Run local MLX QLoRA and record a reproducibility manifest without uploading artifacts."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from huggingface_hub import snapshot_download


ROOT = Path(__file__).resolve().parents[2]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()
    config_name = "qwen3_4b_qlora_smoke.yaml" if args.smoke else "qwen3_4b_qlora.yaml"
    config = ROOT / "training/lora" / config_name
    dataset_manifest = json.loads((ROOT / "data/lora/manifest.json").read_text())
    model_lock = json.loads((ROOT / "training/lora/model.lock.json").read_text())
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = ROOT / "training/runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    manifest = {
        "run_id": run_id,
        "status": "started",
        "smoke": args.smoke,
        "model": model_lock,
        "dataset_corpus_sha256": dataset_manifest["corpus_sha256"],
        "dataset_split_hashes": dataset_manifest["split_hashes"],
        "config": str(config.relative_to(ROOT)),
        "config_sha256": digest(config),
        "mlx_lm_version": importlib.metadata.version("mlx-lm"),
        "python": platform.python_version(),
        "platform": platform.platform(),
    }
    model_path = snapshot_download(repo_id=model_lock["model"], revision=model_lock["revision"])
    runtime_config = run_dir / "runtime_config.yaml"
    runtime_config.write_text(
        config.read_text().replace(
            f'model: {model_lock["model"]}\n',
            f'model: {json.dumps(model_path)}\n',
            1,
        )
    )
    manifest["resolved_model_path"] = model_path
    manifest_path = run_dir / "run_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    try:
        subprocess.run(["mlx_lm.lora", "--config", str(runtime_config)], cwd=ROOT, check=True)
        if not args.smoke:
            predictions = run_dir / "predictions.jsonl"
            subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "training/lora/evaluate_mlx.py"),
                    "--adapter-path",
                    str(ROOT / "adapters/bokemo-qwen3-4b"),
                    "--output",
                    str(predictions),
                ],
                cwd=ROOT,
                check=True,
            )
            evaluation = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts/lora/evaluate.mjs"),
                    str(ROOT / "data/bokemo_lora_training.jsonl"),
                    str(predictions),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            manifest["metrics"] = json.loads(evaluation.stdout)
    except BaseException as error:
        manifest["status"] = "failed"
        manifest["error"] = type(error).__name__
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        raise
    manifest["status"] = "complete"
    manifest["completed_at"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(manifest_path)


if __name__ == "__main__":
    main()
