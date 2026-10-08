import t,json,sys,time
# mon.py days stepsec : step and log every sideQuest change of every party (compact), stats every 10 days
days=int(sys.argv[1]); sec=int(sys.argv[2]); n=days*86400//sec; per10=10*86400//sec
L=open('sq_monitor.log','a'); last={}
def log(s): L.write(s+'\n'); L.flush()
def stats(tag):
    out={}
    for p in range(1,7):
        c,j=t.gg(f'/read/observation/party?partyNumber={p}',tag='party-sq')
        if c==200: out[p]=j['data']['partyInfo']['party']['sideQuestStatistics']
    log('STATS '+tag+' '+json.dumps(out))
stats('day0')
for i in range(1,n+1):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    if c!=200: log('ERR %s %s'%(i,json.dumps(j)[:300])); break
    c,j=t.gg('/read/observation/compact',tag='compact')
    for p in j['data']['partyInfo']:
        k=p['party']['partyNumber']; sq=p['sideQuest']; cg=p['clearGate']
        if last.get(k,('x',))[0]!=(sq or '')[:0]+str(sq).split(':')[0]  or (sq and last[k][1]!=sq):
            log(f"d{i*sec/86400:6.2f} PT{k} lv{p['party']['level']} dest{p['lastDestination']} gate={cg} quest={sq}")
        last[k]=(str(sq).split(':')[0],sq)
    if i%per10==0: stats('day%d'%(i*sec//86400))
stats('final'); log('DONE')
