import t,json,sys,os
# repro_slot.py: does gaSearch fill a free, useful equipment slot? (seeded, deterministic)
# env: CID=2 (character to test) DEST=8 OBJ=bossDamage SEEDS=1,2,3,4,5,6 EFFORT=medium SCOPE=global
# 1) empty CID's last slot  2) measure the current build (no-op search, fixed seed)  3) re-run seed 1 twice (determinism)
# 4) one GA per seed: does changeSummary equip CID's empty slot?  5) controls: measure with candidates in the slot
# 6) put the original item back.  Every gaSearch uses timeBudgetSeconds 300 so it ends by generation count, not by CPU time.
CID=int(os.environ.get('CID','2')); DEST=os.environ.get('DEST','8'); OBJ=os.environ.get('OBJ','bossDamage')
SEEDS=[int(x) for x in os.environ.get('SEEDS','1,2,3,4,5,6').split(',')]; EFF=os.environ.get('EFFORT','medium')
SCOPE=os.environ.get('SCOPE','global'); MSEED=777
def must(c,j,what):
    if c!=200: print('ERR',what,c,json.dumps(j)[:400]); sys.exit(1)
    return j['data']
def equipment():
    d=must(*t.gg(f'/read/build/character/equipment?characterId={CID}'),'equipment')['characters'][0]
    return d['current']['equipment'],d['validOptions']['numberOfEmptyEquipmentSlots']
def body(comp,seed,extra=None):
    gp={'effort':EFF,'seed':seed,'timeBudgetSeconds':300}; gp.update(extra or {})
    return {'targets':[{'characterId':c,'changeableComponents':{k:True for k in comp}} for c in range(1,7)],
            'considerOrderChange':False,'considerDeityChange':'none','considerItemsScope':SCOPE,'objective':OBJ,'gaParameters':gp}
def measure(label):
    # no changeable component -> no search, only the verification forecast of the current build on a fixed seed
    d=must(*t.rpost('/read/build/party/1/gaSearch',body([],MSEED,{'verifyRuns':1000})),'measure')
    v=d['verification']; print(f'  MEASURE {label:28s} {OBJ}={v["before"]:.4f}  ({d["forecast"]["before"]})',flush=True); return v['before']
def search(seed):
    d=must(*t.rpost('/read/build/party/1/gaSearch',body(['equipment','jewels'],seed)),'search')
    cs=d['changeSummary']; fill=[e for e in cs if e['endpoint']==f'commit/build/character/{CID}/equip' and e['parameters'].get('targetSlot')==EMPTY]
    v=d.get('verification',{})
    return {'seed':seed,'verdict':d['verdict'],'evals':d['evaluations'],'sec':d['elapsedSeconds'],'before':round(v.get('before',0),4),'after':round(v.get('after',0),4),
            'changes':len(cs),'fillsEmptySlot':fill[0]['parameters']['targetEquipment'] if fill else None,'hash':hash(json.dumps(cs,sort_keys=True))}
must(*t.post('/commit/expedition/1/changeExpedition',{'destination':int(DEST),'destinationMode':'fixed'}),'dest')
must(*t.post('/commit/expedition/1/changeExpedition',{'depthLimit':'all'}),'depth')
eq,empty=equipment(); last=[e for e in eq if e.count('/')>=3][-1]; EMPTY=int(last.split('/')[0]); orig='/'.join(last.split('/')[1:5])
print('char',CID,'slots',len(eq),'empty before',empty,'-> emptying slot',EMPTY,'item',orig,flush=True)
must(*t.post(f'/commit/build/character/{CID}/removeEquipment',{'targetEquipment':[EMPTY]}),'remove')
base=measure('slot empty')
r1=search(SEEDS[0]); r1b=search(SEEDS[0])
print('  DETERMINISM seed',SEEDS[0],'identical' if (r1['hash'],r1['evals'],r1['after'])==(r1b['hash'],r1b['evals'],r1b['after']) else 'DIFFERENT',r1['evals'],r1b['evals'],flush=True)
res=[r1]+[search(s) for s in SEEDS[1:]]
for r in res: print('  GA',json.dumps(r),flush=True)
print('  fill rate',sum(1 for r in res if r['fillsEmptySlot']),'/',len(res),flush=True)
for cand in [orig]+[x for x in os.environ.get('CANDS','').split(',') if x]:
    c,j=t.post(f'/commit/build/character/{CID}/equip',{'targetEquipment':cand,'targetSlot':EMPTY})
    if c!=200: print('  cannot equip',cand,(j.get('error') or {}).get('code')); continue
    m=measure('slot = '+cand); print(f'    gain vs empty: {100*(m-base):+.2f} pt',flush=True)
    must(*t.post(f'/commit/build/character/{CID}/removeEquipment',{'targetEquipment':[EMPTY]}),'remove')
must(*t.post(f'/commit/build/character/{CID}/equip',{'targetEquipment':orig,'targetSlot':EMPTY}),'restore')
print('restored',orig,'calls',t.calls())
