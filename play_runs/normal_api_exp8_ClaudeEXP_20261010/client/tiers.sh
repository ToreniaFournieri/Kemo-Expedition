#!/bin/bash
# tiers.sh save : inventory count per tier + PT1 level
node -e "
import('/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin/lib.mjs').then(({T})=>{const s=T.loadSave('$1'); const c={}; for(const v of Object.values(s.global.inventory)){ if(v.status!=='owned')continue; const t=Math.floor(v.item.id/1000); c[t]=(c[t]||0)+v.count;} const p=s.parties[0]; console.log(JSON.stringify(c),'lv',p.level,'hp',T.computePartyStats(p).partyStats.hp,'deity',p.deity.name,'parties',s.parties.map(q=>q.deity.name).join('/'));})"
