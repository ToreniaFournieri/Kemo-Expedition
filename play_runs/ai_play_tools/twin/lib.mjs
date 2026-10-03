// Twin helper library: seeded simulation, pool/slot model, hill-climb optimizer.
import * as T from './twin.mjs';
import { writeFileSync } from 'node:fs';
export { T };
export function seedCrypto(seed){
  let v=(seed>>>0)||0x9e3779b9;
  const orig=globalThis.crypto;
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{
    getRandomValues(a){ for(let i=0;i<a.length;i++){v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;a[i]=v;} return a;},
    randomUUID:()=>orig.randomUUID(), subtle:orig.subtle}});
}
export async function sim(state,pi,n,seed=12345,opts={}){
  seedCrypto(seed);
  const p=state.parties[pi];
  if(opts.dest!=null)p.selectedDungeonId=opts.dest;
  if(opts.depth!=null)p.expeditionDepthLimit=opts.depth;
  return T.simulateExpeditionRuns(state,pi,'mode.normal',n);
}
export function summarize(r){const n=r.total;return {C:r.Clear/n,R:r.Return/n,D:r.Draw/n,Rt:r.Retreat/n,Df:r.Defeat/n,xp:r.totals.experience/n};}
export const fmt=(x)=>(x*100).toFixed(1);
