// Exact gate objective via forecast sims: k*ln(success) with a small progress term for smoothness.
import {T,sim,summarize} from './lib.mjs'; import {GATE_K} from './stages.mjs'; import {targetRooms} from './wall.mjs';
export function gateObjective({d,f,N=150,seed=77,pi=0,wProg=0.3,floor=0.005}){
  const k=f<=6?GATE_K[f]:1; const Tn=targetRooms(f);
  return async(state)=>{
    const p=state.parties[pi]; const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    p.selectedDungeonId=d; p.clearGateStatus={...saved.g};
    for(let g=1;g<Math.min(f,7);g++) p.clearGateStatus[d*1000+g*10+4]=true;
    if(f===7) p.clearGateStatus[d*1000+604]=true;
    p.expeditionDepthLimit= f<=5?`${f}f-3`: f===6?'beforeBoss':'all';
    const raw=await sim(state,pi,N,seed); const r=summarize(raw);
    const succ=f<=6?(r.C+r.R):r.C;
    let reached=0; for(let i=0;i<Tn&&i<raw.rooms.length;i++) reached+=raw.rooms[i].reached; const progress=(reached/raw.total)/Tn;
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    gateObjective.last={succ,progress};
    return k*Math.log(Math.max(succ,floor))+wProg*progress;
  };
}

// Sum of several gate objectives (e.g. boss gate + boss) so one build serves both.
export function multiGate(list){ const objs=list.map(o=>gateObjective(o)); return async(state)=>{ let s=0; for(const o of objs) s+=await o(state); return s; }; }

// Boss-room objective: ln(clear rate) + reach term + survive-the-boss term (Draw/Clear share of arrivals) for gradient before the first kill.
export function bossObjective({d,N=300,seed=77,pi=0,w1=1.0,w2=0.7,floor=0.003}){
  return async(state)=>{
    const p=state.parties[pi]; const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    p.selectedDungeonId=d; p.clearGateStatus={...saved.g};
    for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true;
    p.expeditionDepthLimit='all';
    const raw=await sim(state,pi,N,seed); const r=summarize(raw); const boss=raw.rooms[23];
    const reach=boss.reached/raw.total; const surv=boss.reached?(boss.Clear+boss.Draw)/boss.reached:0;
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    bossObjective.last={clear:r.C,reach,surv};
    return Math.log(Math.max(r.C,floor))+w1*reach+w2*surv;
  };
}
