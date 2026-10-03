// Equipment hill-climb on the twin. Objective is any async (state)=>number (higher is better).
import {T,seedCrypto} from './lib.mjs';
export const vkey=(it)=>`${it.id}-${it.enhancement}-${it.superRare}`;
export function buildModel(state,pi=0){
  const p=state.parties[pi];
  const pool=new Map(); // vkey -> {item,free}
  for(const [k,v] of Object.entries(state.global.inventory)){ if(v.status==='owned'&&v.count>0) pool.set(vkey(v.item),{item:{...v.item,jewel:null},free:v.count}); }
  // equipment of OTHER parties stays where it is (not pooled); equipped items of this party are re-poolable.
  const jewels={}; for(const [k,v] of Object.entries(state.global.jewels||{})) if(v>0) jewels[k]=v;
  for(const c of p.characters) for(const it of c.equipment) if(it&&it.jewel){ const k=it.jewel.key+':'+it.jewel.rank; jewels[k]=(jewels[k]||0)+1; }
  const slots=p.characters.map((c,i)=>T.computeCharacterStatsInParty(p,i).maxEquipSlots);
  for(const c of p.characters){ c.equipment.forEach((it)=>{ if(!it) return; const k=vkey(it); const e=pool.get(k); if(e) e.free+=0; else pool.set(k,{item:{...it,jewel:null},free:0}); }); }
  return {state,p,pool,slots,jewels:attachCount(jewels,p)};
}
function attachCount(jewels,p){ // jewels[k] = TOTAL; compute free = total - attached
  const free={...jewels}; for(const c of p.characters) for(const it of c.equipment) if(it&&it.jewel){ free[it.jewel.key+':'+it.jewel.rank]--; } return free; }
function free(m,k){return m.pool.get(k).free;}
function jret(m,it){ if(it&&it.jewel){ m.jewels[it.jewel.key+':'+it.jewel.rank]++; } }
export function equipped(m,ci,si){return m.p.characters[ci].equipment[si];}
export function setSlot(m,ci,si,key){ // returns undo fn
  const c=m.p.characters[ci]; const old=c.equipment[si];
  if(old){ m.pool.get(vkey(old)).free++; jret(m,old); }
  if(key){ const e=m.pool.get(key); e.free--; c.equipment[si]={...e.item,jewel:null}; } else c.equipment[si]=null;
  return ()=>{ const cur=c.equipment[si]; if(cur) m.pool.get(vkey(cur)).free++; if(old){ m.pool.get(vkey(old)).free--; c.equipment[si]=old; if(old.jewel) m.jewels[old.jewel.key+':'+old.jewel.rank]--; } else c.equipment[si]=null; };
}
export function canEquip(m,ci,key){ return T.canCharacterEquipCategory(m.p.characters[ci],m.pool.get(key).item.category); }
export function snapshot(m){return m.p.characters.map(c=>c.equipment.map(it=>it?{...it}:null));}
export function restore(m,snap){
  // rebuild pool free counts from scratch
  for(const v of m.pool.values()) v.free=v.base??v.free;
}
export function rng(seed){let v=seed>>>0||1;return()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;};}
export async function climb(m,objective,{iters=300,seed=7,log=console.log,candFilter=null,chars=null}={}){
  const R=rng(seed); let best=await objective(m.state); log('start',best.toFixed(4));
  const cands=[]; for(const k of m.pool.keys()){ const tier=Math.floor(+k.split('-')[0]/1000); const w=Math.max(1,tier*tier); for(let i=0;i<w;i++) cands.push(k); }
  for(let it=0;it<iters;it++){
    const ci=chars?chars[Math.floor(R()*chars.length)]:Math.floor(R()*m.slots.length);
    const si=Math.floor(R()*m.slots[ci]);
    let undo;
    if(R()<0.25){ // swap with another slot
      const cj=Math.floor(R()*m.slots.length), sj=Math.floor(R()*m.slots[cj]);
      const a=equipped(m,ci,si), b=equipped(m,cj,sj); if(!a&&!b) continue;
      if(a&&!canEquip(m,cj,vkey(a))) continue; if(b&&!canEquip(m,ci,vkey(b))) continue;
      const ca=m.p.characters[ci], cb=m.p.characters[cj];
      ca.equipment[si]=b; cb.equipment[sj]=a;
      undo=()=>{ca.equipment[si]=a; cb.equipment[sj]=b;};
    } else {
      const key=cands[Math.floor(R()*cands.length)];
      if(free(m,key)<=0||!canEquip(m,ci,key)) continue;
      if(candFilter&&!candFilter(m,ci,si,key)) continue;
      const cur=equipped(m,ci,si); if(cur&&vkey(cur)===key) continue;
      undo=setSlot(m,ci,si,key);
    }
    const sc=await objective(m.state);
    if(sc>best+1e-9){ best=sc; log('it',it,'->',best.toFixed(4)); } else undo();
  }
  return best;
}
export function diff(before,m){ // before=snapshot(): per char list of [slot,fromKey,toKey]
  const out=[]; m.p.characters.forEach((c,ci)=>{ c.equipment.forEach((it,si)=>{ const b=before[ci][si]; const bk=b?vkey(b):null, ak=it?vkey(it):null; if(bk!==ak) out.push([c.id,si,bk,ak]); }); });
  return out;
}
export function applyDiff(m,diff){
  const idx=new Map(m.p.characters.map((c,i)=>[c.id,i]));
  for(const [cid,si] of diff.map(d=>d)) { const ci=idx.get(cid); const it=m.p.characters[ci].equipment[si]; if(it){ m.pool.get(vkey(it)).free++; m.p.characters[ci].equipment[si]=null; } }
  for(const [cid,si,fk,tk] of diff){ if(!tk) continue; const ci=idx.get(cid); const e=m.pool.get(tk); if(!e||e.free<=0) throw new Error('pool exhausted '+tk); e.free--; m.p.characters[ci].equipment[si]={...e.item,jewel:null}; }
}
// Two-stage hill climb: cheap objective filters, expensive objective confirms (both deterministic via CRN seeds).
export async function climb2(m,quick,confirm,{iters=300,seed=7,log=console.log,chars=null,margin=0.01,minGain=0.002}={}){
  const R=rng(seed); let bq=await quick(m.state), bc=await confirm(m.state); log('start',bq.toFixed(4),bc.toFixed(4));
  const cands=[]; for(const k of m.pool.keys()){ const tier=Math.floor(+k.split('-')[0]/1000); const w=Math.max(1,tier*tier); for(let i=0;i<w;i++) cands.push(k); }
  for(let it=0;it<iters;it++){
    const ci=chars?chars[Math.floor(R()*chars.length)]:Math.floor(R()*m.slots.length);
    const si=Math.floor(R()*m.slots[ci]);
    let undo;
    if(R()<0.2){ undo=jewelMove(m,R); if(!undo) continue; }
    else if(R()<0.3){
      const cj=Math.floor(R()*m.slots.length), sj=Math.floor(R()*m.slots[cj]);
      const a=equipped(m,ci,si), b=equipped(m,cj,sj); if(!a&&!b) continue;
      if(a&&!canEquip(m,cj,vkey(a))) continue; if(b&&!canEquip(m,ci,vkey(b))) continue;
      const ca=m.p.characters[ci], cb=m.p.characters[cj]; ca.equipment[si]=b; cb.equipment[sj]=a; undo=()=>{ca.equipment[si]=a; cb.equipment[sj]=b;};
    } else {
      const key=cands[Math.floor(R()*cands.length)];
      if(free(m,key)<=0||!canEquip(m,ci,key)) continue;
      const cur=equipped(m,ci,si); if(cur&&vkey(cur)===key) continue;
      undo=setSlot(m,ci,si,key);
    }
    const q=await quick(m.state);
    if(q>bq-margin){ const c=await confirm(m.state); if(c>bc+minGain){ bq=q; bc=c; log('it',it,'->',bq.toFixed(4),bc.toFixed(4)); continue; } }
    undo();
  }
  return bc;
}

export function jewelMove(m,R){
  const slotsAll=[]; m.p.characters.forEach((c,ci)=>{ for(let si=0;si<m.slots[ci];si++){ if(c.equipment[si]) slotsAll.push([ci,si]); } });
  if(!slotsAll.length) return null;
  const pick=()=>slotsAll[Math.floor(R()*slotsAll.length)];
  const snapJ={...m.jewels}; const touched=[]; const rec=(it)=>{ touched.push([it,it.jewel?{...it.jewel}:null]); };
  const undo=()=>{ for(const [it,j] of touched.reverse()) it.jewel=j; m.jewels=snapJ; };
  const r=R(); const [ca,sa]=pick(); const A=m.p.characters[ca].equipment[sa];
  const ok=(it,key)=>T.isJewelAllowedForCategory(it.category,key);
  if(r<0.5){ // attach a free jewel
    const keys=Object.keys(m.jewels).filter(k=>m.jewels[k]>0); if(!keys.length) return null;
    const jk=keys[Math.floor(R()*keys.length)]; const [key,rk]=jk.split(':'); if(!ok(A,key)) return null;
    if(A.jewel&&A.jewel.key===key&&A.jewel.rank===+rk) return null;
    rec(A); if(A.jewel) m.jewels[A.jewel.key+':'+A.jewel.rank]++; m.jewels[jk]--; A.jewel={key,rank:+rk}; return undo;
  }
  if(r<0.9){ // move/swap jewel from A to B
    if(!A.jewel) return null; const [cb,sb]=pick(); const B=m.p.characters[cb].equipment[sb]; if(B===A) return null;
    if(!ok(B,A.jewel.key)) return null;
    rec(A); rec(B); const ja=A.jewel, jb=B.jewel; B.jewel=ja;
    if(jb&&ok(A,jb.key)) A.jewel=jb; else { A.jewel=null; if(jb) m.jewels[jb.key+':'+jb.rank]++; }
    return undo;
  }
  if(!A.jewel) return null; rec(A); m.jewels[A.jewel.key+':'+A.jewel.rank]++; A.jewel=null; return undo;
}
export function snapshotJ(m){ return m.p.characters.map(c=>c.equipment.map(it=>it?{key:vkey(it),jewel:it.jewel?it.jewel.key+':'+it.jewel.rank:null}:null)); }
const ifmt=(k)=>{ const [i,e,s]=k.split('-'); return `0/${i}/${e}/${s}`; };
// Build an ordered API call list that turns `before` (snapshotJ at start, with jewel inventory `jewelsStart`) into model m.
export function planCalls(beforeJ,m,jewelsFree0){
  const calls=[]; const free={...jewelsFree0}; // free jewels in inventory at start
  const after=snapshotJ(m);
  m.p.characters.forEach((c,ci)=>{
    const slotsN=Math.max(beforeJ[ci].length,after[ci].length); const rem=[],addBySlot=[];
    for(let si=0;si<slotsN;si++){ const b=beforeJ[ci][si]||null,a=after[ci][si]||null; if((b&&b.key)!==(a&&a.key)){ if(b) rem.push(si); if(a) addBySlot.push([si,a.key]); } }
    c.__rem=rem; c.__add=addBySlot;
  });
  // 1) removals (returns jewels of removed items)
  m.p.characters.forEach((c,ci)=>{ if(c.__rem.length){ calls.push({path:`/commit/build/character/${c.id}/removeEquipment`,params:{targetEquipment:c.__rem}}); for(const si of c.__rem){ const b=beforeJ[ci][si]; if(b&&b.jewel) free[b.jewel]=(free[b.jewel]||0)+1; } } });
  // 2) equips: order by target slot ascending == free slot order
  m.p.characters.forEach((c,ci)=>{ if(c.__add.length){ const emptyOrig=[]; for(let si=0;si<beforeJ[ci].length;si++) if(!beforeJ[ci][si]) emptyOrig.push(si);
      const freeSlots=[...new Set([...c.__rem,...emptyOrig])].sort((x,y)=>x-y); const tgt=c.__add.map(x=>x[0]).sort((x,y)=>x-y);
      const simple=freeSlots.length===tgt.length&&freeSlots.every((v,i)=>v===tgt[i]);
      if(simple){ const items=[...c.__add].sort((x,y)=>x[0]-y[0]).map(x=>ifmt(x[1])); calls.push({path:`/commit/build/character/${c.id}/equip`,params:{targetEquipment:items}}); }
      else { for(const [si,k] of c.__add) calls.push({path:`/commit/build/character/${c.id}/equip`,params:{targetEquipment:ifmt(k),targetSlot:si}}); } } });
  // 3) jewels
  const cur=beforeJ.map((row,ci)=>row.map((x,si)=>{ const keep=x&&after[ci][si]&&after[ci][si].key===x.key; return keep?x.jewel:null; }));
  const need=[]; m.p.characters.forEach((c,ci)=>{ for(let si=0;si<after[ci].length;si++){ const a=after[ci][si]; const want=a?a.jewel:null; if(want!==(cur[ci][si]??null)) need.push({ci,si,want,id:c.id}); } });
  let guard=0; while(need.length&&guard++<200){ let progressed=false;
    for(let i=0;i<need.length;i++){ const n=need[i];
      if(n.want===null){ calls.push({path:`/commit/build/character/${n.id}/jewelRemove`,params:{targetEquipment:n.si}}); const old=cur[n.ci][n.si]; if(old) free[old]=(free[old]||0)+1; cur[n.ci][n.si]=null; need.splice(i,1); progressed=true; break; }
      if((free[n.want]||0)>0){ calls.push({path:`/commit/build/character/${n.id}/jewelAttach`,params:{targetEquipment:n.si,jewelToSet:n.want}}); free[n.want]--; const old=cur[n.ci][n.si]; if(old) free[old]=(free[old]||0)+1; cur[n.ci][n.si]=n.want; need.splice(i,1); progressed=true; break; } }
    if(!progressed) throw new Error('jewel plan stuck '+JSON.stringify(need)); }
  return calls;
}
function saveModel(m){ return {eq:m.p.characters.map(c=>c.equipment.map(it=>it?{...it,jewel:it.jewel?{...it.jewel}:null}:null)),pool:[...m.pool].map(([k,v])=>[k,v.free]),jewels:{...m.jewels}}; }
function loadModel(m,sv){ m.p.characters.forEach((c,i)=>{ c.equipment=sv.eq[i].map(it=>it?{...it,jewel:it.jewel?{...it.jewel}:null}:null); }); for(const [k,f] of sv.pool) m.pool.get(k).free=f; m.jewels={...sv.jewels}; }
// Simulated annealing with the same moves; temperature on the confirm score. Restores the best state found.
export async function anneal(m,quick,confirm,{iters=3000,seed=7,log=console.log,T0=0.03,minGain=0.002,chars=null}={}){
  const R=rng(seed); let bq=await quick(m.state), bc=await confirm(m.state); let best=bc, bestSave=saveModel(m); log('start',bq.toFixed(4),bc.toFixed(4));
  const cands=[]; for(const k of m.pool.keys()){ const tier=Math.floor(+k.split('-')[0]/1000); const w=Math.max(1,tier*tier); for(let i=0;i<w;i++) cands.push(k); }
  for(let it=0;it<iters;it++){
    const Tm=T0*(1-it/iters);
    const ci=chars?chars[Math.floor(R()*chars.length)]:Math.floor(R()*m.slots.length);
    const si=Math.floor(R()*m.slots[ci]); let undo;
    if(R()<0.2){ undo=jewelMove(m,R); if(!undo) continue; }
    else if(R()<0.3){ const cj=Math.floor(R()*m.slots.length), sj=Math.floor(R()*m.slots[cj]); const a=equipped(m,ci,si), b=equipped(m,cj,sj); if(!a&&!b) continue;
      if(a&&!canEquip(m,cj,vkey(a))) continue; if(b&&!canEquip(m,ci,vkey(b))) continue; const ca=m.p.characters[ci], cb=m.p.characters[cj]; ca.equipment[si]=b; cb.equipment[sj]=a; undo=()=>{ca.equipment[si]=a; cb.equipment[sj]=b;}; }
    else { const key=cands[Math.floor(R()*cands.length)]; if(free(m,key)<=0||!canEquip(m,ci,key)) continue; const cur=equipped(m,ci,si); if(cur&&vkey(cur)===key) continue; undo=setSlot(m,ci,si,key); }
    const q=await quick(m.state);
    if(q>bq-0.01-Tm){ const c=await confirm(m.state); if(c>bc+minGain-Tm*R()*2){ bq=q; bc=c; if(c>best+minGain){ best=c; bestSave=saveModel(m); log('it',it,'best',best.toFixed(4)); } continue; } }
    undo();
  }
  loadModel(m,bestSave); return best;
}

// ---------------- Genetic algorithm ----------------
// Genome = per character slot list of {k: variant key, j: 'key:rank'|null}. Pool totals are fixed (free + equipped at start).
function totals(m){ const t={}; for(const [k,v] of m.pool) t[k]=v.free; for(const c of m.p.characters) for(const it of c.equipment) if(it) t[vkey(it)]=(t[vkey(it)]||0)+1; return t; }
export function encode(m){ return m.p.characters.map((c,ci)=>{ const row=[]; for(let si=0;si<m.slots[ci];si++){ const it=c.equipment[si]; row.push(it?{k:vkey(it),j:it.jewel?it.jewel.key+':'+it.jewel.rank:null}:null);} return row; }); }
export function decode(m,g,tot,jtot,R){ // apply genome with repair; fills dropped/invalid slots randomly from the pool
  const left={...tot}; const jl={...jtot};
  m.p.characters.forEach((c,ci)=>{ c.equipment=new Array(m.slots[ci]).fill(null); });
  const holes=[];
  g.forEach((row,ci)=>{ row.forEach((gene,si)=>{ if(!gene){ return; } const ok=left[gene.k]>0 && canEquip(m,ci,gene.k); if(!ok){ holes.push([ci,si]); return; } left[gene.k]--; const it={...m.pool.get(gene.k).item,jewel:null}; if(gene.j&&jl[gene.j]>0){ const [key,rk]=gene.j.split(':'); if(T.isJewelAllowedForCategory(it.category,key)){ it.jewel={key,rank:+rk}; jl[gene.j]--; } } m.p.characters[ci].equipment[si]=it; }); });
  const keys=[...m.pool.keys()];
  for(const [ci,si] of holes){ for(let t=0;t<30;t++){ const k=keys[Math.floor(R()*keys.length)]; if(left[k]>0&&canEquip(m,ci,k)){ left[k]--; m.p.characters[ci].equipment[si]={...m.pool.get(k).item,jewel:null}; break; } } }
  for(const k of keys) m.pool.get(k).free=left[k];
  m.jewels=jl;
}
export async function genetic(m,quick,confirm,{pop=24,gens=40,seed=7,log=console.log,elite=3,mutRate=0.35,nMut=3,tourn=3}={}){
  const R=rng(seed); const tot=totals(m); const jtot={}; for(const [k,v] of Object.entries(m.jewels)) jtot[k]=v; for(const c of m.p.characters) for(const it of c.equipment) if(it&&it.jewel){ const k=it.jewel.key+':'+it.jewel.rank; jtot[k]=(jtot[k]||0)+0; }
  // m.jewels holds FREE counts; add attached ones to get totals
  const jt={...m.jewels}; for(const c of m.p.characters) for(const it of c.equipment) if(it&&it.jewel){ const k=it.jewel.key+':'+it.jewel.rank; jt[k]=(jt[k]||0)+1; }
  const g0=encode(m);
  const mutate=(g)=>{ decode(m,g,tot,jt,R); const n=1+Math.floor(R()*nMut); for(let i=0;i<n;i++){ const ci=Math.floor(R()*m.slots.length), si=Math.floor(R()*m.slots[ci]); const r=R();
      if(r<0.25){ const u=jewelMove(m,R); }
      else if(r<0.45){ const cj=Math.floor(R()*m.slots.length), sj=Math.floor(R()*m.slots[cj]); const a=equipped(m,ci,si), b=equipped(m,cj,sj); if((a||b)&&(!a||canEquip(m,cj,vkey(a)))&&(!b||canEquip(m,ci,vkey(b)))){ m.p.characters[ci].equipment[si]=b; m.p.characters[cj].equipment[sj]=a; } }
      else { const keys=[...m.pool.keys()]; const tier=(k)=>Math.floor(+k.split('-')[0]/1000); const cand=[]; for(const k of keys){ if(free(m,k)>0&&canEquip(m,ci,k)) for(let w=0;w<Math.max(1,tier(k)**2);w++) cand.push(k);} if(cand.length) setSlot(m,ci,si,cand[Math.floor(R()*cand.length)]); } }
    return encode(m); };
  const cross=(a,b)=>{ const child=a.map((row,ci)=> (R()<0.5?a[ci]:b[ci]).map(x=>x?{...x}:null)); // per-character uniform
    if(R()<0.5){ const ci=Math.floor(R()*child.length); for(let si=0;si<child[ci].length;si++) if(R()<0.5) child[ci][si]=(b[ci][si]?{...b[ci][si]}:null); } // slot-level mixing inside one character
    return child; };
  const evalQ=async(g)=>{ decode(m,g,tot,jt,R); return quick(m.state); };
  // initial population: seed + mutants
  let P=[{g:g0}]; while(P.length<pop){ P.push({g:mutate(P[Math.floor(R()*P.length)].g)}); }
  for(const ind of P){ ind.q=await evalQ(ind.g); }
  let best=null; 
  for(let gen=0;gen<gens;gen++){
    P.sort((a,b)=>b.q-a.q);
    // confirm top few with the expensive objective
    for(const ind of P.slice(0,elite+2)){ if(ind.c===undefined){ decode(m,ind.g,tot,jt,R); ind.c=await confirm(m.state); } }
    const top=P.filter(x=>x.c!==undefined).sort((a,b)=>b.c-a.c)[0];
    if(!best||top.c>best.c){ best={g:top.g,c:top.c}; log('gen',gen,'best confirm',best.c.toFixed(4),'quick',top.q.toFixed(4)); }
    const next=P.slice(0,elite).map(x=>({g:x.g,q:x.q,c:x.c}));
    const pick=()=>{ let b=null; for(let i=0;i<tourn;i++){ const x=P[Math.floor(R()*P.length)]; if(!b||x.q>b.q) b=x; } return b; };
    while(next.length<pop){ let g=cross(pick().g,pick().g); if(R()<mutRate) g=(decode(m,g,tot,jt,R),mutate(g)); next.push({g}); }
    for(const ind of next){ if(ind.q===undefined) ind.q=await evalQ(ind.g); }
    P=next;
  }
  decode(m,best.g,tot,jt,R); return best.c;
}
