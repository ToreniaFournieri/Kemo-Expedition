#!/bin/bash
# boss.sh [effort=medium] [tuneCids=4,2,3,5]: bossDamage GA (+tuning when under SKIP), then boss-only and route meters
cd "$(dirname "$0")"; source ./env.sh
python3 bs.py 300 bossDamage
./wall.sh bossDamage ${1:-medium} ${2:-4,2,3,5} bossDamage 2>&1 | tail -${TL:-14}
python3 bs.py 300 bossDamage; python3 bs.py 300 success
