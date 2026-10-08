import {T,sim,summarize} from '../ai_play_tools/twin/lib.mjs';
const ENH=+(process.env.ENH||2), N=+(process.env.N||60);
const ids=[1102,1110,1105,1106,1108,1112];
const mk=(id)=>T.parseItemFormat(`0/${id}/${ENH}/0`);
const base=T.loadSave('s0.kemoz');
const clone=()=>{const s=T.loadSave('s0.kemoz'); s.parties[0].depthLimit; return s;};
const s0=clone(); const chars=s0.parties[0].characters;
console.log(chars.map(c=>[c.id,c.name,c.mainClassId||c.mainClass,c.autoEquipmentMode]).join(' | '));
const can=(s,ci,id)=>T.canCharacterEquipCategory(s.parties[0].characters[ci],mk(id).category);
console.log(ids.map(id=>id+':'+chars.map((c,ci)=>can(s0,ci,id)?c.id:'-').join('')).join('  '));
// choose subsets of 3 ids and assign each to a char that can equip
const res=[];
function* combos(a,k,st=0,cur=[]){ if(cur.length===k){yield cur.slice();return;} for(let i=st;i<a.length;i++){cur.push(a[i]);yield* combos(a,k,i+1,cur);cur.pop();} }
for(const sub of combos(ids,3)){
  const opts=sub.map(id=>chars.map((c,ci)=>can(s0,ci,id)?ci:-1).filter(x=>x>=0));
  const assigns=[[]]; for(const o of opts){ const n=[]; for(const a of assigns) for(const ci of o) n.push([...a,ci]); assigns.length=0; assigns.push(...n); }
  for(const a of assigns){
    const s=T.loadSave('s0.kemoz'); const cs=s.parties[0].characters; const used=new Array(cs.length).fill(0); let ok=true;
    sub.forEach((id,i)=>{const ci=a[i]; if(used[ci]>=3){ok=false;return;} cs[ci].equipment[used[ci]++]=mk(id);});
    if(!ok) continue;
    s.parties[0].characters=[...cs]; s.parties[0].selectedDungeonId=1; s.parties[0].expeditionDepthLimit='1f-3';
    const r=summarize(await sim(s,0,N,7)); res.push({sub:sub.join('+'),a:a.map(ci=>cs[ci].id).join(''),...r});
  }
}
res.sort((x,y)=>(y.C+y.R)-(x.C+x.R)||y.xp-x.xp);
for(const r of res.slice(0,12)) console.log(JSON.stringify(r));
