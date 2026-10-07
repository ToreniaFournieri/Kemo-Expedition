import t,json,sys
def run(planfile):
    calls=json.load(open(planfile))['calls']; bad=0
    for c in calls:
        code,j=t.post(c['path'],c['params'],tag='build')
        if code!=200: bad+=1; print('FAIL',code,c['path'],c['params'],json.dumps(j.get('error'))[:150])
    return len(calls),bad
if __name__=='__main__': print(run(sys.argv[1]))
