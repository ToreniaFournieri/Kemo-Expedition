#!/bin/bash
# usage: rebuild.sh TAG DEST STAGES  -> export, builder variants (vitality/element), eval NC=600 each, print table
cd "$(dirname "$0")"; TAG=$1; D=$2; ST=$3
S=/tmp/bk/saves/$TAG.kemoz; node -e "import('./client.mjs').then(async m=>{const c=new m.Client();await c.exportSave('$S')})"
V9="1:7403,1:7403,1:7403,1:7403,1:7403,1:5401,1:5401,1:5401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401"
V5="1:7403,1:7403,1:7403,1:7403,1:7403,1:5401,1:5401,1:5401,6:1401,6:1401,6:1401,6:1401,6:1401"
for v in "cur|" "v9|$V9" "v5|$V5" "v0|"; do ( n=${v%%|*}; F=${v#*|};
  if [ $n = cur ]; then NC=600 node twin/opt.mjs $S $D $ST 0 1 /tmp/bk/opt/${TAG}_e_$n.json >/dev/null 2>&1; python3 -c "import json;d=json.load(open('/tmp/bk/opt/${TAG}_e_$n.json'));print('cur',d['confirm']['base'])"; exit; fi
  FORCE="$F" TW="${TW:-0.5,0.4,4}" node twin/build.mjs $S /tmp/bk/opt/${TAG}_b_$n.json >/dev/null 2>&1; START=/tmp/bk/opt/${TAG}_b_$n.json NC=600 node twin/opt.mjs $S $D $ST 0 1 /tmp/bk/opt/${TAG}_e_$n.json >/dev/null 2>&1; python3 -c "import json;d=json.load(open('/tmp/bk/opt/${TAG}_e_$n.json'));print('$n',d['confirm']['best'])" ) & done; wait
echo SAVE=$S
