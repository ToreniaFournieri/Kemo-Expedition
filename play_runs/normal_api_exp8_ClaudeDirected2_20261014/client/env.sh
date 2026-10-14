# source this: run-folder env for the ClaudeDir2 client (tokens/descriptor stay outside the repo, in the scratchpad)
SP=/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/5790975b-930f-4f3b-90ad-a297d2c57f73/scratchpad/bk2
export BOKEMO_PLAY_DIR=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeDirected2_20261014
export BOKEMO_PLAY_DESCRIPTOR=$SP/desc.json BOKEMO_PLAY_STATE=$SP/tstate.json BOKEMO_PLAY_USER=ClaudeDir2
export DIRS=free DEFF=high DCOMP=uniqueCharacter,raceGender,mainClass,subClass,lineage,predisposition DDEI=2 TB=${TB:-100} GATH=${GATH:-85} TBB=${TBB:-180}
export TUNE=4,2,3,5,1,6
