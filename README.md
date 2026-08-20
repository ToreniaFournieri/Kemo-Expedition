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

The browser, desktop renderer, AFK workers, and Experimental AI API sorties share the same C++ battle kernel compiled to WebAssembly. The generated module is checked in, so normal `npm run build` does not require a native toolchain. After changing `native/battle_kernel.cpp`, install Emscripten and run `npm run battle:cxx`, then commit the refreshed `src/game/battleKernel.wasm` and `src/game/battleKernelBinary.ts` outputs.


- 記事 [冒ケモ オープンβテスト開始のお知らせ](https://note.com/fournieri/n/n0edb2cf72299?app_launch=false)
