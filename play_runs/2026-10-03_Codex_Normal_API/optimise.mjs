import fs from 'node:fs';
import { runDir } from './client.mjs';
import * as t from '/tmp/bokemo-codex-exp8/twin.mjs';
const load=name=>JSON.parse(fs.readFileSync(`${runDir}/${name}.json`));
const live=load('party').partyInfo.party;
const ex=load('expedition').expeditionInfo.parties[0];
const makeItem=(fields,jewel)=>{ const [lock,id,enh,sr]=fields.map(Number); return {...t.getItemById(id),tier:Math.floor(id/1000),enhancement:enh,superRare:sr,isLocked:Boolean(lock),...(jewel?{jewel:{key:jewel.split(':')[0],rank:Number(jewel.split(':')[1])}}:{})}; };
const key=item=>`${item.id}/${item.enhancement}/${item.superRare}`;
const itemString=item=>`0/${key(item)}`;
const state=t.createFreshGameState('en',Date.now());
const base=state.parties[0];
base.level=live.level;base.condition=live.condition;base.deity={name:t.getDeityNameFromId(live.deityId),uniqueAbilities:[]};base.deityGold=live.statistics.donatedGold;
state.global.deityDonations[base.deity.name]=base.deityGold;
base.selectedDungeonId=ex.destination;base.expeditionDepthLimit=ex.depthLimit;base.expeditionDestinationMode='fixed';base.expeditionDifficultyOffset=0;
base.characters=live.characters.map(c=>({id:c.characterId,name:c.name,raceId:c.raceId,gender:c.gender,isUnique:c.isUnique,mainClassId:c.mainClassId,subClassId:c.subClassId,lineageId:c.lineageId,predispositionId:c.predispositionId,autoEquipmentMode:1,equipment:c.equipment.map(s=>{if(s==='0'||s===null)return null;const a=s.split('/');return makeItem(a.slice(1,5),a[5]);})}));
const locked=ex.clearGates.find(g=>g.kind==='eliteGate'||g.kind==='bossGate');
for(let d=1;d<ex.destination;d++)base.defeatedBossExpeditions[d]=true;
if(ex.clearGates.length===0)base.defeatedBossExpeditions[ex.destination]=true;
for(let f=1;f<=5;f++) if(!locked||f<(locked.kind==='bossGate'?6:locked.floor))base.clearGateStatus[ex.destination*1000+f*10+4]=true;
if(!locked)base.clearGateStatus[ex.destination*1000+604]=true;
if(locked)base.clearGateProgress[String(ex.destination*1000+(locked.kind==='bossGate'?604:locked.floor*10+4))]=locked.current;
if(process.env.TARGET_FLOOR){const target=Number(process.env.TARGET_FLOOR);for(let f=1;f<=5;f++){const k=ex.destination*1000+f*10+4;if(f<target)base.clearGateStatus[k]=true;else {delete base.clearGateStatus[k];base.clearGateProgress[String(k)]=0;}}delete base.clearGateStatus[ex.destination*1000+604];}
const pool=new Map();
function add(item,count){const k=key(item);const v=pool.get(k);if(v)v.count+=count;else pool.set(k,{item:{...item,jewel:null},count});}
for(const s of load('items').items){const a=s.split('/');add(makeItem(a.slice(0,4)),Number(a[4]));}
for(const ch of base.characters)for(const item of ch.equipment)if(item)add(item,1);
const all=[...pool.values()].sort((a,b)=>(b.item.tier*20+b.item.enhancement*12)-(a.item.tier*20+a.item.enhancement*12));
const jewels=[];
for(const ch of base.characters)for(const i of ch.equipment)if(i?.jewel)jewels.push(i.jewel);
for(const s of load('jewels').items){const a=s.split('/');const [jk,rank]=a[0].split(':');for(let k=0;k<Number(a[1]);k++)jewels.push({key:jk,rank:Number(rank)});}
let rng=1;const native=globalThis.crypto.getRandomValues.bind(globalThis.crypto);
globalThis.crypto.getRandomValues=a=>{for(let i=0;i<a.length;i++){rng=(Math.imul(rng,1664525)+1013904223)>>>0;a[i]=rng;}return a;};
async function simulate(p,count=300){rng=0x5eed1234;const s={...state,parties:[{...p,currentHp:t.computePartyMaxHp(p)},...state.parties.slice(1)]};const r=await t.simulateExpeditionRuns(s,0,'mode.normal',count);return {p:r.Clear+r.Return,rate:(r.Clear+r.Return)/count,clear:r.Clear/count,retreat:r.Retreat/count,defeat:r.Defeat/count,rooms:r.rooms.map(x=>({room:x.room,success:(x.Victory+x.Clear+x.Return)/count,defeat:x.Defeat/count,draw:x.Draw/count})),result:r};}
const defense=Number(process.env.ENEMY_DEFENSE||ex.destination*50);
function offense(ch,eq,row){const s=t.computeCharacterStats({...ch,equipment:eq},live.level,row);const magic=ch.id===5;const raw=magic?s.magicalAttack:s.rangedAttack;const n=magic?s.magicalNoA:s.rangedNoA;const amp=magic?(1+s.magicalAttackCBonus)*s.magicalOffenseMultiplier:(1+s.rangedAttackCBonus+s.physicalAttackCBonus)*s.physicalOffenseMultiplier;const decay=Math.min(.98,Math.max(.7,.90+s.accuracyBonus+.025));let hits=0;for(let i=0;i<n;i++)hits+=magic?Math.pow(decay,i):s.accuracyPotency*Math.pow(decay,i);return Math.max(1,raw-defense*(1-s.penetMultiplier))*amp*hits*s.elementalOffenseValue;}
function tankScore(ch,eq,row){const test={...ch,equipment:eq};const s=t.computeCharacterStats(test,live.level,row);const hp=t.computeCharacterHpContribution(test,live.level).totalHpBonus;return Math.log(10+Math.min(s.physicalDefense,ex.destination*130))*2+Math.log(10+Math.min(s.magicalDefense,ex.destination*90))+.8*Math.log(hp+10);}
function structured(armorSlots,tankFirst,element){
 const p=structuredClone(base);const remaining=new Map([...pool].map(([k,v])=>[k,v.count]));
 const ordered=[...p.characters].sort((a,b)=>{const priority=id=>id===tankFirst?0:[1,6].includes(id)?1:id===4?2:id===2?3:id===3?4:5;return priority(a.id)-priority(b.id)});
 for(const ch of ordered){const row=p.characters.indexOf(ch)+1;const slots=t.computeCharacterStats(ch,live.level,row).maxEquipSlots;const tank=[1,6].includes(ch.id);let eq=[];
  const suitable=all.filter(v=>t.canCharacterEquipCategory(ch,v.item.category)&&(!tank||['armor','shield','robe'].includes(v.item.category))&&(tank||['arrow','bolt','archery','wand','grimoire','catalyst','armor','robe','shield'].includes(v.item.category))&&(tank||!element||!v.item.elementalOffense||v.item.elementalOffense===element));
  const candidates=suitable.filter(v=>v.item.superRare||v.item.enhancement>=2||v.item.tier>=ex.destination-1||v.item.vitalityBonus).filter((v,i,a)=>a.slice(0,i).filter(x=>x.item.id===v.item.id).length<4);
  for(let slot=0;slot<slots;slot++){
   let best=null,bestScore=-Infinity;
   for(const v of candidates){if((remaining.get(key(v.item))||0)<=0)continue;const defensive=['armor','robe','shield'].includes(v.item.category);if(!tank&&((slot<armorSlots)!==defensive))continue;
    if(!tank&&element&&element!=='none'&&slot===armorSlots&&v.item.elementalOffense!==element)continue;
    const test=[...eq,v.item];let score=tank?tankScore(ch,test,row):offense(ch,test,row);
    if(!tank&&slot<armorSlots)score=tankScore(ch,test,row);
    if(!tank&&element&&v.item.bonuses?.some(b=>b.type===element+'_offense'))score*=1.02;
    if(score>bestScore){best=v.item;bestScore=score;}
   }
   if(!best)break;eq.push({...best});remaining.set(key(best),remaining.get(key(best))-1);
  }
  ch.equipment=eq;
 }
 return p;
}
function addJewels(p){
 p=structuredClone(p);
 for(const ch of p.characters) for(const item of ch.equipment) if(item)item.jewel=null;
 for(const jewel of jewels){let best=null,gain=-Infinity;
  for(const ch of p.characters)for(let slot=0;slot<ch.equipment.length;slot++){const item=ch.equipment[slot];if(!item||item.jewel||!t.isJewelAllowedForCategory(item.category,jewel.key))continue;
   const tank=[1,6].includes(ch.id);if((jewel.key==='might'&&![2,3,4].includes(ch.id))||(jewel.key==='arcana'&&ch.id!==5)||(jewel.key==='focus'&&tank))continue;
   const row=p.characters.indexOf(ch)+1;const score=tank?tankScore(ch,ch.equipment,row):offense(ch,ch.equipment,row);
   const eq=ch.equipment.map((x,i)=>i===slot?{...x,jewel}:x);const next=tank?tankScore(ch,eq,row):offense(ch,eq,row);
   const delta=(next-score)/Math.max(1,score);
   if(delta>gain){gain=delta;best={ch,slot};}
  }if(best)best.ch.equipment[best.slot]={...best.ch.equipment[best.slot],jewel};
 }
 return p;
}
const overview=await simulate(base,500);console.log('baseline',JSON.stringify({rate:overview.rate,clear:overview.clear,hp:t.computePartyMaxHp(base),rooms:overview.rooms}));
if(process.argv.includes('--baseline-only'))process.exit(0);
const trials=[];
for(const armor of [0,1,2])for(const tankFirst of [1,6]){
const p=addJewels(structured(armor,tankFirst,null));const r=await simulate(p,250);trials.push({p,rate:r.rate,armor,tankFirst});console.log('structured',armor,tankFirst,r.rate,'HP',t.computePartyMaxHp(p));}
trials.sort((a,b)=>b.rate-a.rate);let best=trials[0].p;let bestRate=trials[0].rate;
if(bestRate<overview.rate){best=structuredClone(base);bestRate=overview.rate;}
if(ex.destination>=5)for(const element of ['none','fire','thunder','ice'])for(const armor of [0,1]){const p=addJewels(structured(armor,1,element));const r=await simulate(p,350);console.log('element',element,armor,r.rate);if(r.rate>bestRate+.005){best=p;bestRate=r.rate;}}
const orders=[[6,1,4,2,3,5],[1,6,4,2,3,5],[1,4,2,3,6,5],[6,4,2,3,1,5],[1,4,2,6,3,5],[1,2,4,3,6,5]];
for(const order of orders){const p={...best,characters:order.map(id=>best.characters.find(x=>x.id===id))};const r=await simulate(p,400);console.log('order',order,r.rate);if(r.rate>bestRate+.005){best=p;bestRate=r.rate;}}
if(ex.destination>=8){
 const foundation=structuredClone(best);
 for(const kCount of [0,4,8,12])for(const lCount of [0,4,8]){if(!kCount&&!lCount)continue;
  const p=structuredClone(foundation);const used=new Map();for(const ch of p.characters)for(const i of ch.equipment)if(i)used.set(key(i),(used.get(key(i))||0)+1);
  for(const [id,count] of [[1,kCount],[6,lCount]]){const ch=p.characters.find(x=>x.id===id);const slots=ch.equipment.map((item,slot)=>({item,slot})).sort((a,b)=>(a.item.vitalityBonus?1:0)-(b.item.vitalityBonus?1:0)||(a.item.partyHP||0)-(b.item.partyHP||0));
   for(const {item,slot} of slots.slice(0,count)){if(item.vitalityBonus)continue;const available=all.filter(v=>v.item.vitalityBonus&&v.count>(used.get(key(v.item))||0)).sort((a,b)=>(b.item.physicalDefense||0)-(a.item.physicalDefense||0));if(!available.length)break;const chosen=available[0].item;used.set(key(item),used.get(key(item))-1);used.set(key(chosen),(used.get(key(chosen))||0)+1);ch.equipment[slot]={...chosen,jewel:null};}
  }
  const q=addJewels(p);
  for(const order of [[1,6,4,2,3,5],[6,1,4,2,3,5],[1,4,2,6,3,5]]){const q2={...q,characters:order.map(id=>q.characters.find(x=>x.id===id))};const r=await simulate(q2,400);console.log('vitality',kCount,lCount,order,r.rate,'HP',t.computePartyMaxHp(q2));if(r.rate>bestRate+.005){best=q2;bestRate=r.rate;}}
 }
}
let proposalSeed=20261003;const random=()=>{proposalSeed=(Math.imul(proposalSeed,1664525)+1013904223)>>>0;return proposalSeed/4294967296;};
const iterations=Number(process.env.REFINE_ITERATIONS||0);
if(iterations){let search=await simulate(best,400);bestRate=search.rate;
 for(let it=0;it<iterations;it++){
  const p=structuredClone(best);const a=Math.floor(random()*6);const ch=p.characters[a];const slot=Math.floor(random()*ch.equipment.length);if(slot>=ch.equipment.length)continue;
  if(random()<.25){const b=Math.floor(random()*6),other=p.characters[b],slot2=Math.floor(random()*other.equipment.length);const x=ch.equipment[slot],y=other.equipment[slot2];if(!x||!y||!t.canCharacterEquipCategory(ch,y.category)||!t.canCharacterEquipCategory(other,x.category))continue;ch.equipment[slot]=y;other.equipment[slot2]=x;}
  else {
   const used=new Map();for(const member of p.characters)for(const item of member.equipment)if(item)used.set(key(item),(used.get(key(item))||0)+1);
   const tank=[1,6].includes(ch.id);const possible=all.filter(v=>v.count>(used.get(key(v.item))||0)&&t.canCharacterEquipCategory(ch,v.item.category)&&(tank?['armor','robe','shield'].includes(v.item.category):ch.id===5?['wand','grimoire','catalyst','armor','robe','shield'].includes(v.item.category):['arrow','bolt','archery','armor','robe','shield'].includes(v.item.category))).filter((v,i,ar)=>ar.slice(0,i).filter(x=>x.item.id===v.item.id).length<2);
   if(!possible.length)continue;const item=possible[Math.floor(random()*possible.length)].item;const old=ch.equipment[slot];ch.equipment[slot]={...item,...(old?.jewel&&t.isJewelAllowedForCategory(item.category,old.jewel.key)?{jewel:old.jewel}:{})};
  }
  const r=await simulate(p,400);if(r.rate>bestRate+.0025){best=p;bestRate=r.rate;console.log('refine',it,bestRate,'HP',t.computePartyMaxHp(best));}
 }
}
if(process.env.DEITY_SWEEP){const foundations=[structuredClone(base),structuredClone(best)];
 for(const foundation of foundations)for(const deityId of ['precision','fertility','fortification','restoration','cunning','attrition','mirage'])for(const laikaSub of ['guardian','pilgrim']){
  const p=structuredClone(foundation);p.deity={name:t.getDeityNameFromId(deityId),uniqueAbilities:[]};p.deityGold=deityId===live.deityId?base.deityGold:0;
  const ch=p.characters.find(x=>x.id===6);ch.subClassId=laikaSub;ch.equipment=ch.equipment.slice(0,t.computeCharacterStats(ch,live.level).maxEquipSlots);
  const r=await simulate(p,500);console.log('deity',deityId,laikaSub,r.rate);if(r.rate>bestRate+.005){best=p;bestRate=r.rate;}
 }
}
if(process.env.ORDER_SWEEP){const roots=[structuredClone(base),structuredClone(best)];const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(rest=>[x,...rest])):[[]];const attackOrders=permutations([4,2,3]);const configurations=[];
 for(const root of roots)for(const positions of [[0,1],[1,0],[0,2],[0,3],[0,4],[1,3],[2,0]])for(const attackOrder of attackOrders){const order=Array(6);order[5]=5;order[positions[0]]=1;order[positions[1]]=6;let cursor=0;for(let i=0;i<5;i++)if(!order[i])order[i]=attackOrder[cursor++];const p={...root,characters:order.map(id=>root.characters.find(x=>x.id===id))};const r=await simulate(p,350);configurations.push({p,rate:r.rate});}
 configurations.sort((a,b)=>b.rate-a.rate);for(const x of configurations.slice(0,6)){const r=await simulate(x.p,1000);console.log('formation',x.p.characters.map(x=>x.id),r.rate);if(r.rate>bestRate+.005){best=x.p;bestRate=r.rate;}}
}
if(process.env.BUILD_SWEEP){const foundation=structuredClone(best);
 for(const id of [2,3,4,5])for(const race of id===5?['cervin']:['ursan','felidian','leporian'])for(const main of id===5?['wizard','alchemist','sage']:['ninja','sword-saint','striker']){
  const p=structuredClone(foundation),ch=p.characters.find(x=>x.id===id);ch.raceId=race;ch.mainClassId=main;ch.subClassId=id===5?(main==='wizard'?'alchemist':'wizard'):'ranger';
  const max=t.computeCharacterStats(ch,live.level).maxEquipSlots;ch.equipment=ch.equipment.slice(0,max);
  while(ch.equipment.length<max){const used=new Map();for(const member of p.characters)for(const i of member.equipment)if(i)used.set(key(i),(used.get(key(i))||0)+1);let chosen=null,score=-Infinity;for(const v of all){if(v.count<=(used.get(key(v.item))||0)||!t.canCharacterEquipCategory(ch,v.item.category))continue;const s=offense(ch,[...ch.equipment,v.item],p.characters.indexOf(ch)+1);if(s>score){score=s;chosen=v.item;}}if(!chosen)break;ch.equipment.push({...chosen,jewel:null});}
  const r=await simulate(p,700);console.log('build',id,race,main,r.rate);if(r.rate>bestRate+.01){best=p;bestRate=r.rate;}
 }
}
const r=await simulate(best,1000);console.log('best',JSON.stringify({rate:r.rate,clear:r.clear,hp:t.computePartyMaxHp(best),order:best.characters.map(x=>x.id),characters:best.characters.map(x=>({id:x.id,stats:t.computeCharacterStats(x,live.level,best.characters.indexOf(x)+1),eq:x.equipment.map(itemString)}))}));
fs.writeFileSync(`${runDir}/candidate.json`,JSON.stringify({sourceRevision:load('party')._apiRevision,party:best,rate:r.rate,clear:r.clear},null,2));
const batch=[];
if(best.deity.name!==base.deity.name)batch.push({route:'/commit/build/party/1',parameters:{deityId:best.deity.name.toLowerCase().replace(/^(god|goddess) of /,'').replaceAll(' ','_')}});
for(const ch of best.characters){const old=base.characters.find(x=>x.id===ch.id);if(ch.mainClassId!==old.mainClassId||ch.subClassId!==old.subClassId||ch.raceId!==old.raceId)batch.push({route:`/commit/build/character/${ch.id}/changeBuild`,parameters:{mainClassId:ch.mainClassId,subClassId:ch.subClassId,...(ch.raceId!==old.raceId?{racesAndGender:ch.raceId+'/'+ch.gender}:{}),simulation:false,confirmation:'yes'}});}
if(JSON.stringify(best.characters.map(x=>x.id))!==JSON.stringify(base.characters.map(x=>x.id)))batch.push({route:'/commit/build/party/1',parameters:{order:best.characters.map(x=>x.id)}});
for(const ch of best.characters){const old=base.characters.find(x=>x.id===ch.id);if(JSON.stringify(ch.equipment.map(key))===JSON.stringify(old.equipment.filter(Boolean).map(key)))continue;batch.push({route:`/commit/build/character/${ch.id}/removeAllEquipment`,parameters:{}});}
for(const ch of best.characters){const old=base.characters.find(x=>x.id===ch.id);if(JSON.stringify(ch.equipment.map(key))===JSON.stringify(old.equipment.filter(Boolean).map(key)))continue;batch.push({route:`/commit/build/character/${ch.id}/equip`,parameters:{targetEquipment:ch.equipment.map(itemString)}});}
fs.writeFileSync(`${runDir}/equipment.batch.json`,JSON.stringify(batch,null,2));
globalThis.crypto.getRandomValues=native;
