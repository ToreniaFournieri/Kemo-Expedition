// Per-stage success estimate for dungeon d: gate floors 1-5 (streak k=7..3), boss gate (k=2 @6-3), boss clear.
import {T,sim,summarize,fmt} from './lib.mjs';
export const GATE_K={1:7,2:6,3:5,4:4,5:3,6:2};
export function openGates(p,d,upTo){ // mark gates of floors < upTo as passed (floor 6 = boss gate key d*1000+604)
  p.clearGateStatus={...p.clearGateStatus};
  for(let f=1;f<upTo;f++) p.clearGateStatus[d*1000+f*10+4]=true;
}
export async function stageReport(state,pi,d,{n=300,seed=77,stages=[1,2,3,4,5,6,7]}={}){
  const out={};
  for(const f of stages){
    const st=structuredClone(state); const p=st.parties[pi];
    p.selectedDungeonId=d; 
    openGates(p,d,Math.min(f,6)); if(f===7){ p.clearGateStatus[d*1000+604]=true; }
    p.expeditionDepthLimit= f<=5?`${f}f-3`: f===6?'beforeBoss':'all';
    const r=summarize(await sim(st,pi,n,seed));
    const succ=f<=6?(r.C+r.R):r.C;
    const k=f<=6?GATE_K[f]:1;
    const runs=succ<=0?Infinity:(succ>=1?k:(Math.pow(succ,-k)-1)/(1-succ));
    out[f]={succ,runs,defeat:r.Df,draw:r.D,xp:r.xp};
  }
  return out;
}
export function printReport(out){ let tot=0; for(const [f,x] of Object.entries(out)){ tot+=x.runs; console.log(`stage ${f==7?'boss':f==6?'bossGate':'gate'+f}: succ ${fmt(x.succ)}% runs ${isFinite(x.runs)?x.runs.toFixed(1):'inf'} Df ${fmt(x.defeat)} D ${fmt(x.draw)} xp ${Math.round(x.xp)}`);} console.log('total expected runs',tot.toFixed(1),'~steps',(tot/26).toFixed(2)); }
if(process.argv[1].endsWith('stages.mjs')){
  const s=T.loadSave(process.argv[2]); const d=+process.argv[3];
  printReport(await stageReport(s,0,d,{n:+(process.argv[4]||300)}));
}
