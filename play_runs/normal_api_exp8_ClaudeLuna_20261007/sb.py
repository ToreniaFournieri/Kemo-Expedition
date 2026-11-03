import t,sys,json
# sb.py N : up to N sorties, stop at first non-Clear/Return/Retreat outcome
n=int(sys.argv[1]) if len(sys.argv)>1 else 9
for i in range(n):
    c,j=t.post('/commit/expedition/1/sortie',{}); d=j.get('data') or {}
    print(c,d.get('outcome'),len(d.get('rewards',[])),(j.get('error') or {}).get('code'))
    if c!=200 or d.get('outcome') not in ('Clear','Return','Retreat'): break
import st; st.o()
