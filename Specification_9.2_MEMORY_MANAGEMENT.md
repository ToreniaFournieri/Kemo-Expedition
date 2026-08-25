# 9.2 MEMORY MANAGEMENT AND MONITORING

## 9.2.1 Objective and core principle

- Runtime memory must remain bounded and stable during continuous online play, accelerated processing, simulations, and AFK emulation.
- Memory management follows **Prevent → Release → Measure**:
  1. Prevent unnecessary allocation and retention.
  2. Release resources when their useful runtime lifecycle ends.
  3. Measure behavior through runtime monitoring and repeatable benchmarks.
- Runtime memory is working memory, not persistent storage. Persistent saves and deterministic gameplay must not be changed by diagnostics.
- Temporary peaks caused by caches, garbage collection, JIT compilation, WebAssembly, or graphics resources are acceptable when the settled footprint reaches a stable bounded range.

## 9.2.2 Lifecycle and leak prevention

- Online progression, x100, AFK emulation, simulations, workers, completed Cycles and Chunks, battle calculations, temporary logs, and obsolete state copies must not cause continuous settled-memory growth.
- JavaScript and TypeScript must release application-held references when work completes so unused data is eligible for garbage collection.
- C++ and WebAssembly allocations require explicit bounded ownership and must not depend on JavaScript garbage collection for native cleanup.
- Completed worker operations must release their request and result data and terminate workers that are no longer needed.
- Simulation and AFK processing must retain aggregate results or compact deltas rather than complete intermediate histories unless a history is explicitly required by another specification.
- Reusable buffers are permitted when their bounds are explicit and reuse preserves deterministic behavior.

## 9.2.3 Runtime retention and transfer

- Runtime data may be retained only while it is active, likely to be reused soon, or small enough to provide a meaningful measured benefit.
- Avoid duplicate full representations of game state and unnecessary large-object copying.
- Worker and subsystem boundaries should transfer compact results or state deltas where practical.
- Large temporary datasets should be processed incrementally. Completed battle, Cycle, Chunk, AFK, and simulation intermediates must become unreachable promptly.
- Optimization must not compromise game-state correctness, save compatibility, environment isolation, or deterministic outcomes.

## 9.2.4 Artwork lifecycle

- Artwork follows: persistent browser/local cache → load/decode → active pane → release application-held runtime reference when the pane no longer requires it.
- Artwork is loaded when first required. The browser or packaged local-resource cache remains responsible for persistent reuse.
- Only artwork displayed by active panes and a bounded set of immediately likely next assets may be intentionally retained in runtime memory.
- Image probes, preload handlers, component references, and temporary object URLs must be released after completion, failure, dependency change, or unmount.
- Returning to artwork should use persistent cache where available and must not create an unbounded application-managed decoded-image cache.
- The browser/runtime controls the final reclamation time of decoded image and GPU resources.

## 9.2.5 Runtime monitoring and logging

- Monitoring periodically collects every technically available source among JavaScript heap, C++/WebAssembly bytes, visible-artwork estimate, worker-owned estimate, active worker count, and total process memory.
- Unsupported sources must be represented as unavailable; they must not be estimated as zero or fabricated.
- Current and peak values are required. Monitoring must have negligible, bounded overhead.
- Normal sampling occurs every 15 seconds. x100 and unlimited modes sample every 60 seconds. Significant lifecycle boundaries may take additional samples.
- Periodic history is limited to 120 snapshots and significant-event history to 256 entries per session.
- Significant events are `session_start`, `online_processing_start`, `chunk_complete`, `afk_emulation_start`, `afk_emulation_complete`, `simulation_start`, `simulation_complete`, `wasm_memory_growth`, `memory_warning`, and `session_end`.
- Events include timestamp, runtime mode, speed, elapsed time, available memory fields, active workers, completed Chunks, and battle count.
- Three consecutive samples at or above 85% of an exposed JavaScript heap limit produce one debounced warning. The warning rearms only after usage falls below 75%.
- Diagnostics are session-scoped, excluded from saves, and bounded. Dev and beta expose current/peak data together with the metadata-only AFK runtime trace defined in section 5.1.1.1 through one combined Runtime Diagnostics JSON export and reset in the Debug pane. Production retains internal memory monitoring and warnings without a diagnostics UI or retained AFK trace events.

## 9.2.6 Repeatable benchmarks

The standard benchmark suite contains:

| Benchmark | Purpose |
|-|-|
| Idle 30 minutes | Detect background leaks |
| Normal play 1 hour | Establish normal runtime behavior |
| x100 30 minutes | Stress high-allocation processing |
| AFK 24-hour emulation | Verify AFK cleanup and stability |
| Repeated 100-run simulations | Verify simulation cleanup |
| Repeated pane switching | Verify artwork lifecycle and cache behavior |

- Each workload records initial, peak, completion, settled memory after a cleanup opportunity, and growth from the settled baseline for every available metric.
- Equivalent workloads run at least three times after warm-up. Continuous settled-baseline growth must be investigated even if each individual run completes.
- The default automated gate fails only when settled growth exceeds both 32 MiB and 20%. Tools may accept explicit platform-specific overrides, which must appear in their report.
- A short smoke profile is suitable for continuous integration; the complete standard profile is required for release or material memory-regression evaluation when appropriate.
- Material changes to battle, AFK, workers, simulation, C++/WebAssembly, artwork, state management, or caching must be evaluated for memory impact when appropriate.
- Optimization claims require before/after measurement rather than implementation assumptions.

## 9.2.7 Acceptance criteria

- Continuous operation and repeated equivalent workloads reach a stable bounded range rather than continuously increasing.
- AFK, simulation, battle, Cycle, Chunk, worker, and artwork intermediates release obsolete application-held references.
- Repeated artwork navigation does not create unbounded application-managed memory.
- WebAssembly memory and reusable arenas remain bounded for equivalent workloads.
- x100 completes the stress benchmark without memory-related crashes.
- Monitoring and logging remain bounded and do not materially increase CPU or memory consumption.
- Temporary peaks are acceptable when memory subsequently returns to an appropriate settled range.
