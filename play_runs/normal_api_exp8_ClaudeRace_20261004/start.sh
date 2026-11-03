#!/bin/bash
# Start the headless API play Electron (Linux, Xvfb). Usage: start.sh <scratch dir>
S=$1; cd /home/user/Kemo-Expedition
pkill -9 -f "electron --no-sandbox scripts/run-api-pla[y]" 2>/dev/null; sleep 1
BOKEMO_PLAY_USERDATA=$S/ud BOKEMO_PLAY_DESCRIPTOR=$S/desc.json nohup xvfb-run -a ./node_modules/electron/dist/electron --no-sandbox scripts/run-api-play-session.cjs --environment=prod > $S/electron.log 2>&1 &
for i in $(seq 1 40); do grep -q PLAY_SESSION_READY $S/electron.log 2>/dev/null && { echo ready; exit 0; }; sleep 1; done; echo notready; tail -20 $S/electron.log
