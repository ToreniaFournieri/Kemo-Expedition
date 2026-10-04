#!/bin/bash
# usage: cycle.sh TAG DEST STAGES ITERS [START]   (env passes N, BOSSDMG, ORDER, LAMBDA...)  exports a fresh save unless SAVE is set
set -e
cd "$(dirname "$0")"
TAG=$1; D=$2; ST=$3; IT=$4; START=$5
if [ -z "$SAVE" ]; then SAVE=/tmp/bk/saves/$TAG.kemoz; node -e "import('./client.mjs').then(async m=>{const c=new m.Client();await c.exportSave('$SAVE')})"; fi
for s in 1 2 3 4; do START=$START node twin/opt.mjs $SAVE $D $ST $IT $s /tmp/bk/opt/${TAG}_$s.json > /tmp/bk/opt/${TAG}_$s.log 2>&1 & done
wait
for s in 1 2 3 4; do echo "$s $(tail -n 1 /tmp/bk/opt/${TAG}_$s.log | sed 's/.*best //')"; done
echo SAVE=$SAVE
