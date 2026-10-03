import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd,f,doPerm]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const obj=wallObjective({d:+dd,f:+f,N:60,seed:1});
const p=s.parties[0]; const chars=[...p.characters];
const base=await obj(s); console.log('base',base.toFixed(3),p.deity.name, JSON.stringify(wallObjective.last));
const rd=[];
for(const name of s.global.unlockedDeities){ p.deity={...p.deity,name}; rd.push([await obj(s),name]); }
rd.sort((a,b)=>b[0]-a[0]); console.log(rd.map(r=>r[0].toFixed(3)+' '+r[1]).join('\n'));
p.deity={...p.deity,name:rd[0][1]};
if(doPerm){
function* perms(a,n=a.length){ if(n===1){yield a.slice();return;} for(let i=0;i<n;i++){ yield* perms(a,n-1); const j=n%2?0:i; [a[n-1],a[j]]=[a[j],a[n-1]]; } }
const res=[]; for(const perm of perms([0,1,2,3,4,5])){ p.characters=perm.map(i=>chars[i]); res.push([await obj(s),perm.map(i=>chars[i].name).join(',')]); }
res.sort((a,b)=>b[0]-a[0]); console.log(res.slice(0,5).map(r=>r[0].toFixed(3)+' '+r[1]).join('\n'));}
