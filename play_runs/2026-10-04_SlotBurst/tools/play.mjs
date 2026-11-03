import fs from 'node:fs';
import {Client,runDir} from './client.mjs';
const c=new Client(); const [op,...args]=process.argv.slice(2);
if(op==='setup'){
 const s=await c.call('/fundamental/signUp',{userId:'SlotBurst1004',environment:'prod',gameMode:'normal',language:'en'});
 fs.writeFileSync(runDir+'/start.json',JSON.stringify(s)); await c.login();
 const bs=[{id:1,mainClassId:'lord',subClassId:'lord'},{id:6,mainClassId:'guardian',subClassId:'guardian'},...([2,4].map(id=>({id,racesAndGender:'ursan/'+(id===2?'female':'male'),mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'}))),{id:3,mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'},{id:5,mainClassId:'alchemist',subClassId:'wizard',lineage:'utopia',predisposition:'introspective'}];
 for(const {id,...b} of bs) await c.commit(`build/character/${id}/changeBuild`,{...b,simulation:false,confirmation:'yes'});
 await c.commit('build/party/1',{order:[6,1,4,2,3,5],deityId:'precision'});
 for(const id of [1,2,3,4,5,6]) await c.commit(`build/character/${id}/autoEquipment`,{mode:'FULL',immediateAutoEquipment:true});
 console.log(s);
}else if(op==='step'){
 for(let i=0;i<Number(args[0]||1);i++) await c.commit('progress/elapsed',{elapsedSeconds:Number(args[1]||43200)});
 const d=await c.read('observation/expedition'); fs.writeFileSync(runDir+'/exp.json',JSON.stringify(d));
 console.log('clock',c.s.inGameTime,'calls',c.s.calls);
 for(const p of d.expeditionInfo.parties)console.log(JSON.stringify({p:p.partyNumber,d:p.destination,out:p.disclosedOutcome,hp:p.currentHp,max:p.maximumHp,stock:p.chargeStock,sortie:p.controls.sortie,g:p.clearGates}));
}else if(op==='export'){await c.exportSave(runDir+'/'+(args[0]||'snapshot.kemoz'));console.log('exported',args[0],c.s.calls);}
else if(op==='call'){let d=await c.call(args[0],JSON.parse(args[1]||'{}'));console.log(JSON.stringify(d).slice(0,12000));}
