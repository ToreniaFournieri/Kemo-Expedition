# 冒ケモ - (BoKemo/冒兽/冒獸)

- BoKemo — A Beastfolk Expedition RPG
The name BoKemo comes from the Japanese words bōken, meaning “adventure,” and kemono, meaning “beast” or “beastfolk.”

- オープンβテスト期間中となります。

- [冒ケモ (日本語)](https://toreniafournieri.github.io/Kemo-Expedition/?lang=ja)
- [BoKemo (English)](https://toreniafournieri.github.io/Kemo-Expedition/?lang=en)
- [冒兽 (中文)](https://toreniafournieri.github.io/Kemo-Expedition/?lang=zh)

## Play the game

The links above are the hosted GitHub Pages version and can be played directly in a browser. Each versioned [GitHub Release](https://github.com/toreniafournieri/Kemo-Expedition/releases) also provides a `bokemo-<version>-browser.zip` download for local play.

The ZIP is a complete portable browser build, including the images and generated JavaScript/CSS assets. Extract the entire archive, then follow its `LOCAL_PLAY.md` instructions to serve the extracted directory over HTTP; do not open `index.html` directly.

## macOS desktop build

The macOS package includes an Electron menu-bar Party Progress pane. Left-click the BoKemo menu-bar icon to view live read-only progress for every unlocked party; right-click it for application controls. Run `npm run desktop:pack` for a local unpacked application or `npm run desktop:build` for distributable DMG and ZIP artifacts.

## C++ battle kernel

The browser, desktop renderer, AFK workers, and Experimental AI API sorties share the same C++ battle kernel compiled to WebAssembly. The generated module is checked in, so normal `npm run build` does not require a native toolchain. Stable wire IDs live in `native/battle_protocol.def`; entries are append-only and explicitly numbered. Run `npm run battle:protocol` after changing the protocol registry, or `npm run battle:protocol:check` to verify generated TypeScript/C++ definitions. After changing C++ kernel or protocol code, install Emscripten and run `npm run battle:cxx`, then commit the refreshed generated definitions, `src/game/battleKernel.wasm`, and `src/game/battleKernelBinary.ts` outputs.

The built-in mechanic extension boundary is documented in [`docs/mechanic-extensibility-architecture.md`](docs/mechanic-extensibility-architecture.md). Kernel-native combat behavior remains in C++/WebAssembly; expedition-domain behavior may be extracted into deterministic TypeScript domain functions. Run `npm run mechanics:inventory` to refresh the generated [`docs/mechanic-inventory.md`](docs/mechanic-inventory.md) catalogue.


- 記事 [冒ケモ オープンβテスト開始のお知らせ](https://note.com/fournieri/n/n0edb2cf72299?app_launch=false)

### API-only AI Play evaluation

Create a fresh isolated Desktop Orca evaluation (does not reuse the ordinary Orca save):

```sh
npm run desktop:orca -- --ai-play=MyConcept
```

The connection panel displays the localhost URL, bearer token and evaluation UUID. Acquire control with `POST /experimental/v1/control/acquire`, then include both `Authorization: Bearer <token>` and `X-BoKemo-Control-Lease: <lease-token>` on gameplay calls. The profile stays paused during connection setup and lease gaps. Resume the same evaluation on the same version/build with:

```sh
npm run desktop:orca -- --resume-ai-play=<EvaluationUUID>
```

Read `/observation`, use `/build-options` or `/party-preview` to validate a configuration, apply it with the `configure_party` command, forecast with `/simulation` (1,000 trials), and advance actual play with `/sortie` (1–100 Cycles). Supply `revision` on previews/forecasts and `expectedRevision` on mutations. An optional `Idempotency-Key` header protects mutations against duplicate execution after a lost response. Replays still cost a counted call during an active evaluation. `/control/renew` keeps the lease alive without counting a call.

The objective is the first normal Expedition 1 boss victory within 200 counted calls. Score is `10 × calls + actual sorties`, plus `100,000` for failure. An accepted batch always completes its full requested count. No Gods Battles, debug tools, direct save inspection or internal runtime calls are allowed for play. Repository reading is permitted. See [the regulation](Specification_12.1_AI_PLAY_REGURATION.md) and [endpoint contracts](Specification_9.1.3_API_ENDPOINTS.md).

`GET /evaluation` requires bearer authentication but no lease and remains readable after termination. Reports are written to `AI_play_report/` in a source checkout, or `Documents/BoKemo/AI_play_report/` in packaged releases. Credentials are never included in reports.
