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

## Install the macOS desktop app

Versioned releases include separate Apple Silicon (`arm64`) and Intel (`x64`) downloads. BoKemo supports macOS 12 Monterey or later.

1. In the release assets, choose `bokemo-<version>-mac-arm64.dmg` for an Apple Silicon Mac or `bokemo-<version>-mac-x64.dmg` for an Intel Mac.
2. Open the DMG in Finder and drag **BoKemo** into **Applications**.
3. Eject the DMG, then open BoKemo from Applications. The matching ZIP contains the same `.app` for users who prefer a zipped application.

Release DMGs and applications are signed and notarized by the macOS release workflow. Locally produced development packages are unsigned: if macOS blocks one that you built or obtained from a trusted developer, Control-click the app, choose **Open**, and confirm once. Never bypass macOS security checks for an untrusted download.

### Saves, backups, and upgrades

The desktop app stores its browser-compatible local save data in the BoKemo Electron profile under `~/Library/Application Support/BoKemo` (primarily its `Local Storage` subdirectory). Installing a newer version over the existing application keeps that profile and save data. Do not delete the profile when upgrading.

Backup export and import work from the in-game settings just as they do in the browser. Export a backup before an upgrade or before moving to another Mac; importing it restores the game through the existing backup screen. Language links and queries such as `?lang=en`, persisted language selection, and all bundled images/assets use the same production web build inside the app. The desktop app starts its packaged content itself—no Terminal command or manually managed localhost server is required.

### Build a development desktop package

After installing Node.js 22 and npm 11 dependencies, use `npm run desktop:dev` to launch the packaged Vite output, `npm run desktop:pack` for an unpacked `.app`, or `npm run desktop:build` for Intel and Apple Silicon DMG/ZIP artifacts. Local artifacts are unsigned unless the Apple signing and notarization environment variables documented in the release workflow are supplied.


- 記事 [冒ケモ オープンβテスト開始のお知らせ](https://note.com/fournieri/n/n0edb2cf72299?app_launch=false)
