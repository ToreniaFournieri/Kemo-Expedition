import {T,sim,summarize,fmt,seedCrypto} from './lib.mjs';
import * as O from './opt.mjs';
import {GATE_K} from './stages.mjs';
import {writeFileSync,readFileSync} from 'node:fs';
const LNMIN=Math.log(0.003); const PROG_W=25;
export function stageObjective(d,{n=150,seed=77,stages=[1,2,3,4,5,6,7],stop=0.35,pi=0,forceMax=null}={}){
  return async(state)=>{
    const p=state.parties[pi]; let S=0; let stopped=false; const info=[];
    const saved={g:p.clearGateStatus,d:p.selectedDungeonId,l:p.expeditionDepthLimit};
    for(const f of stages){
      const k=f<=6?GATE_K[f]:1;
      if(stopped){S+=k*(-LNMIN);continue;}
      p.selectedDungeonId=d; p.clearGateStatus={...saved.g};
      for(let g=1;g<Math.min(f,7);g++) p.clearGateStatus[d*1000+g*10+4]=true;
      if(f===7) p.clearGateStatus[d*1000+604]=true;
      p.expeditionDepthLimit= f<=5?`${f}f-3`: f===6?'beforeBoss':'all';
      const raw=await sim(state,pi,n,seed); const r=summarize(raw);
      const succ=f<=6?(r.C+r.R):r.C;
      S+= -k*Math.log(Math.max(succ,0.003)); info.push(succ);
      if(succ<stop){ stopped=true;
        const T=f<=5?4*(f-1)+3:f===6?23:24; let reached=0; for(let i=0;i<T&&i<raw.rooms.length;i++) reached+=raw.rooms[i].reached; reached+=succ*raw.total;
        const progress=reached/(raw.total*(T+1)); S+= PROG_W*(1-progress); }
    }
    p.clearGateStatus=saved.g;p.selectedDungeonId=saved.d;p.expeditionDepthLimit=saved.l;
    return -S;
  };
}
if(process.argv[1].endsWith('stageopt.mjs')){
  const [,,file,dd,seedA,itersA,out,charsA,startPlan]=process.argv;
  const s=T.loadSave(file); const d=+dd; const m=O.buildModel(s,0);
  const before=O.snapshot(m);
  if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); O.applyDiff(m,j.diff||j); }
  const chars=charsA?charsA.split(',').map(Number):null;
  const best=await O.climb(m,stageObjective(d),{iters:+itersA,seed:+seedA,chars,log:(...a)=>console.log(...a)});
  writeFileSync(out,JSON.stringify({score:best,diff:O.diff(before,m)}));
  console.log('done',best);
}
