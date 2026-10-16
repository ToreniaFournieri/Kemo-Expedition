#!/bin/bash
# run.sh D1 D2 ... : chain each destination in order; stops at the first chain that does not finish
cd "$(dirname "$0")"; source "${GP2_ENV:?set GP2_ENV}"
for D in "$@"; do ./chain.sh $D || break; echo "$(date +%H:%M) D$D done calls $(python3 t.py N)" >> $BOKEMO_PLAY_DIR/notes.md; done
