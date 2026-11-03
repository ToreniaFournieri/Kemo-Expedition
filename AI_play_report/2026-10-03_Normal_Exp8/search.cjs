const fs=require('node:fs');
const {Client}=require('./client.cjs');
const o=require('./optimize.cjs');
async function search(input,budget=60){
 let best=input.s,bestResult=await o.simulate(best,400),bestScore=(bestResult.Clear+bestResult.Return)/bestResult.total;
 const history=[];
 const orders=[[6,1,4,2,3,5],[1,6,4,2,3,5],[1,4,2,3,6,5],[6,4,2,3,1,5]];
 const dungeon=input.e.destination;
 const elements=dungeon===7?['fire']:dungeon===8?['thunder']:dungeon===6?['fire','none']:['none','ice','fire'];
 for(const order of orders)for(const element of elements)for(const weights of [{},{hpWeight:2,defenseCap:dungeon*95},{hpWeight:1,physicalWeight:0.5,magicalWeight:1.5}]){
  const opts={order,element:element==='none'?undefined:element,...weights,...(process.env.BOKEMO_SEARCH_BOSS==='1'?{enemyDefense:dungeon*110}:{}),...(process.env.BOKEMO_SEARCH_BOSS==='1'&&dungeon===6?{forceIllusionBreaker:true}:{})};
  const s=o.greedy(input,opts),r=await o.simulate(s,400),score=(r.Clear+r.Return)/r.total;
  history.push({kind:'structured',opts,score});
  if(score>bestScore){best=s;bestScore=score;console.log('Structured',bestScore,opts);}
 }
 const random=(()=>{let x=7623;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};})();
 const pool=[...input.pool.values()];
 for(let i=0;i<budget;i++){
  const s=structuredClone(best),p=s.parties[0],ci=Math.floor(random()*6),ch=p.characters[ci],slot=Math.floor(random()*ch.equipment.length);
  if(random()<.22){
   const cj=Math.floor(random()*6),ch2=p.characters[cj],slot2=Math.floor(random()*ch2.equipment.length);
   const a=ch.equipment[slot],b=ch2.equipment[slot2];
   if(!a||!b||!o.t.canCharacterEquipCategory(ch,b.category)||!o.t.canCharacterEquipCategory(ch2,a.category))continue;
   [ch.equipment[slot],ch2.equipment[slot2]]=[b,a];
  }else{
   const candidate=pool[Math.floor(random()*pool.length)];if(!candidate||!o.t.canCharacterEquipCategory(ch,candidate.item.category))continue;
   let count=candidate.count;for(const c of p.characters)for(const it of c.equipment)if(o.key(it)===o.key(candidate.item))count--;
   if(count<1)continue;ch.equipment[slot]={...candidate.item,jewel:null};
  }
  o.attachJewels(s,input.jewels);
  const r=await o.simulate(s,400),score=(r.Clear+r.Return)/r.total;
  if(score>bestScore){best=s;bestScore=score;history.push({kind:'local',i,score,build:o.describe(s)});console.log('Local',i,score);}
 }
 const validation=await o.simulate(best,1000,984136);
 return {best,bestScore,validation,history};
}
module.exports={search};
if(require.main===module)(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'joint-equipment-search';
 let backup;
 const checkpoint=process.argv.find(x=>x.startsWith('--checkpoint='))?.slice(13);
 if(checkpoint)backup={artifact:checkpoint};
 else if(process.argv.includes('--backup'))backup=await c.commit('setting/backup/export');
 else if(!process.argv.includes('--cached')){
  await c.read('read/observation/party?partyNumber=1');
  await c.read('read/base/searchItems?state=owned&limit=5000&details=none');
  await c.read('read/base/searchItems?category=jewel&state=owned&limit=5000&details=none');
 }
 const input=backup?o.fromBackup(c.artifactDir+'/'+backup.artifact):o.snapshot(),start=performance.now();
 if(process.env.BOKEMO_SEARCH_BOSS==='1')input.s.parties[0].clearGateStatus[input.e.destination*1000+604]=true;
 const result=await search(input,Number(process.env.BOKEMO_SEARCH_BUDGET||80));
 const report={phase:c.phase,checkpoint:backup?.artifact,wallMs:performance.now()-start,revision:c.state.revision,bestScore:result.bestScore,validation:result.validation,history:result.history,build:o.describe(result.best)};
 fs.writeFileSync(c.artifactDir+'/search-'+c.state.revision+'.json',JSON.stringify(report,null,2));
 fs.writeFileSync(c.artifactDir+'/candidate.json',JSON.stringify(result.best));
 console.log(JSON.stringify({wallMs:report.wallMs,build:report.build,validation:{Clear:result.validation.Clear,Return:result.validation.Return,Draw:result.validation.Draw,Retreat:result.validation.Retreat,Defeat:result.validation.Defeat}}));
 if(process.argv.includes('--apply'))await o.apply(c,result.best,input.s);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
