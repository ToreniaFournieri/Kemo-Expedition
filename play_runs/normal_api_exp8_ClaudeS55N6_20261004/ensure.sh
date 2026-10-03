#!/bin/zsh
W=/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/c42ff58f-7553-43da-bc25-30945e5fb87e/scratchpad
EP=$(python3 -c "import json;print(json.load(open('$W/desc.json'))['endpoint'])"); TK=$(python3 -c "import json;print(json.load(open('$W/desc.json'))['token'])")
if curl -s -m 5 -H "Authorization: Bearer $TK" $EP/fundamental/status | grep -q systemStatus; then echo alive; exit 0; fi
pkill -9 -f "scratchpad/ud"; sleep 2
cd /Users/Torenia/Documents/ChatGPT/BoKemo; BOKEMO_PLAY_USERDATA=$W/ud BOKEMO_PLAY_DESCRIPTOR=$W/desc.json nohup ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/run-api-play-session.cjs --environment=prod > $W/electron_re.log 2>&1 &
sleep 14; echo restarted
