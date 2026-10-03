import {T} from './lib.mjs'; import {gateObjective} from './gate.mjs';
await T.ensureLanguageLoaded('en'); const [,,file,dd,f,N]=process.argv; const s=T.loadSave(file); const p=s.parties[0]; const chars=[...p.characters];
const obj=gateObjective({d:+dd,f:+f,N:+(N||60),seed:5,wProg:0.3});
function* perms(a,n=a.length){ if(n===1){yield a.slice();return;} for(let i=0;i<n;i++){ yield* perms(a,n-1); const j=n%2?0:i; [a[n-1],a[j]]=[a[j],a[n-1]]; } }
const res=[]; for(const perm of perms([0,1,2,3,4,5])){ p.characters=perm.map(i=>chars[i]); const sc=await obj(s); res.push([sc,perm.map(i=>chars[i].id).join(','),gateObjective.last.succ]); }
res.sort((a,b)=>b[0]-a[0]); console.log(res.slice(0,8).map(r=>r[0].toFixed(2)+' '+r[1]+' succ '+r[2].toFixed(2)).join('\n')); console.log('current',res.find(r=>r[1]===chars.map(c=>c.id).join(','))[0].toFixed(2));
