import {T} from './lib.mjs'; import {stageObjective} from './stageopt.mjs';
await T.ensureLanguageLoaded('en'); const [,,file,dd]=process.argv; const s=T.loadSave(file); const p=s.parties[0]; const chars=[...p.characters];
const obj=stageObjective(+dd,{n:80,seed:5,stop:0.9});
function* perms(a,n=a.length){ if(n===1){yield a.slice();return;} for(let i=0;i<n;i++){ yield* perms(a,n-1); const j=n%2?0:i; [a[n-1],a[j]]=[a[j],a[n-1]]; } }
const res=[]; for(const perm of perms([0,1,2,3,4,5])){ p.characters=perm.map(i=>chars[i]); res.push([await obj(s),perm.map(i=>chars[i].name).join(',')]); }
res.sort((a,b)=>b[0]-a[0]); console.log(res.slice(0,6).map(r=>r[0].toFixed(2)+' '+r[1]).join('\n')); console.log('current',res.find(r=>r[1]===chars.map(c=>c.name).join(','))[0].toFixed(2));
