const fs=require('node:fs');
const {Client}=require('./client.cjs');
const o=require('./optimize.cjs');
(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'caster-tuning';
 const backup=await c.commit('setting/backup/export');
 const input=o.fromBackup(c.artifactDir+'/'+backup.artifact),history=[];
 let best=input.s;const baseline=await o.simulate(best,1000);let bestScore=(baseline.Clear+baseline.Return)/baseline.total;
 const defenses=input.e.destination===8?[800,1300,1800]:[500,770,1000];
 for(const [mainClassId,subClassId] of [['wizard','alchemist'],['alchemist','wizard'],['alchemist','alchemist'],['wizard','wizard']])for(const enemyDefense of defenses){
  // Local tuning must reserve every item and jewel on unchanged characters.
  const prepared={...input,s:structuredClone(input.s),pool:structuredClone(input.pool),jewels:{...input.jewels}};
  for(const ch of input.p.characters.filter(x=>x.id!==5))for(const it of ch.equipment){
   if(!it)continue;
   prepared.pool.get(o.key(it)).count--;
   if(it.jewel)prepared.jewels[it.jewel.key+':'+it.jewel.rank]--;
  }
  prepared.s.parties[0].characters.find(x=>x.id===5).mainClassId=mainClassId;
  prepared.s.parties[0].characters.find(x=>x.id===5).subClassId=subClassId;
  const all=o.greedy(prepared,{allocation:[5],element:input.e.destination===8?'thunder':'fire',enemyDefense});
  const s=structuredClone(input.s);s.parties[0].characters[s.parties[0].characters.findIndex(x=>x.id===5)]=all.parties[0].characters.find(x=>x.id===5);
  const r=await o.simulate(s,1000);const score=(r.Clear+r.Return)/r.total;
  history.push({mainClassId,subClassId,enemyDefense,score,build:o.describe(s)});
  console.log({mainClassId,subClassId,enemyDefense,score});if(score>bestScore){best=s;bestScore=score;}
 }
 const validation=await o.simulate(best,1000,923456);
 fs.writeFileSync(c.artifactDir+'/caster-tuning-'+c.state.revision+'.json',JSON.stringify({checkpoint:backup.artifact,baseline,history,validation},null,2));
 if(process.argv.includes('--apply'))await o.apply(c,best,input.s);
 fs.writeFileSync(c.artifactDir+'/candidate.json',JSON.stringify(best));
 console.log({bestScore,validation:validation.Clear+validation.Return});
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
