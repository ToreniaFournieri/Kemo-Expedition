import fs from 'node:fs';
import { Client, runDir } from './client.mjs';
const c=new Client();
const candidate=JSON.parse(fs.readFileSync(`${runDir}/candidate.json`));
const batch=JSON.parse(fs.readFileSync(`${runDir}/equipment.batch.json`));
const tag=`d${candidate.party.selectedDungeonId}-r${c.state.revision}`;
fs.writeFileSync(`${runDir}/${tag}-equipment.batch.json`,JSON.stringify(batch,null,2));
fs.writeFileSync(`${runDir}/${tag}-candidate.json`,JSON.stringify(candidate,null,2));
await c.batch(batch);
const live=await c.read('observation/party',{partyNumber:1});
fs.writeFileSync(`${runDir}/party.json`,JSON.stringify({...live,_apiRevision:c.state.revision},null,2));
const jewelBatch=[];const jewelRemovals=[];
for(const ch of candidate.party.characters){const current=live.partyInfo.party.characters.find(x=>x.characterId===ch.id);const used=new Set();
 const desired=new Map();
 for(const item of ch.equipment){if(!item?.jewel)continue;
 const matches=current.equipment.map((s,i)=>({s,i})).filter(({s,i})=>!used.has(i)&&s!=='0'&&s.split('/').slice(2,5).join('/')===`${item.id}/${item.enhancement}/${item.superRare}`);
 const target=matches.find(x=>x.s.split('/')[5]===`${item.jewel.key}:${item.jewel.rank}`)||matches.find(x=>!x.s.split('/')[5])||matches[0];
 if(!target)continue;used.add(target.i);desired.set(target.i,`${item.jewel.key}:${item.jewel.rank}`);if(target.s.split('/')[5]===`${item.jewel.key}:${item.jewel.rank}`)continue;
 jewelBatch.push({route:`/commit/build/character/${ch.id}/jewelAttach`,parameters:{targetEquipment:target.i,jewelToSet:`${item.jewel.key}:${item.jewel.rank}`}});
 }
 for(const [slot,entry] of current.equipment.entries()){const existing=entry.split('/')[5];if(existing&&existing!==desired.get(slot))jewelRemovals.push({route:`/commit/build/character/${ch.id}/jewelRemove`,parameters:{targetEquipment:slot}});}
}
fs.writeFileSync(`${runDir}/${tag}-jewels.batch.json`,JSON.stringify([...jewelRemovals,...jewelBatch],null,2));
await c.batch([...jewelRemovals,...jewelBatch]);
console.log(JSON.stringify({equipmentCalls:batch.length,jewelCalls:jewelRemovals.length+jewelBatch.length,forecast:candidate.rate}));
