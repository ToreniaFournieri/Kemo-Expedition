import { Client, runDir } from './client.mjs';
import fs from 'node:fs';
const c = new Client();
const [action, n='1'] = process.argv.slice(2);
const write=(name,data)=>fs.writeFileSync(`${runDir}/${name}.json`,JSON.stringify(Array.isArray(data)?data:{...data,_apiRevision:c.state.revision},null,2));
function summary(p) { return {level:p.level,hp:p.maxHp,deity:p.deityId,order:p.order,characters:p.characters.map(x=>({id:x.characterId,name:x.name,build:x.mainClassId+'/'+x.subClassId,mode:x.autoEquipmentMode,eq:x.equipment,slots:x.calculatedStatus.stats.find(x=>x.key==='f.equipment_slots')?.value,attacks:x.calculatedStatus.attacks.filter(x=>x.available).map(x=>[x.attackType,...x.facts.map(x=>x.value)])}))}; }
if(action==='opening') {
 const builds={1:{mainClassId:'lord',subClassId:'lord'},6:{mainClassId:'guardian',subClassId:'guardian'},4:{racesAndGender:'ursan/male',mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'},2:{racesAndGender:'ursan/female',mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'},3:{mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'},5:{mainClassId:'wizard',subClassId:'alchemist',lineage:'utopia',predisposition:'introspective'}};
 const steps=Object.entries(builds).map(([id,b])=>({route:`/commit/build/character/${id}/changeBuild`,parameters:{...b,simulation:false,confirmation:'yes'}}));
 steps.push({route:'/commit/build/party/1',parameters:{deityId:'precision',order:[6,1,4,2,3,5]}});
 steps.push({route:'/commit/expedition/1/changeExpedition',parameters:{destinationMode:'fixed',destination:1,depthLimit:'all',difficultyOffset:0}});
 write('opening.batch',steps); await c.batch(steps);
}
if(action==='step') for(let i=0;i<Number(n);i++) await c.commit('progress/elapsed',{elapsedSeconds:43200});
if(action==='advance'||action==='half') {
 for(let i=0;i<Number(n);i++) {
  const local=JSON.parse(fs.readFileSync(`${runDir}/expedition.json`));
  const p=local.expeditionInfo.parties[0];
  const bossBeaten=p.clearGates.length===0||p.clearGates.every(g=>g.kind==='godGate');
  if(bossBeaten&&p.destination===8){console.log('Expedition 8 boss already beaten; stopping progression.');break;}
  if(bossBeaten && p.destination<8) await c.commit('expedition/1/changeExpedition',{destination:p.destination+1,destinationMode:'fixed',depthLimit:'all',difficultyOffset:0});
  if(action==='advance')await c.commit('progress/elapsed',{elapsedSeconds:43200});
  await c.commit('progress/elapsed',{elapsedSeconds:43200});
  const d=await c.read('observation/expedition');write('expedition',d);
  console.log(JSON.stringify({time:c.state.inGameTime,parties:d.expeditionInfo.parties.map(p=>({id:p.partyNumber,d:p.destination,gates:p.clearGates,hp:p.maximumHp,outcome:p.disclosedOutcome}))}));
  const current=d.expeditionInfo.parties[0];if(current.destination===8&&(current.clearGates.length===0||current.clearGates.every(g=>g.kind==='godGate')))break;
 }
}
if(action==='exp'||action==='snapshot') {const d=await c.read('observation/expedition');write('expedition',d);console.log(JSON.stringify(d,null,2));}
if(action==='party'||action==='snapshot') {const d=await c.read('observation/party',{partyNumber:1});write('party',d);console.log(JSON.stringify(summary(d.partyInfo.party),null,2));}
if(action==='items'||action==='snapshot') {const d=await c.read('base/searchItems',{state:'owned',details:'all',limit:5000});write('items',d);console.log('items',d.totalCount,d.items.slice(0,3));const j=await c.read('base/searchItems',{state:'owned',category:'jewel',details:'all',limit:5000});write('jewels',j);console.log('jewels',j);}
if(action==='sim') {const d=await c.read('expedition/1/simulationRun',{numberOfRun:Number(n)>1?Number(n):1000});write('simulation',d);console.log(JSON.stringify(d,null,2));}
