// Bounded final progression; public observations only, official export on victory.
import {Client,runDir} from './client.mjs';
import {T} from './twin/tw.mjs';
import fs from 'node:fs';
const c=new Client();
for(let i=0;i<Number(process.argv[2]||6);i++){
 await c.commit('progress/elapsed',{elapsedSeconds:3600});
 const d=await c.read('observation/expedition');
 fs.writeFileSync(runDir+'/exp.json',JSON.stringify(d));
 const p=d.expeditionInfo.parties.find(p=>p.partyNumber===1);
 console.log(JSON.stringify({clock:c.s.inGameTime,calls:c.s.calls,out:p.disclosedOutcome,g:p.clearGates}));
 if(p.disclosedOutcome==='Clear'||p.clearGates.some(g=>g.kind==='godGate')||p.controls.godsBattle.available){
  await c.exportSave(runDir+'/victory.kemoz');
  const s=T.loadSave(runDir+'/victory.kemoz');
  if(s.parties[0].defeatedBossExpeditions[8]){console.log('VERIFIED BOSS 8 DEFEATED');break;}
  console.log('Boss flag still false; continue');
 }
}
