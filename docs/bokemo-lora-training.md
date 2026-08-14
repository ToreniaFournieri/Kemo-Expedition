# BoKemo Gameplay-Assistant LoRA

Source snapshot: BoKemo v0.9.3, build 7  
Locales: `ja`, `en`, `zh-CN`, `zh-TW`  
Target: `mlx-community/Qwen3-4B-Instruct-2507-4bit` at the revision pinned in `training/lora/model.lock.json`

This repository contains a deterministic supervised fine-tuning corpus for a non-thinking BoKemo gameplay assistant. It teaches authoritative mechanics, calculations, contextual strategy, and safe Experimental AI API request proposals. It does not contain model weights and never uploads data or adapters.

## Dataset layout

`data/bokemo_lora_training.jsonl` is the canonical `BokemoLoraRecordV2` corpus. Every line contains:

- `schema_version`, unique `id`, aligned `group_id`, `locale`, and assigned `split`;
- `category`, `strategy_type`, and `task_type`;
- OpenAI-style `messages` with localized system, user, and assistant turns;
- `source_refs`, authoritative `stable_ids`, and `related_ids`;
- optional migrated `legacy_ids`, safe engine fixture, and structured `expected_action`.

The corpus contains exactly 1,024 semantic families and four records per family:

| Category | Families | Records |
|-|-:|-:|
| Authoritative rules and master data | 360 | 1,440 |
| Deterministic calculations | 160 | 640 |
| Strategy and diagnosis | 280 | 1,120 |
| API action planning | 160 | 640 |
| Safety and abstention | 64 | 256 |
| **Total** | **1,024** | **4,096** |

Families, including all four translations, are assigned together: 820 train families (3,280 records), 102 validation families (408), and 102 test families (408). MLX-ready files in `data/lora/mlx/` contain only `messages`. The original 17-record seed is retained in `data/lora/seed_v1.jsonl`; every original ID has an explicit v2 migration.

## Authoring and regeneration

Run:

```sh
npm run lora:fixture
npm run lora:generate
npm run lora:validate
```

The fixture command decodes the checked-in sample save and writes only party ID/level/dungeon and character ID/race/class fields; inventory, bags, logs, global state, and other save internals are excluded. The generator reads that whitelist together with specifications, master-data and i18n sources, the API contract, and party computation source. Outputs are deterministic for seed `903007`. The validator fails on incorrect counts, duplicate IDs or localized prompts, missing sources/headings, unknown stable IDs, fixture hash mismatches, translation/split leakage, stale exports, oversized messages, malformed action output, revision or legal-constraint mismatches, or missing seed migrations.

Rules and strategy templates must be reviewed by a person before merging. Stable IDs and numeric data are authoritative; localized names are display metadata. Do not add model-generated facts or translations without checking the cited source. Strategy must identify assumptions and remain conditional when the target build, inventory, dungeon, threat, or failure mode is unknown.

Action-planning answers always end with exactly one line:

```text
ACTION_JSON: {"method":"POST","path":"/experimental/v1/command","body":{...}}
```

Use `ACTION_JSON: null` for forbidden, stale, unobservable, or unjustified requests. Only build preflight, strategic commands, and normal sortie requests are trainable. Future rolls, bag order, complete saves, debug operations, direct resource edits, direct healing, direct slot selection, and Diary mutation are forbidden.

## Apple Silicon training

The default profile uses QLoRA on the final 16 layers of Qwen3 4B, targeting `q_proj` and `v_proj` with rank 8, scale 20, dropout 0.05, batch size 1, gradient accumulation 8, 2,048-token sequences, gradient checkpointing, AdamW at `1e-5`, prompt masking, and two passes over the train split.

Create a dedicated Python environment on a 24–32 GB Apple Silicon Mac, then install the pinned dependency:

```sh
python3 -m venv .venv-lora
source .venv-lora/bin/activate
python3 -m pip install -r training/lora/requirements.txt
npm run lora:train:smoke
npm run lora:train
```

The wrapper downloads the exact locked model revision, runs MLX-LM, and stores a local reproducibility report beneath ignored `training/runs/`. Full training also evaluates the adapter and records its metrics. Adapters are written beneath ignored `adapters/`; weights, caches, fused models, predictions, and run reports must not be committed.

## Evaluation and adapter use

Generate base-model predictions for comparison:

```sh
python3 training/lora/evaluate_mlx.py \
  --output training/runs/base-predictions.jsonl

node scripts/lora/evaluate.mjs \
  data/bokemo_lora_training.jsonl \
  training/runs/base-predictions.jsonl
```

For an adapter, add `--adapter-path adapters/bokemo-qwen3-4b`. The deterministic evaluator reports action parse rate, exact request selection, forbidden-action count, and abstention rate. Release acceptance additionally requires reviewed authoritative-answer and locale reports:

- action JSON parse/schema validity: 100%;
- forbidden actions: 0;
- exact expected-action selection: at least 90%;
- authoritative fact rubric: at least 90%;
- correct abstention or clarification: at least 95%;
- correct response locale: at least 98%;
- improved macro score over the locked base model, with no category below 80%.

Load the resulting adapter with MLX-LM using the same locked base model. Do not fuse or publish it unless a separate release decision covers licensing, attribution, model-card documentation, and fresh evaluation.

## Versioning

`data/lora/manifest.json` records the BoKemo version/build, model lock, generation seed, counts, source hashes, split hashes, and canonical corpus hash. Any specification, master-data, localization, API-contract, generator, or template change requires regeneration, validation, a build-number increment, and a top-of-table English changelog entry.
