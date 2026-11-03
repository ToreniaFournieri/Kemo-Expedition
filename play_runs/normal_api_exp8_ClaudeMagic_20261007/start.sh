#!/bin/bash
cd /Users/Torenia/Documents/ChatGPT/BoKemo
export BOKEMO_PLAY_USERDATA=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007/ud BOKEMO_PLAY_DESCRIPTOR=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007/desc.json
pkill -9 -f run-api-play-session 2>/dev/null; sleep 1
nohup ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/run-api-play-session.cjs --environment=prod > /Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007/electron.log 2>&1 &
for i in $(seq 1 60); do grep -q PLAY_SESSION_READY /Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007/electron.log 2>/dev/null && { echo ready; exit 0; }; sleep 1; done; echo notready; tail -20 /Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007/electron.log
