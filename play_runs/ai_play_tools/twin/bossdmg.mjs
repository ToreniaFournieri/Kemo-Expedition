import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
await T.ensureLanguageLoaded('en');
const [,,file,plan,dd,N]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan&&plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const p=s.parties[0]; p.selectedDungeonId=+dd; for(let g=1;g<=6;g++) p.clearGateStatus[+dd*1000+g*10+4]=true; p.clearGateStatus[+dd*1000+604]=true; p.expeditionDepthLimit='all';
let v=3; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
let n=0, arr=0, fr=[], res={};
T.withBattleSeedSourceForTesting(()=>(3n<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<+(N||100);i++){ const out=T.simulateApiSortieBatchForTesting(s,0,1,'mode.normal',1790000000000+i,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; n++; const br=bd.rooms.find(r=>r.roomType==='battle_Boss'); if(br){ arr++; fr.push(Math.min(1,br.damageDealt/br.enemyMaximumHp)); res[br.outcome]=(res[br.outcome]||0)+1; if(arr===1) console.log('boss',br.enemyId,'HP',br.enemyMaximumHp); } } }));
fr.sort((a,b)=>a-b); console.log('runs',n,'boss arrivals',arr,'damage frac mean',(fr.reduce((a,b)=>a+b,0)/Math.max(1,fr.length)).toFixed(3),'median',fr[Math.floor(fr.length/2)]?.toFixed(3),'max',fr[fr.length-1]?.toFixed(3),JSON.stringify(res));
