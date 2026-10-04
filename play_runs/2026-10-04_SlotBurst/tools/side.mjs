import {Client} from './client.mjs';import {T} from '../../ai_play_tools/twin/lib.mjs';
const [file,num]=process.argv.slice(2);const s=T.loadSave(file),c=new Client();const p=s.parties[+num-1];for(const x of p.characters)await c.commit(`build/character/${x.id}/autoEquipment`,{mode:'FULL',immediateAutoEquipment:true});console.log('side configured',num,p.characters.map(x=>x.id));
