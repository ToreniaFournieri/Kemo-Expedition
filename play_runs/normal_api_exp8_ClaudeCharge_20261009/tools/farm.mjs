// farm.mjs save hours seed "d:off:depth" ...  -> EXP/12h, runs, outcomes using the real AFK chunk path (like commit/progress/elapsed)
import {T} from '../../ai_play_tools/twin/lib.mjs';
await T.ensureLanguageLoaded('en');
const [,,file,hoursS,seedS,...specs]=process.argv; const hours=+hoursS||12; const seed0=+seedS||5;
function g(l){l=Math.max(1,Math.min(99,l));return 1.259-Math.max(0,0.0007*(l-7))-Math.max(0,0.00035*(l-14))-Math.max(0,0.00018*(l-21))-Math.max(0,0.00008*(l-28))-Math.max(0,0.00004*(l-35))-Math.max(0,0.00002*(l-42))-Math.max(0,0.00001*(l-49));}
const xn=l=>Math.ceil(1000*Math.pow(g(l),Math.max(0,l-1)));
const cum=(lv,xp)=>{let c=0;for(let l=1;l<lv;l++)c+=xn(l);return c+xp;};
const base=T.loadSave(file);
console.log('PT1 Lv',base.parties[0].level,'xp',Math.round(base.parties[0].experience),'dest',base.parties[0].selectedDungeonId,'HP',T.computePartyStats(base.parties[0]).partyStats.hp);
for(const spec of specs){
  const [d,off,depth]=spec.split(':'); 
  let tot={xp:0,runs:0,C:0,R:0,D:0,Rt:0,Df:0,cyc:0,blocks:0};
  for(let rep=0;rep<3;rep++){
    let s=structuredClone(base); const p=s.parties[0];
    p.selectedDungeonId=+d; p.expeditionDifficultyOffset=+off; p.expeditionDifficultyOffsetByDungeon={...(p.expeditionDifficultyOffsetByDungeon||{}),[+d]:+off}; p.expeditionDepthLimit=depth||'all';
    const seed=seed0+rep*101; let v=seed; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let bseq=0n;
    const run=(st,n,cyc)=>T.withBattleSeedSourceForTesting(()=>(BigInt(seed)<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateAfkPartyChunkForWorker(st,{partyIndex:0,cycleDurationMs:cyc,cycleDurationScale:1,simulatedCompletedAt:1790000000000,gameMode:'mode.normal',operationCount:n,inventoryStrategy:'immutable',workerOptimization:'optimized',compactBattleResultOutput:false})));
    s=run(s,1,1000); // warm-up: sets lastExpeditionLog for this destination
    const st0=s.parties[0].expeditionStats; const x0=cum(s.parties[0].level,s.parties[0].experience);
    let elapsed=0; const H=hours*3600000;
    while(elapsed<H){ const cyc=T.getApproxAfkCycleDurationMs(s.parties[0],1,{deityDonations:s.global.deityDonations}); const blk=Math.min(43200000,H-elapsed); const n=Math.floor(blk/cyc); tot.cyc+=cyc; tot.blocks++; if(n>0) s=run(s,n,cyc); elapsed+=blk; }
    const q=s.parties[0], st1=q.expeditionStats;
    tot.xp+=cum(q.level,q.experience)-x0; for(const k of ['Clear','Return','Draw','Retreat','Defeat']){ const dk=(st1[k]||0)-(st0[k]||0); tot[{Clear:'C',Return:'R',Draw:'D',Retreat:'Rt',Defeat:'Df'}[k]]+=dk; tot.runs+=dk; }
  }
  const r=tot.runs||1;
  console.log(spec.padEnd(18),'xp/12h',Math.round(tot.xp/3/hours*12),'runs/12h',(tot.runs/3/hours*12).toFixed(1),'cycMin',(tot.cyc/tot.blocks/60000).toFixed(1),'xp/run',Math.round(tot.xp/r),'C',(tot.C/r).toFixed(2),'R',(tot.R/r).toFixed(2),'D',(tot.D/r).toFixed(2),'Rt',(tot.Rt/r).toFixed(2),'Df',(tot.Df/r).toFixed(2));
}
