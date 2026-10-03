// Smooth wall objective via sorties: progress through target rooms + damage fraction on the blocking room.
import {T,seedCrypto} from './lib.mjs';
import {GATE_K} from './stages.mjs';
export function targetRooms(f){ return f<=5?4*(f-1)+3: f===6?23:24; }
export function wallObjective({d,f,N=40,seed=3,pi=0,wDmg=1,wBoss=0}){
  const Tn=targetRooms(f);
  return async(state)=>{
    const p=state.parties[pi]; const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    p.selectedDungeonId=d; p.clearGateStatus={...saved.g};
    for(let g=1;g<Math.min(f,7);g++) p.clearGateStatus[d*1000+g*10+4]=true;
    if(f===7) p.clearGateStatus[d*1000+604]=true;
    p.expeditionDepthLimit= f<=5?`${f}f-3`: f===6?'beforeBoss':'all';
    seedCrypto(seed);
    let bseq=0n; let v=(seed>>>0)||0x9e3779b9; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;};
    const out=T.withBattleSeedSourceForTesting(()=>(BigInt(seed)<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateApiSortieBatchForTesting(state,pi,N,'mode.normal',1790000000000,0)));
    let sc=0, succ=0;
    for(const run of out.runs){
      const lg=run.log; const bd=T.buildBattleLogData(lg,1,'x').battleLog; const rooms=bd.rooms;
      let won=0; for(const r of rooms) if(r.outcome==='victory') won++;
      const last=rooms[rooms.length-1];
      let part=0; if(last&&last.outcome!=='victory') part=Math.min(1,(last.damageDealt||0)/Math.max(1,last.enemyMaximumHp));
      const ok=(f<=6)?(bd.finalOutcome==='Return'||bd.finalOutcome==='Clear'):bd.finalOutcome==='Clear';
      const tot=Math.min(Tn, won+wDmg*part)/Tn;
      sc+=tot+(ok?1:0); if(ok) succ++;
      if(wBoss>0){ const br=rooms.find(r=>r.roomType==='battle_Boss'); if(br){ sc+= wBoss*(br.outcome==='victory'?1:Math.min(1,(br.damageDealt||0)/Math.max(1,br.enemyMaximumHp))); } }
    }
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    wallObjective.last={succ:succ/N};
    return sc/N;
  };
}
