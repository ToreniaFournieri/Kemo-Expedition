const fs=require('node:fs');
const {Client}=require('./client.cjs');
const o=require('./optimize.cjs');
(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'support-tuning';
 const backup=await c.commit('setting/backup/export'),input=o.fromBackup(c.artifactDir+'/'+backup.artifact);
 const prepared={...input,pool:structuredClone(input.pool),jewels:{...input.jewels}};
 for(const ch of input.p.characters.filter(x=>![1,6].includes(x.id)))for(const it of ch.equipment){
  if(!it)continue;prepared.pool.get(o.key(it)).count--;
  if(it.jewel)prepared.jewels[it.jewel.key+':'+it.jewel.rank]--;
 }
 const baseline=await o.simulate(input.s,1000);let best=input.s,score=(baseline.Clear+baseline.Return)/baseline.total;
 const history=[],started=performance.now();
 for(const order of [[1,6,4,2,3,5],[6,1,4,2,3,5],[1,4,2,3,6,5]])for(const defenseCap of [1000,1500,2000,2500,3000])for(const hpWeight of [.1,.5]){
  const opts={allocation:[1,6],order,physicalWeight:3,magicalWeight:.7,defenseCap,hpWeight};
  const all=o.greedy(prepared,opts),s=structuredClone(input.s);
  for(const id of [1,6])s.parties[0].characters[s.parties[0].characters.findIndex(x=>x.id===id)]=all.parties[0].characters.find(x=>x.id===id);
  s.parties[0].characters.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  const r=await o.simulate(s,1000),value=(r.Clear+r.Return)/r.total;
  history.push({opts,score:value,hp:o.describe(s).hp});if(value>score){score=value;best=s;console.log({opts,score,hp:o.describe(s).hp});}
 }
 const validation=await o.simulate(best,2000,738296);
 fs.writeFileSync(c.artifactDir+'/support-tuning-'+c.state.revision+'.json',JSON.stringify({checkpoint:backup.artifact,wallMs:performance.now()-started,baseline,history,validation,build:o.describe(best)},null,2));
 if(process.argv.includes('--apply'))await o.apply(c,best,input.s);
 fs.writeFileSync(c.artifactDir+'/candidate.json',JSON.stringify(best));
 console.log({score,validationSuccess:(validation.Clear+validation.Return)/validation.total});
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
