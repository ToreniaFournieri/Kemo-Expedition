import t,re,json
# gate.py : streak math (9.1.3 levelProbe conquest) + one-call meters.
# A Clear-Gate opens after k consecutive successful runs; Draw/Retreat/Defeat reset the streak, a shallower Return does not.
# expectedRuns = E(k) - E(c), E(j) = (1 - p^j) / ((1 - p) p^j). The boss is k = 1, c = 0.
SLOTLV=[3,6,10,14,19,24,30,36,43,50,57,65]   # 2.1.1.1 f.equipment_slots unlock levels
def E(p,j):
    if j<=0: return 0.0
    if p<=0: return float('inf')
    if p>=1: return float(j)
    return (1-p**j)/((1-p)*p**j)
def expected_runs(p,k,c=0): return max(0.0,E(p,k)-E(p,min(c,k)))
def meter(obj='success',n=300,P=1,seed=5):
    """simulationRun on the current build (1 call). Returns (rate, route success fraction, overview)."""
    c,j=t.rpost(f'/read/expedition/{P}/simulationRun',{'numberOfRun':n,'objective':obj,'seed':seed},tag='meter')
    if c!=200: print('  METER ERR',c,json.dumps(j)[:200],flush=True); return None,None,''
    d=j['data']; m=re.search(r'Success ([0-9.]+)%',d.get('overview') or '')
    return d.get('rate'),(round(float(m.group(1))/100,4) if m else None),d.get('overview')
def slot_crossed(lv_from,lv_to):
    return lv_from is not None and lv_to is not None and any(lv_from<L<=lv_to for L in SLOTLV)
def fmt(e): return 'inf' if e==float('inf') else f'{e:.1f}'
