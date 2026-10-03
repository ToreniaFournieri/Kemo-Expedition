const fs=require('node:fs');
const {Client}=require('./client.cjs');
const t=require('/tmp/bokemo-normal-twin.cjs');
const root=__dirname;
const rows=()=>fs.readFileSync(root+'/api-calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
function cached(prefix){return rows().filter(r=>r.route.startsWith(prefix)&&r.status===200).at(-1)?.output.data;}
function itemFromWire(wire,equipped=false){
 if(!wire||wire==='0')return null;
 const parts=wire.split('/');const offset=equipped?1:0;
 const item={...t.getItemById(Number(parts[offset+1])),enhancement:Number(parts[offset+2]),superRare:Number(parts[offset+3]),isLocked:parts[offset]==='1'};
 const j=parts[offset+4];if(equipped&&j?.includes(':')&&j!=='0:0'){const[key,rank]=j.split(':');item.jewel={key,rank:Number(rank)};}
 return item;
}
function key(item){return item ? `${item.id}-${item.enhancement}-${item.superRare}` : '0';}
function wire(item){return `${item.isLocked?1:0}/${item.id}/${item.enhancement}/${item.superRare}`;}
function snapshot(){
 const obs=cached('read/observation/party');const p=obs.partyInfo.party;
 const e=cached('read/observation/expedition').expeditionInfo.parties.find(x=>x.partyNumber===1);
 const s=t.createFreshGameState('en',0);const party=s.parties[0];
 Object.assign(party,{level:p.level,experience:p.experience,condition:p.condition,deity:{name:t.getDeityNameFromId(p.deityId),uniqueAbilities:[]},selectedDungeonId:e.destination,expeditionDestinationMode:'fixed',expeditionDepthLimit:e.depthLimit,expeditionDifficultyOffset:e.difficultyOffset});
 let gold=0;for(let i=1;i<p.deityRank;i++)gold=t.getNextRankDonationRequirement(gold);party.deityGold=gold;
 party.characters=p.characters.map(c=>({...c,id:c.characterId,autoEquipmentMode:{OFF:0,SEMI:1,FULL:2}[c.autoEquipmentMode],equipment:c.equipment.map(x=>itemFromWire(x,true))}));
 party.characters=party.characters.sort((a,b)=>p.order.indexOf(a.id)-p.order.indexOf(b.id));
 for(let d=1;d<e.destination;d++)party.defeatedBossExpeditions[d]=true;
 const gate=e.clearGates.find(g=>g.kind==='eliteGate'||g.kind==='bossGate');
 for(let f=1;f<=5;f++)if(!gate||gate.kind==='bossGate'||f<gate.floor)party.clearGateStatus[e.destination*1000+f*10+4]=true;
 if(!gate)party.clearGateStatus[e.destination*1000+604]=true;
 const inv=cached('read/base/searchItems?state=owned&limit=5000');
 s.global.inventory={};
 const pool=new Map();
 function add(item,count){if(!item)return;const k=key(item),prev=pool.get(k);if(prev)prev.count+=count;else pool.set(k,{item:{...item,jewel:null,isLocked:false},count});}
 inv.items.forEach(w=>{if(w.includes(':'))return;const item=itemFromWire(w),count=Number(w.split('/')[4]);add(item,count);s.global.inventory[key(item)]={item,count,status:'owned'};});
 const jewels={};for(const w of cached('read/base/searchItems?category=jewel')?.items||[]){const[k,n]=w.split('/');if(k.includes(':'))jewels[k]=(jewels[k]||0)+Number(n);}
 for(const ch of party.characters)for(const it of ch.equipment){add(it,1);if(it?.jewel){const k=it.jewel.key+':'+it.jewel.rank;jewels[k]=(jewels[k]||0)+1;}}
 return {s,pool,jewels,e,p};
}
function fromBackup(filename){
 const s=t.hydrateGameState(JSON.parse(t.decodePersistedState(fs.readFileSync(filename,'utf8'))));
 const p=s.parties[0],pool=new Map(),jewels={...s.global.jewels};
 function add(item,count){if(!item||count<1)return;const k=key(item),previous=pool.get(k);if(previous)previous.count+=count;else pool.set(k,{item:{...item,jewel:null,isLocked:false},count});}
 for(const v of Object.values(s.global.inventory))if(v.status==='owned')add(v.item,v.count);
 for(const ch of p.characters)for(const item of ch.equipment){add(item,1);if(item?.jewel){const k=item.jewel.key+':'+item.jewel.rank;jewels[k]=(jewels[k]||0)+1;}}
 const e={destination:p.selectedDungeonId,clearGates:cached('read/observation/expedition')?.expeditionInfo.parties[0].clearGates};
 return {s,pool,jewels,e,p};
}
function role(ch){return [1,6].includes(ch.id)?'tank':ch.id===5?'magic':'ranged';}
function charScore(ch,level,row,dungeon,opts={}){
 const a=t.computeCharacterStats(ch,level,row);
 if(role(ch)==='tank'){
  const hp=t.computeCharacterHpContribution(ch,level).totalHpBonus;
  const cap=opts.defenseCap||Math.max(50,dungeon*190);
  return Math.min(cap,a.physicalDefense)*(opts.physicalWeight||0.9)+Math.min(cap*0.7,a.magicalDefense)*(opts.magicalWeight||0.7)+hp*(opts.hpWeight||0.5)+(1-a.physicalDefenseAmplifier)*cap+(1-a.magicalDefenseAmplifier)*cap*0.5;
 }
 const magic=role(ch)==='magic',raw=magic?a.magicalAttack:a.rangedAttack,n=magic?a.magicalNoA:a.rangedNoA;
 const defense=opts.enemyDefense??(dungeon<=2?10:dungeon*65);
 const decay=Math.min(.98,Math.max(.7,.9+a.accuracyBonus+.035-(dungeon*.001)));
 const stable=magic&&a.abilities.some(x=>x.id==='arcane_stability');
 const hits=stable?Array.from({length:Math.max(0,n)},(_,i)=>Math.max(.55,Math.pow(decay,i))).reduce((s,x)=>s+x,0):(magic?1:a.accuracyPotency)*(1-Math.pow(decay,n))/(1-decay);
 const amp=magic?(1+a.magicalAttackCBonus)*a.magicalOffenseMultiplier:(1+a.rangedAttackCBonus+a.physicalAttackCBonus)*a.physicalOffenseMultiplier;
 const element=opts.element&&a.elementalOffense!==opts.element?0.82:1;
 return Math.max(raw*0.2,raw-defense*(1-a.penetMultiplier))*amp*hits*a.elementalOffenseValue*element;
}
function greedy(input,opts={}){
 const s=structuredClone(input.s),party=s.parties[0],pool=structuredClone(input.pool);
 for(const[id,build]of Object.entries(opts.supportBuilds||{}))Object.assign(party.characters.find(c=>c.id===Number(id)),build);
 const order=opts.order||party.characters.map(x=>x.id);party.characters.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
 for(const ch of party.characters)ch.equipment=[];
 const allocation=opts.allocation||[1,6,4,2,3,5];
 for(const id of allocation){
  const ch=party.characters.find(x=>x.id===id),row=party.characters.indexOf(ch)+1;
  const slots=t.computeCharacterStats(ch,party.level,row).maxEquipSlots;
  const allowed=[...pool.values()].filter(x=>t.canCharacterEquipCategory(ch,x.item.category)&&(!opts.element||role(ch)==='tank'||!x.item.elementalOffense||x.item.elementalOffense===opts.element)&&(role(ch)==='tank'?['armor','shield','robe'].includes(x.item.category):role(ch)==='magic'?['wand','grimoire','catalyst'].includes(x.item.category):['arrow','bolt','archery'].includes(x.item.category)));
  for(let slot=0;slot<slots;slot++){
   let best=null,bestScore=-Infinity;
   for(const candidate of allowed){if(candidate.count<1)continue;ch.equipment.push(candidate.item);const score=charScore(ch,party.level,row,party.selectedDungeonId,opts);ch.equipment.pop();if(score>bestScore){best=candidate;bestScore=score;}}
   if(!best)break;ch.equipment.push({...best.item});best.count--;
  }
  for(let pass=0;pass<2;pass++)for(let slot=0;slot<ch.equipment.length;slot++){
   const old=ch.equipment[slot];let best=null,bestScore=charScore(ch,party.level,row,party.selectedDungeonId,opts);
   for(const candidate of allowed){if(candidate.count<1||key(candidate.item)===key(old))continue;ch.equipment[slot]=candidate.item;const score=charScore(ch,party.level,row,party.selectedDungeonId,opts);if(score>bestScore+0.001){best=candidate;bestScore=score;}}
   ch.equipment[slot]=old;
   if(best){pool.get(key(old)).count++;best.count--;ch.equipment[slot]={...best.item};}
  }
 }
 if(opts.commandWand){
  const ch=party.characters.find(c=>c.id===opts.commandWand);
  const candidate=[...pool.values()].filter(x=>x.count>0&&x.item.id===5407).sort((a,b)=>b.item.enhancement-a.item.enhancement)[0];
  if(candidate){let slot=ch.equipment.length-1;pool.get(key(ch.equipment[slot])).count++;candidate.count--;ch.equipment[slot]={...candidate.item};}
 }
 if(opts.forceIllusionBreaker){
  for(const ch of party.characters.filter(c=>role(c)==='ranged')){
   if(ch.equipment.some(it=>it?.bonuses?.some(b=>b.abilityId==='illusion_breaker')))continue;
   const choices=[...pool.values()].filter(x=>x.count>0&&x.item.bonuses?.some(b=>b.abilityId==='illusion_breaker')).sort((a,b)=>b.item.enhancement-a.item.enhancement);
   if(!choices.length)continue;
   const candidate=choices[0],row=party.characters.indexOf(ch)+1;
   let bestSlot=0,bestScore=-Infinity;
   for(let slot=0;slot<ch.equipment.length;slot++){const old=ch.equipment[slot];ch.equipment[slot]=candidate.item;const score=charScore(ch,party.level,row,party.selectedDungeonId,opts);ch.equipment[slot]=old;if(score>bestScore){bestSlot=slot;bestScore=score;}}
   pool.get(key(ch.equipment[bestSlot])).count++;candidate.count--;ch.equipment[bestSlot]={...candidate.item};
  }
 }
 attachJewels(s,input.jewels,opts);
 return s;
}
function attachJewels(s,jewelInput,opts={}){
 const pool={...jewelInput},p=s.parties[0];
 for(const ch of p.characters)for(const it of ch.equipment)if(it)it.jewel=null;
 for(const jewel of Object.keys(pool).sort((a,b)=>a.localeCompare(b))){
  const[key,rank]=jewel.split(':');
  while(pool[jewel]>0){
   let best=null,bestGain=-Infinity;
   for(let row=0;row<p.characters.length;row++){
    const ch=p.characters[row];if(ch.equipment.some(it=>it?.jewel?.key===key&&it.jewel.rank===Number(rank)))continue;
    if(['might','focus'].includes(key)&&role(ch)!=='ranged'||key==='arcana'&&role(ch)!=='magic'||['fort','ward'].includes(key)&&role(ch)!=='tank')continue;
    const before=charScore(ch,p.level,row+1,p.selectedDungeonId,opts);
    for(let slot=0;slot<ch.equipment.length;slot++){
     const it=ch.equipment[slot];if(!it||it.jewel||!t.isJewelAllowedForCategory(it.category,key))continue;
     it.jewel={key,rank:Number(rank)};const gain=charScore(ch,p.level,row+1,p.selectedDungeonId,opts)-before;it.jewel=null;
     if(gain>bestGain){best=[ch,slot];bestGain=gain;}
    }
   }
   if(!best)break;best[0].equipment[best[1]].jewel={key,rank:Number(rank)};pool[jewel]--;
  }
 }
}
async function simulate(s,count=300,seed=12345){
 const original=globalThis.crypto;
 let randomState=seed>>>0;
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(a){for(let i=0;i<a.length;i++){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;a[i]=randomState>>>0;}return a;}}});
 try{return await t.simulateExpeditionRuns(s,0,'mode.normal',count);}finally{Object.defineProperty(globalThis,'crypto',{configurable:true,value:original});}
}
function describe(s){const p=s.parties[0];return {level:p.level,order:p.characters.map(c=>c.id),hp:t.computePartyStats(p).partyStats.hp,characters:p.characters.map((c,i)=>{const a=t.computeCharacterStats(c,p.level,i+1);return {id:c.id,gear:c.equipment.map(x=>x?wire(x)+(x.jewel?'/'+x.jewel.key+':'+x.jewel.rank:''):'0'),ranged:a.rangedAttack,noa:a.rangedNoA,magic:a.magicalAttack,mnoa:a.magicalNoA,pdef:a.physicalDefense,mdef:a.magicalDefense};})};}
async function apply(c,s,original){
 const next=s.parties[0],old=structuredClone(original.parties[0]);
 const observed={characters:old.characters.map(ch=>({characterId:ch.id,equipment:ch.equipment.map((it,slot)=>it?`${slot}/${wire(it)}${it.jewel?'/'+it.jewel.key+':'+it.jewel.rank:''}`:'0')}))};
 let changedClass=false;
 for(const ch of next.characters){const was=old.characters.find(x=>x.id===ch.id);if(ch.mainClassId!==was.mainClassId||ch.subClassId!==was.subClassId){await c.commit(`build/character/${ch.id}/changeBuild`,{mainClassId:ch.mainClassId,subClassId:ch.subClassId,simulation:false,confirmation:'yes'});changedClass=true;}}
 // Class changes can remove incompatible gear or shrink slot capacity.
 if(changedClass){const view=await c.read('read/observation/party?partyNumber=1');for(const ch of view.partyInfo.party.characters){const was=old.characters.find(x=>x.id===ch.characterId);was.equipment=ch.equipment.map(x=>itemFromWire(x,true));observed.characters.find(x=>x.characterId===ch.characterId).equipment=ch.equipment;}}
 if(next.characters.map(x=>x.id).join()!==old.characters.map(x=>x.id).join())await c.commit('build/party/1',{order:next.characters.map(x=>x.id)});
 const free=new Map(Object.entries(original.global.inventory).filter(([,v])=>v.status==='owned').map(([k,v])=>[k,v.count]));
 const changes=next.characters.filter(ch=>JSON.stringify(ch.equipment.filter(Boolean).map(key).sort())!==JSON.stringify(old.characters.find(x=>x.id===ch.id).equipment.filter(Boolean).map(key).sort()));
 const single=new Map(),diffs=new Map();
 for(const ch of changes){
  const was=old.characters.find(x=>x.id===ch.id),remaining=was.equipment.map((it,slot)=>({it,slot})).filter(x=>x.it),added=[];
  // Preserve a matching jewel-bearing copy when duplicate equipment exists.
  for(const it of [...ch.equipment.filter(Boolean)].sort((a,b)=>Number(Boolean(b.jewel))-Number(Boolean(a.jewel)))){
   let i=remaining.findIndex(x=>key(x.it)===key(it)&&JSON.stringify(x.it.jewel??null)===JSON.stringify(it.jewel??null));
   if(i<0)i=remaining.findIndex(x=>key(x.it)===key(it));
   if(i<0)added.push(it);else remaining.splice(i,1);
  }
  diffs.set(ch.id,{added,removed:remaining.map(x=>x.slot)});
  if(added.length===1&&remaining.length<=1&&(free.get(key(added[0]))||0)>0){
   let slot=remaining.length?remaining[0].slot:was.equipment.findIndex(it=>!it);
   if(slot<0)slot=was.equipment.length;
   single.set(ch.id,{item:added[0],slot});free.set(key(added[0]),free.get(key(added[0]))-1);
  }
 }
 for(const ch of changes){const plan=diffs.get(ch.id);if(!single.has(ch.id)&&plan.removed.length){const result=await c.commit(`build/character/${ch.id}/removeEquipment`,{targetEquipment:plan.removed});observed.characters.find(x=>x.characterId===ch.id).equipment=result.current.equipment;}}
 for(const[id,plan]of single){const result=await c.commit(`build/character/${id}/equip`,{targetEquipment:wire(plan.item),targetSlot:plan.slot});observed.characters.find(x=>x.characterId===id).equipment=result.current.equipment;}
 for(const ch of changes){const plan=diffs.get(ch.id);if(!single.has(ch.id)&&plan.added.length){const result=await c.commit(`build/character/${ch.id}/equip`,{targetEquipment:plan.added.map(wire)});observed.characters.find(x=>x.characterId===ch.id).equipment=result.current.equipment;}}
 // Equip responses provide authoritative slot addresses without another read.
 if(next.characters.some(ch=>ch.equipment.some(it=>it?.jewel))){
  const assignments=[],removals=[],planned=[];
  for(const ch of next.characters){const current=observed.characters.find(x=>x.characterId===ch.id);const used=new Set();for(const it of ch.equipment){if(!it?.jewel)continue;let at=current.equipment.findIndex((v,index)=>!used.has(index)&&key(itemFromWire(v,true))===key(it)&&JSON.stringify(itemFromWire(v,true)?.jewel??null)===JSON.stringify(it.jewel));if(at<0)at=current.equipment.findIndex((v,index)=>!used.has(index)&&key(itemFromWire(v,true))===key(it));if(at<0)throw new Error('Cannot resolve jewel target');used.add(at);const slot=Number(current.equipment[at].split('/')[0]);const assignment={id:ch.id,slot,jewel:it.jewel.key+':'+it.jewel.rank};planned.push(assignment);if(JSON.stringify(itemFromWire(current.equipment[at],true)?.jewel)!==JSON.stringify(it.jewel))assignments.push(assignment);}}
  for(const ch of observed.characters)for(const entry of ch.equipment){
   const it=itemFromWire(entry,true);if(!it?.jewel)continue;const slot=Number(entry.split('/')[0]);
   const jewel=it.jewel.key+':'+it.jewel.rank;
   if(!planned.some(a=>a.id===ch.characterId&&a.slot===slot&&a.jewel===jewel)&&assignments.some(a=>a.jewel===jewel))removals.push({id:ch.characterId,slot});
  }
  for(const a of removals)await c.commit(`build/character/${a.id}/jewelRemove`,{targetEquipment:a.slot});
  for(const a of assignments)await c.commit(`build/character/${a.id}/jewelAttach`,{targetEquipment:a.slot,jewelToSet:a.jewel});
 }
}
module.exports={snapshot,fromBackup,greedy,simulate,describe,apply,attachJewels,charScore,key,wire,cached,t};
if(require.main===module)(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'equipment-optimization';
 if(!process.argv.includes('--cached')){
  await c.read('read/observation/party?partyNumber=1');
  await c.read('read/base/searchItems?state=owned&limit=5000&details=none');
  await c.read('read/base/searchItems?category=jewel&state=owned&limit=5000&details=none');
  if(!process.argv.includes('--no-exp'))await c.read('read/observation/expedition');
 }
 const input=snapshot(),opts=JSON.parse(process.env.BOKEMO_OPT_OPTIONS||'{}');
 const s=greedy(input,opts);const result=await simulate(s,1000);
 console.log(JSON.stringify({build:describe(s),result},null,2));
 fs.writeFileSync(root+'/candidate.json',JSON.stringify(s));
 if(process.argv.includes('--apply'))await apply(c,s,input.s);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
