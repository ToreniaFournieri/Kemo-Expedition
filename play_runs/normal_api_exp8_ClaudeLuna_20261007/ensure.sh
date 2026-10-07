#!/bin/zsh
# restart the play Electron if the API does not answer within 5s (renderer vanishes after long idle)
W=/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/4e98a144-d60e-4da9-b54a-ff4c44bc73e6/scratchpad
EP=$(python3 -c "import json;print(json.load(open('$W/desc.json'))['endpoint'])"); TK=$(python3 -c "import json;print(json.load(open('$W/desc.json'))['token'])")
if curl -s -m 5 -H "Authorization: Bearer $TK" $EP/fundamental/status | grep -q systemStatus; then echo alive; exit 0; fi
pkill -9 -f "run-api-play-session" ; pkill -9 -f "scratchpad/app/node_modules/electron" ; sleep 2
cd $W/app; BOKEMO_PLAY_USERDATA=$W/ud BOKEMO_PLAY_DESCRIPTOR=$W/desc.json nohup ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/run-api-play-session.cjs --environment=prod > $W/electron_re.log 2>&1 &
sleep 14; echo restarted
