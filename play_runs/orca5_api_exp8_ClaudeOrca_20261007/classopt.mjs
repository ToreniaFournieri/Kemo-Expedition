// ORCA=5 DEITY=.. SEED=n ROUNDS=n node classopt.mjs s3.kemoz out.json   (greedy class search with gear re-climb)
import {T} from '../ai_play_tools/twin/lib.mjs'; import * as O from '../ai_play_tools/twin/opt.mjs';
import {roomOnlyObjective} from '../ai_play_tools/twin/bossonly.mjs'; import {writeFileSync} from 'node:fs';
const [,,file,out]=process.argv; const SEED=+(process.env.SEED||1), ROUNDS=+(process.env.ROUNDS||40), K=+(process.env.K||60);
const CL=['guardian','duelist','samurai','sword-saint','ranger','striker','ninja','wizard','sage','alchemist','pilgrim','lord'];
const R=O.rng(SEED*7919);
const rooms=[1,2,3];
const mk=(N,seed)=>{const os=rooms.map(r=>roomOnlyObjective({d:1,floorNo:1,roomNo:r,N,seed})); return async(st)=>{let sc=0;for(const o of os){sc+=await o(st);}return sc;};};
const quick=mk(16,3), conf=mk(48,11);
function load(cls,snap){
  const s=T.loadSave(file); if(process.env.DEITY) s.parties[0].deity={...s.parties[0].deity,name:process.env.DEITY};
  const cs=s.parties[0].characters;
  // return all gear to inventory
  const inv=s.global.inventory;
  for(const c of cs) c.equipment.forEach((it,i)=>{ if(it){ const k=O.vkey(it); if(inv[k]) inv[k].count++; else inv[k]={item:{...it,jewel:null},count:1,status:'owned'}; c.equipment[i]=null; } });
  for(const c of cs){ const [m,sb]=cls[c.id]; c.mainClassId=m; c.subClassId=sb; }
  s.parties[0].characters=[...cs];
  const slotsN=cs.map((c,i)=>T.computeCharacterStatsInParty(s.parties[0],i).maxEquipSlots);
  cs.forEach((c,i)=>{ c.equipment=new Array(slotsN[i]).fill(null); (snap[c.id]||[]).forEach((k,si)=>{ if(!k||si>=slotsN[i]) return; const e=inv[k]; if(!e||e.count<=0) return; if(!T.canCharacterEquipCategory(c,e.item.category)) return; e.count--; c.equipment[si]={...e.item,jewel:null}; }); });
  return s;
}
const snapOf=(s)=>Object.fromEntries(s.parties[0].characters.map(c=>[c.id,c.equipment.map(e=>e?O.vkey(e):null)]));
async function evalSet(cls,snap,iters){ const s=load(cls,snap); const m=O.buildModel(s,0);
  // pool free should equal unequipped inventory
  const sc=await O.climb2(m,quick,conf,{iters,seed:SEED+iters,log:()=>{}}); return {sc,snap:snapOf(s),s}; }
const s0=T.loadSave(file); let cls=Object.fromEntries(s0.parties[0].characters.map(c=>[c.id,[c.mainClassId,c.subClassId]]));
let snap=snapOf(s0);
let best=await evalSet(cls,snap,K); snap=best.snap; console.log('base',best.sc.toFixed(3));
for(let r=0;r<ROUNDS;r++){
  const ids=Object.keys(cls); const id=ids[Math.floor(R()*ids.length)];
  const nc=JSON.parse(JSON.stringify(cls)); const which=Math.floor(R()*2); const v=CL[Math.floor(R()*CL.length)]; nc[id][which]=v;
  if(nc[id][0]===cls[id][0]&&nc[id][1]===cls[id][1]) continue;
  const res=await evalSet(nc,snap,K);
  console.log(r,id,JSON.stringify(nc[id]),res.sc.toFixed(3),res.sc>best.sc+0.05?'ACCEPT':'');
  if(res.sc>best.sc+0.05){ cls=nc; best=res; snap=res.snap; writeFileSync(out,JSON.stringify({cls,snap,sc:best.sc})); }
}
console.log('FINAL',best.sc.toFixed(3),JSON.stringify(cls));
