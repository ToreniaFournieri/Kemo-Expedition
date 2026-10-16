import json,copy,sys
# replay build-layer changes (race/gender, classes, lineage, predisposition, order, deity) from batch_calls.jsonl
C={1:dict(race='kemoria',g='male',main='guardian',sub='samurai',lin='unascertained',pred='none'),
   2:dict(race='vulpinian',g='female',main='duelist',sub='pilgrim',lin='sandstorm',pred='aggressive'),
   3:dict(race='leporian',g='female',main='ranger',sub='ninja',lin='abyssal_sea',pred='inquisitive'),
   4:dict(race='procyonian',g='male',main='ninja',sub='striker',lin='firmament',pred='evasive'),
   5:dict(race='cervin',g='female',main='wizard',sub='alchemist',lin='utopia',pred='introspective'),
   6:dict(race='caninian',g='female',main='sage',sub='alchemist',lin='pioneer',pred='none')}
P={'order':[1,2,3,4,5,6],'deity':'restoration'}
MS={89:'D1',218:'D2',348:'D3',794:'D4',1052:'D5',1613:'D6',2125:'D7',2506:'D8'}
def cb(cid,p):
    c=C[cid]
    if 'racesAndGender' in p: c['race'],c['g']=p['racesAndGender'].split('/')
    for k,f in (('mainClassId','main'),('subClassId','sub'),('lineage','lin'),('predisposition','pred')):
        if k in p: c[f]=p[k]
def party(p):
    if 'order' in p: P['order']=p['order']
    if 'deityId' in p: P['deity']=p['deityId']
def ep(path,p):
    s=path.strip('/').split('/')
    if s[-1]=='changeBuild': cb(int(s[-2]),p)
    elif s[-2:-1]==['party'] and s[-1]=='1': party(p)
out=[]
for l in open(sys.argv[1]):
    r=json.loads(l)
    if r['status']==200 and r['method']=='POST' and r['path'].startswith('/commit'):
        p=r.get('parameters') or {}
        if r['path'].endswith('applyBuildChanges'):
            for ch in p.get('changes',[]): ep(ch['endpoint'],ch['parameters'])
        else: ep(r['path'],p)
    for m,name in MS.items():
        if r['n']==m: out.append((name,m,copy.deepcopy(C),dict(P)))
for name,m,c,p in out:
    print(f"## {name} (call {m}) deity={p['deity']} order={p['order']}")
    for cid in p['order']:
        x=c[cid]; print(f"  {cid}: {x['race']}/{x['g']} {x['main']}/{x['sub']} lineage={x['lin']} pred={x['pred']}")
