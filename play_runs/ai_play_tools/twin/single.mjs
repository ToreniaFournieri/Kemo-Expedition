import {T} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s0=T.loadSave(process.argv[2]);
let v=5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
T.withBattleSeedSourceForTesting(()=>(5n<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<8;i++){ const out=T.runExpeditionTransactionForTesting(s0,0,{gameMode:'mode.normal',simulatedAt:1790000000000}); const st=out.state||out; const lg=st.parties[0].lastExpeditionLog; const d=T.buildBattleLogData(lg,1,'x').battleLog; console.log(i,d.finalOutcome,'rooms',d.completedRooms,'startHP',d.rooms[0].startingPartyHp,'max',d.maximumPartyHp,'hpAfterRoom4',d.rooms[3]?.remainingPartyHp,'r20',d.rooms[19]?.startingPartyHp+'>'+d.rooms[19]?.remainingPartyHp); } }));
