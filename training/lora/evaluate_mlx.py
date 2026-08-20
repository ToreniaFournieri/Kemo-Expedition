#!/usr/bin/env python3
"""Generate deterministic BoKemo test predictions with a base model or MLX adapter."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from huggingface_hub import snapshot_download
from mlx_lm import generate, load


ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter-path", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--max-tokens", type=int, default=512)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    lock = json.loads((ROOT / "training/lora/model.lock.json").read_text())
    records = [
        json.loads(line)
        for line in (ROOT / "data/bokemo_lora_training.jsonl").read_text().splitlines()
        if line.strip()
    ]
    records = [record for record in records if record["split"] == "test"]
    if args.limit is not None:
        records = records[: max(0, args.limit)]

    model_path = snapshot_download(repo_id=lock["model"], revision=lock["revision"])
    model, tokenizer = load(
        model_path,
        adapter_path=str(args.adapter_path) if args.adapter_path else None,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output:
        for record in records:
            prompt = tokenizer.apply_chat_template(
                record["messages"][:-1],
                add_generation_prompt=True,
                tokenize=False,
            )
            response = generate(
                model,
                tokenizer,
                prompt=prompt,
                max_tokens=args.max_tokens,
                verbose=False,
            )
            output.write(json.dumps({"id": record["id"], "response": response}, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
