const fs=require('node:fs');
const {Client}=require('./client.cjs');
const o=require('./optimize.cjs');
function permutations(a){return a.length===0?[[]]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));}
(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'formation-test';
 const backup=await c.commit('setting/backup/export');
 const input=o.fromBackup(c.artifactDir+'/'+backup.artifact),history=[],started=performance.now();
 let best=input.s,score=-1;
 for(const snipers of permutations([4,2,3]))for(const order of [[1,6,...snipers,5],[6,1,...snipers,5],[1,...snipers,6,5],[6,...snipers,1,5]]){
  const s=structuredClone(input.s);s.parties[0].characters.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  const r=await o.simulate(s,700),value=(r.Clear+r.Return)/r.total;
  history.push({order,score:value});if(value>score){best=s;score=value;console.log({order,score});}
 }
 const validation=await o.simulate(best,1500,827361);
 fs.writeFileSync(c.artifactDir+'/formation-'+c.state.revision+'.json',JSON.stringify({checkpoint:backup.artifact,wallMs:performance.now()-started,history,validation,build:o.describe(best)},null,2));
 if(process.argv.includes('--apply'))await o.apply(c,best,input.s);
 fs.writeFileSync(c.artifactDir+'/candidate.json',JSON.stringify(best));
 console.log({score,validationSuccess:(validation.Clear+validation.Return)/validation.total});
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
