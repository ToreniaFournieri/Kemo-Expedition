// Boss-only fast objective: temporarily replace dungeon d's floors by a single floor holding only the boss room.
import {T,sim,summarize} from './lib.mjs';
export function bossOnlyObjective({d,N=100,seed=3,pi=0,wReach=1.0,reachN=120,reachSeed=7,floor=0.003}){
  const dun=T.DUNGEONS.find(x=>x.id===d); const orig=dun.floors; const f6=orig.find(f=>f.floorNumber===6);
  const bossFloor={...f6,rooms:[f6.rooms[3]]};
  return async(state)=>{
    const p=state.parties[pi]; const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    p.selectedDungeonId=d; p.clearGateStatus={...saved.g}; for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true; p.expeditionDepthLimit='all';
    // 1) boss-only fights from full HP: smooth damage fraction + kill rate
    dun.floors=[bossFloor]; let dmg=0,kills=0;
    try{
      let v=(seed>>>0)||1; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
      T.withBattleSeedSourceForTesting(()=>(BigInt(seed)<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.simulateApiSortieBatchForTesting(state,pi,1,'mode.normal',1790000000000+i,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const br=bd.rooms[bd.rooms.length-1]; if(br){ if(br.outcome==='victory'){kills++;dmg+=1;} else dmg+=Math.min(1,br.damageDealt/Math.max(1,br.enemyMaximumHp)); } } }));
    } finally { dun.floors=orig; }
    // 2) reach rate of the boss room in the full dungeon
    const raw=await sim(state,pi,reachN,reachSeed); const boss=raw.rooms[23]; const reach=boss.reached/raw.total;
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    bossOnlyObjective.last={dmg:dmg/N,kills:kills/N,reach};
    return 4*(dmg/N)+Math.log(Math.max(kills/N,floor))*0.5+wReach*Math.log(Math.max(reach,0.01));
  };
}

// Fight a single room (floor F, room R) alone from full HP: smooth damage fraction + kill rate. `survive` adds party HP left on kills.
export function roomOnlyObjective({d,floorNo,roomNo,N=80,seed=3,pi=0}){
  const dun=T.DUNGEONS.find(x=>x.id===d); const orig=dun.floors; const fl=orig.find(f=>f.floorNumber===floorNo);
  const one={...fl,floorNumber:floorNo,rooms:[fl.rooms[roomNo-1]]};
  return async(state)=>{
    const p=state.parties[pi]; const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    p.selectedDungeonId=d; p.clearGateStatus={...saved.g}; for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true; p.expeditionDepthLimit='all';
    dun.floors=[one]; let dmg=0,kills=0,hpLeft=0;
    try{ let v=(seed>>>0)||1; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
      T.withBattleSeedSourceForTesting(()=>(BigInt(seed)<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.simulateApiSortieBatchForTesting(state,pi,1,'mode.normal',1790000000000+i,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const r=bd.rooms[bd.rooms.length-1]; if(r){ if(r.outcome==='victory'){kills++;dmg+=1;hpLeft+=r.remainingPartyHp/Math.max(1,r.maximumPartyHp);} else dmg+=Math.min(1,(r.damageDealt||0)/Math.max(1,r.enemyMaximumHp)); } } }));
    } finally { dun.floors=orig; }
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    roomOnlyObjective.last={dmg:dmg/N,kills:kills/N,hp:kills?hpLeft/kills:0};
    return 3*(dmg/N)+2*(kills/N)+1.0*(hpLeft/N);
  };
}
