import * as T from './twin.mjs';
const s=T.loadSave(process.argv[2]);const p=s.parties[0];
console.log('exp',p.experience,'level',p.level,'gold',s.global.gold,'deityDon',JSON.stringify(s.global.deityDonations),'unlockedDeities',JSON.stringify(s.global.unlockedDeities));
console.log('gates',JSON.stringify(p.clearGateProgress),JSON.stringify(p.clearGateStatus));
const inv=s.global.inventory;let n=0;for(const k in inv){n+=inv[k].count}console.log('invCount',n,Object.keys(inv).length);
