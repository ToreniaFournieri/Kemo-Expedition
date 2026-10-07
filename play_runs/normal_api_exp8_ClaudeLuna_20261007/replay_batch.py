#!/usr/bin/env python3
"""Replay a recorded batch (play_runs/<run>/batch_calls.json) against a fresh account and compare call durations.

usage: BOKEMO_PLAY_DIR=<workspace with desc.json> BOKEMO_PLAY_USER=ReplayBot python3 replay_batch.py batch_calls.json [--skip-export] [--limit N]

The recorded run used one real game; a replay on a fresh account reaches different states (random drops), so build calls
that name items the new account does not own will answer 409 illegal_action. Those still exercise validation + commit
paths, which is what a performance comparison needs. Elapsed steps and reads are state independent. The script prints
per-endpoint mean/p95 of the replay next to the recorded durations.
"""
import json,sys,time,collections,statistics,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import t
def pct(v,p): v=sorted(v); return v[min(len(v)-1,int(len(v)*p))] if v else 0
def key(c):
    parts=c['path'].split('/'); 
    return c['method']+' '+('/'.join(parts[:3])+'/character/{id}/'+parts[-1] if '/character/' in c['path'] else '/'.join(parts[:4]))
def main():
    a=sys.argv[1:]; batch=json.load(open(a[0])); calls=batch['calls']
    limit=int(a[a.index('--limit')+1]) if '--limit' in a else len(calls)
    t.signup(); t.login()
    rec=collections.defaultdict(list); new=collections.defaultdict(list); errs=collections.Counter()
    for c in calls[:limit]:
        if c['path'].startswith('/fundamental/') : continue
        if c['path']=='/commit/setting/backup/export' and '--skip-export' in a: continue
        t0=time.time()
        if c['method']=='GET': code,j=t.gg(c['path'])
        elif c['path'].endswith('/simulationRun'): code,j=t.rpost(c['path'],c.get('parameters') or {})
        elif c['path']=='/commit/setting/backup/export': code,_=t.export_save(os.devnull)
        else: code,j=t.post(c['path'],c.get('parameters') or {})
        ms=(time.time()-t0)*1000
        rec[key(c)].append(c['ms']); new[key(c)].append(ms)
        if code>=400: errs[key(c)]+=1
    print(f"{'endpoint':58} {'n':>4} {'rec mean':>9} {'new mean':>9} {'new p95':>8} {'err':>4}")
    for k,v in sorted(new.items(),key=lambda x:-sum(x[1])):
        print(f"{k:58} {len(v):4d} {statistics.mean(rec[k]):9.1f} {statistics.mean(v):9.1f} {pct(v,.95):8.1f} {errs[k]:4d}")
    print('total ms recorded',round(sum(sum(v) for v in rec.values())),'replayed',round(sum(sum(v) for v in new.values())))
if __name__=='__main__': main()
