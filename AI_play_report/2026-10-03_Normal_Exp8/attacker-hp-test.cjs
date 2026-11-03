const fs=require('node:fs');
const {Client}=require('./client.cjs');
const o=require('./optimize.cjs');
(async()=>{
 const c=new Client();c.phase=process.env.BOKEMO_PHASE||'attacker-hp-test';
 const backup=await c.commit('setting/backup/export'),input=o.fromBackup(c.artifactDir+'/'+backup.artifact);
 const baseline=await o.simulate(input.s,1200);let best=input.s,score=(baseline.Clear+baseline.Return)/baseline.total;
 const history=[],started=performance.now();
 for(const order of [[1,6,4,2,3,5],[6,1,4,2,3,5],[1,4,2,3,6,5]])for(const slots of [1,2,3,4])for(const includeMage of [false,true]){
  const s=structuredClone(input.s),p=s.parties[0],free=structuredClone(input.pool);
  p.characters.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  for(const ch of p.characters)for(const it of ch.equipment)if(it)free.get(o.key(it)).count--;
  for(const id of (includeMage?[4,2,3,5]:[4,2,3])){
   const ch=p.characters.find(x=>x.id===id),row=p.characters.indexOf(ch)+1,used=new Set();
   for(let n=0;n<(id===5?1:slots);n++){
    let move,proxy=-Infinity;
    const beforeHp=o.t.computeCharacterHpContribution(ch,p.level).totalHpBonus;
    const beforeDamage=o.charScore(ch,p.level,row,8,{element:'thunder',enemyDefense:800});
    for(const v of free.values()){
     if(v.count<1||!o.t.canCharacterEquipCategory(ch,v.item.category)||!v.item.vitalityBonus)continue;
     for(let slot=0;slot<ch.equipment.length;slot++){
      if(used.has(slot))continue;
      const old=ch.equipment[slot];if(old.jewel||old.vitalityBonus||old.elementalOffense&&old.elementalOffense!=='none')continue;
      ch.equipment[slot]=v.item;
      const hp=o.t.computeCharacterHpContribution(ch,p.level).totalHpBonus-beforeHp;
      const damage=o.charScore(ch,p.level,row,8,{element:'thunder',enemyDefense:800})/beforeDamage;
      ch.equipment[slot]=old;
      const value=hp/Math.max(.025,1-damage);if(value>proxy){proxy=value;move={slot,v,old};}
     }
    }
    if(!move)break;used.add(move.slot);free.get(o.key(move.old)).count++;move.v.count--;ch.equipment[move.slot]={...move.v.item};
   }
  }
  const r=await o.simulate(s,1200),value=(r.Clear+r.Return)/r.total;
  history.push({order,slots,includeMage,score:value,hp:o.describe(s).hp});if(value>score){score=value;best=s;console.log(history.at(-1));}
 }
 const validation=await o.simulate(best,2000,852731);
 fs.writeFileSync(c.artifactDir+'/attacker-hp-'+c.state.revision+'.json',JSON.stringify({checkpoint:backup.artifact,wallMs:performance.now()-started,baseline,history,validation,build:o.describe(best)},null,2));
 if(process.argv.includes('--apply'))await o.apply(c,best,input.s);
 fs.writeFileSync(c.artifactDir+'/candidate.json',JSON.stringify(best));
 console.log({score,validationSuccess:(validation.Clear+validation.Return)/validation.total});
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
