#!/bin/bash
# usage: wall.sh TAG DEST STAGES ITERS   (env: N, BOSSDMG, WALL, ORDER...). Export, builder variants, pick best, refine.
set -e
cd "$(dirname "$0")"
TAG=$1; D=$2; ST=$3; IT=$4
if [ -z "$SAVE" ]; then SAVE=/tmp/bk/saves/$TAG.kemoz; node -e "import('./client.mjs').then(async m=>{const c=new m.Client();await c.exportSave('$SAVE')})"; fi
export SAVE
for V in ${VARIANTS:-none NOFIRE NOICE NOTHUNDER}; do
  ( if [ $V != none ]; then for X in ${V//+/ }; do export $X=1; done; fi; node twin/build.mjs $SAVE /tmp/bk/opt/${TAG}_b_$V.json > /dev/null; START=/tmp/bk/opt/${TAG}_b_$V.json NC=${NCB:-400} node twin/opt.mjs $SAVE $D $ST 0 1 /tmp/bk/opt/${TAG}_e_$V.json 2>&1 | tail -n 1 | sed "s/^/$V /" ) &
done
wait
BEST=$(for V in ${VARIANTS:-none NOFIRE NOICE NOTHUNDER}; do echo "$(python3 -c "import json;print(json.load(open('/tmp/bk/opt/${TAG}_e_$V.json'))['confirm']['best']['score'])") $V"; done | sort -g -r | head -1 | cut -d' ' -f2)
BASE=$(python3 -c "import json;print(json.load(open('/tmp/bk/opt/${TAG}_e_none.json'))['confirm']['base'])")
echo "base $BASE"; for V in ${VARIANTS:-none NOFIRE NOICE NOTHUNDER}; do echo "$V $(python3 -c "import json;print(json.load(open('/tmp/bk/opt/${TAG}_e_$V.json'))['confirm']['best'])")"; done
echo "best builder: $BEST"
cp /tmp/bk/opt/${TAG}_b_$BEST.json /tmp/bk/opt/${TAG}_builder.json
for s in 1 2; do START=/tmp/bk/opt/${TAG}_builder.json node twin/opt.mjs $SAVE $D $ST $IT $s /tmp/bk/opt/${TAG}_$s.json > /tmp/bk/opt/${TAG}_$s.log 2>&1 & done
for s in 3 4; do node twin/opt.mjs $SAVE $D $ST $IT $s /tmp/bk/opt/${TAG}_$s.json > /tmp/bk/opt/${TAG}_$s.log 2>&1 & done
wait
for s in 1 2 3 4; do echo "$s $(tail -n 1 /tmp/bk/opt/${TAG}_$s.log | sed 's/.*best //')"; done
echo SAVE=$SAVE
