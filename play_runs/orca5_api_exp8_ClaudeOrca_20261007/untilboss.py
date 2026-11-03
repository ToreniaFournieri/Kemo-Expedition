import t,sys
D=int(sys.argv[1]); sec=int(sys.argv[2]); mx=int(sys.argv[3])
for i in range(mx):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    c,k=t.gg('/read/observation/expedition'); pp=k['data']['expeditionInfo']['parties'][0]; g=[x['kind']+str(x.get('dungeonId')) for x in pp['clearGates']]
    print(j['data']['inGameTime'][:16],g,flush=True)
    if D==8:
        import subprocess; t.export_save('fin.kemoz'); o=subprocess.run(['node','defe.mjs','fin.kemoz'],capture_output=True,text=True).stdout; print(o.strip(),flush=True)
        if '"8":true' in o: print('BOSS DONE'); break
        continue
    if not any(x=='entryGate'+str(D+1) for x in g) and not any(x.startswith('bossGate') for x in g): print('BOSS DONE'); break
