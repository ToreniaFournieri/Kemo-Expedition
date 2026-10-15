#!/bin/bash
# wait.sh file : block until the full.sh run ends (boss killed / not ready / stop) -- prints tail
f=$1
until grep -qE "BOSS KILLED|NOTREADY|CLEAR seen" $f || ( grep -q "^calls .* sortieRuns" $f && ! grep -q "BOSS OPEN" $f ); do sleep 5; done
tail -${2:-8} $f | cut -c1-250
