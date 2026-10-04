#!/bin/bash
# usage: clsweep.sh SAVE DEST STAGES "name|CLASS" ...  (4 at a time)
cd "$(dirname "$0")"; S=$1; D=$2; ST=$3; shift 3
V9="1:7403,1:7403,1:7403,1:7403,1:7403,1:5401,1:5401,1:5401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401,6:1401"
run(){ n=${1%%|*}; C=${1#*|}; CLASS="$C" FORCE="${FORCEV-$V9}" TW="0.5,0.4,4" node twin/build.mjs $S /tmp/bk/opt/cs_$n.json >/dev/null 2>&1; START=/tmp/bk/opt/cs_$n.json NC=${NC:-600} node twin/opt.mjs $S $D $ST 0 1 /tmp/bk/opt/cs_e_$n.json >/dev/null 2>&1; python3 -c "import json;d=json.load(open('/tmp/bk/opt/cs_e_$n.json'));b=d['confirm']['best'];print('$n',b['ps'],round(b['runs']),b['calls'])"; }
i=0; for v in "$@"; do run "$v" & i=$((i+1)); if [ $((i%4)) = 0 ]; then wait; fi; done; wait
