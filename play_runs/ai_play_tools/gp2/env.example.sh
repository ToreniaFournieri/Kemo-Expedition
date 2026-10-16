# Copy to <run folder>/env.sh, edit, then: export GP2_ENV=<run folder>/env.sh
SP=/tmp/bk-run                     # Electron user data + descriptor (outside the repo)
export BOKEMO_PLAY_DIR=/path/to/play_runs/normal_api_exp8_<Name>_<date>   # logs, batch_calls.jsonl, ab_log.jsonl ...
export BOKEMO_PLAY_DESCRIPTOR=$SP/desc.json BOKEMO_PLAY_STATE=$SP/tstate.json BOKEMO_PLAY_USER=<Name>
# replan.py: ESKIP EMAX EBIG BIGMAX ABTB TBBIG AUTOTUNE DEADLINE   hl4.py: STALLX SMIN SMAX   boss4.py: READY SHMIN PG G PASSES BIGBELOW
export DEADLINE=${DEADLINE:-$(( $(date +%s) + 6*3600 ))}   # no big GA after 6 h real
