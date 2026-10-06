import {T} from '/home/user/Kemo-Expedition/play_runs/ai_play_tools/twin/lib.mjs';
const [,,file,pat]=process.argv; const s=T.loadSave(file); const re=new RegExp(pat);
for(const [k,v] of Object.entries(s.global.inventory)) if(v.status==='owned'&&v.count>0&&re.test(String(v.item.id))) console.log('inv',v.item.id,v.item.enhancement,v.item.superRare,'x',v.count);
s.parties.forEach((p,pi)=>p.characters.forEach(c=>c.equipment.forEach((it,si)=>{ if(it&&re.test(String(it.id))) console.log('eq PT'+(pi+1),c.id,si,it.id,it.enhancement,it.superRare,it.jewel?it.jewel.key+it.jewel.rank:''); })));
