import fs from 'node:fs';
import { Client } from './client.mjs';
const args=process.argv.slice(2);
const file=args.find(x=>!x.startsWith('--'));
if(!file)throw new Error('Usage: node replay.mjs calls.jsonl --from=1 --to=10 --user=FreshUser --dry-run');
const option=(name,fallback)=>args.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const from=Number(option('from','1')),to=Number(option('to','Infinity'));
const records=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(x=>x.call>=from&&x.call<=to&&x.status<400);
const user=option('user',null);
const steps=records.map(x=>({label:`replay original call ${x.call}: ${x.label}`,route:x.route,parameters:x.method==='GET'?x.query:x.body?.parameters??x.body??{}}));
if(user)for(const step of steps)if(['/fundamental/signUp','/fundamental/logIn'].includes(step.route))step.parameters={...step.parameters,userId:user};
if(args.includes('--dry-run'))console.log(JSON.stringify({requests:steps.length,steps},null,2));
else {const c=new Client();await c.batch(steps);}
