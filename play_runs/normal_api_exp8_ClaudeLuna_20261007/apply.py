import t,json,sys
def fmt(k): i,e,s=k.split('-'); return f"0/{i}/{e}/{s}"
def apply(diff,dry=False):
    """diff: [[charId,slot,fromKey,toKey]] -> removeEquipment per char then equip array per char (2 calls/char max)."""
    rem={};add={}
    for cid,slot,fk,tk in diff:
        if fk: rem.setdefault(cid,[]).append(slot)
        if tk: add.setdefault(cid,[]).append(fmt(tk))
    calls=[]
    for cid,slots in rem.items(): calls.append((f'/commit/build/character/{cid}/removeEquipment',{'targetEquipment':sorted(slots)}))
    for cid,items in add.items(): calls.append((f'/commit/build/character/{cid}/equip',{'targetEquipment':items}))
    for path,p in calls:
        if dry: print(path,p); continue
        c,j=t.post(path,p,tag='build'); 
        if c!=200: print('FAIL',c,path,p,json.dumps(j.get('error')))
    return len(calls)
if __name__=='__main__':
    d=json.load(open(sys.argv[1])); print(apply(d,dry=len(sys.argv)>2))
