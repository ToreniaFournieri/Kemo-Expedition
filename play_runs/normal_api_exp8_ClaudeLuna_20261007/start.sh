#!/bin/bash
cd /home/user/Kemo-Expedition
export BOKEMO_PLAY_USERDATA=/home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007/ud BOKEMO_PLAY_DESCRIPTOR=/home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007/desc.json
pkill -9 -f run-api-play-session 2>/dev/null; sleep 1
nohup xvfb-run -a ./node_modules/electron/dist/electron --no-sandbox --disable-gpu scripts/run-api-play-session.cjs --environment=prod > /home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007/electron.log 2>&1 &
for i in $(seq 1 60); do grep -q PLAY_SESSION_READY /home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007/electron.log 2>/dev/null && { echo ready; exit 0; }; sleep 1; done; echo notready; tail -20 /home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007/electron.log
