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

const trials=[];
for (const order of [[6,1,4,2,3,5],[1,6,4,2,3,5],[1,4,2,3,6,5],[1,4,2,6,3,5],[1,3,4,2,6,5],[1,2,4,3,6,5]]) {
 const p={...structuredClone(base),characters:order.map(id=>base.characters.find(x=>x.id===id))};
 const gate=await simulate(p,1000);
 const unlocked={...p,clearGateStatus:{...p.clearGateStatus,[ex.destination*1000+604]:true}};
 const boss=await simulate(unlocked,1000);
 const row={order,gate:gate.rate,bossClear:boss.clear,bossArrival:boss.rooms[22]?.success??0};
 row.expectedGateAttempts=gate.rate? (1/Math.pow(gate.rate,2)-1)/(1-gate.rate):null;
 row.expectedBossAttempts=boss.clear?1/boss.clear:null;
 row.expectedTotalAttempts=(row.expectedGateAttempts??1e9)+(row.expectedBossAttempts??1e9);
 trials.push(row);console.log(JSON.stringify(row));
}
trials.sort((a,b)=>a.expectedTotalAttempts-b.expectedTotalAttempts);
fs.writeFileSync(`${runDir}/boss-order-search.json`,JSON.stringify(trials,null,2));
const order=trials[0].order;
const batch=JSON.stringify(order)===JSON.stringify(base.characters.map(x=>x.id))?[]:[{route:'/commit/build/party/1',parameters:{order}}];
fs.writeFileSync(`${runDir}/boss-order.batch.json`,JSON.stringify(batch,null,2));
