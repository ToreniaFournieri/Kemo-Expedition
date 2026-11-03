import {Client,runDir} from './client.mjs';import fs from 'node:fs';const c=new Client();
const d=Number(process.argv[2]);await c.commit('expedition/1/changeExpedition',{destination:d,destinationMode:'fixed',depthLimit:'all',difficultyOffset:0});
const p=Number(process.argv[3]||0);if(p){const obs=await c.read('observation/party',{partyNumber:p});fs.writeFileSync(runDir+`/side${p}.json`,JSON.stringify(obs));const ids=obs.partyInfo?.parties?.[0]?.characters?.map(x=>x.characterId) || [];console.log('side keys',Object.keys(obs),JSON.stringify(obs).slice(0,500));}
