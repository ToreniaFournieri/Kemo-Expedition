// usage: dmgspec.mjs save d N "label|RACESPEC|ORDER|DEITY" ...   boss-only damage fraction & kills
import {T} from './lib.mjs'; import {bossOnlyObjective} from './bossonly.mjs'; import {applyRace} from './race.mjs';
await T.ensureLanguageLoaded('en');
const [,,file,dd,N,...vs]=process.argv;
for(const v of ['base|||',...vs]){ const [label,spec,order,deity]=v.split('|'); const s=T.loadSave(file);
  if(order) process.env.ORDER=order; else delete process.env.ORDER; if(deity) process.env.DEITY=deity; else delete process.env.DEITY;
  applyRace(s,spec||undefined);
  await bossOnlyObjective({d:+dd,N:+N,seed:5,reachN:60})(s); console.log(label.padEnd(18),JSON.stringify(bossOnlyObjective.last)); }
