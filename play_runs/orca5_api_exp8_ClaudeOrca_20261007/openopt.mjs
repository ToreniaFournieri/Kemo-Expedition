// usage: ORCA=5 RACE=... BUY="1110,1105,1112" ENH=2 node openopt.mjs s0.kemoz out.json [iters]
import {T} from '../ai_play_tools/twin/lib.mjs'; import * as O from '../ai_play_tools/twin/opt.mjs'; import {applyRace} from '../ai_play_tools/twin/race.mjs';
import {sim,summarize} from '../ai_play_tools/twin/lib.mjs';
const gateObjective=({N,seed})=>{const f=async(st)=>{const p=st.parties[0];p.selectedDungeonId=1;p.expeditionDepthLimit='1f-3';const raw=await sim(st,0,N,seed);const r=summarize(raw);let reach=0;for(let i=0;i<3;i++)reach+=raw.rooms[i].reached/raw.total;f.last={C:r.C,R:r.R,D:r.D,Df:r.Df,reach,xp:r.xp};return 5*(r.C+r.R)+reach+r.xp*0.05;};return f;}; import {writeFileSync} from 'node:fs';
const [,,file,out,iters]=process.argv; const s=T.loadSave(file); applyRace(s);
const ENH=+(process.env.ENH||2);
for(const id of (process.env.BUY||'').split(',').filter(Boolean)){ const it=T.parseItemFormat(`0/${id}/${ENH}/0`); const k=O.vkey(it); const e=s.global.inventory[k]; if(e&&e.status==='owned') e.count++; else s.global.inventory[k]={item:it,count:1,status:'owned'}; }
// strip equipment of everyone (re-pool everything)
const m0=O.buildModel(s,0);
const m=O.buildModel(s,0); const free0={...m.jewels};
const N=+(process.env.N||80);
const quick=gateObjective({N,seed:3}); const conf=gateObjective({N:N*3,seed:11});
// seed: greedy fill using climb2
const best=await O.climb2(m,quick,conf,{iters:+iters||300,seed:5,log:(...a)=>console.log(...a)});
await conf(s); console.log('final',JSON.stringify(conf.last));
const slotsOf=s.parties[0].characters.map(c=>c.id+':'+c.equipment.map(e=>e&&e.id+'+'+e.enhancement).join(','));
console.log(slotsOf.join(' | '));
