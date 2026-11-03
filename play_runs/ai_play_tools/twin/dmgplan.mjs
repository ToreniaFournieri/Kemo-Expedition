// usage: dmgplan.mjs save d N plan [RACEenv] -> boss-only dmg for plan (SIDE env honoured)
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {bossOnlyObjective} from './bossonly.mjs'; import {readFileSync} from 'node:fs'; import {applyRace} from './race.mjs';
await T.ensureLanguageLoaded('en');
const [,,file,dd,N,plan]=process.argv; const s=T.loadSave(file); applyRace(s); const m=O.buildModel(s,0);
if(plan&&plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
await bossOnlyObjective({d:+dd,N:+N,seed:5,reachN:100})(s); console.log(JSON.stringify(bossOnlyObjective.last));
