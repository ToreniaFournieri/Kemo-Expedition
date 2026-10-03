import {T} from './lib.mjs'; import * as O from './opt.mjs';
const s=T.loadSave(process.argv[2]); const m=O.buildModel(s,0);
const byCat={};
for(const [k,v] of m.pool){ const it=v.item; (byCat[it.category]??=[]).push([k,v.free,it]); }
for(const [cat,arr] of Object.entries(byCat)){
  console.log('==',cat,arr.length);
  arr.sort((a,b)=>+a[0].split('-')[0]-+b[0].split('-')[0]);
  console.log(arr.map(([k,f,it])=>`${k}x${f}`+(it.rangedAttack?`[R${it.rangedAttack}]`:it.magicalAttack?`[M${it.magicalAttack}]`:it.meleeAttack?`[ME${it.meleeAttack}]`:it.physicalDefense?`[PD${it.physicalDefense}]`:it.magicalDefense?`[MD${it.magicalDefense}]`:'')).join(' '));
}
