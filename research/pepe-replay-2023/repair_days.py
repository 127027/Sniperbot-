import replay as r
import datetime as dt,json,time,requests
original_rpc=r.rpc
def paced_rpc(method,params):
    time.sleep(1)
    return original_rpc(method,params)
r.rpc=paced_rpc
cache={}
def header(n):
    if n not in cache:
        x=requests.post('https://ethereum-rpc.publicnode.com',json={'jsonrpc':'2.0','id':1,'method':'eth_getBlockByNumber','params':[hex(n),False]},timeout=25).json()
        if not x.get('result'): raise RuntimeError(str(x))
        cache[n]=x
    return cache[n]
def stamp(n): return int(header(n)['result']['timestamp'],16)
def before(t):
    lo,hi=16700000,17290000
    while hi-lo>1:
        a,b=stamp(lo),stamp(hi)
        n=max(lo+1,min(hi-1,lo+int((t-a)*(hi-lo)/(b-a))))
        if stamp(n)<=t: lo=n
        else: hi=n
    return lo
for i in range(62):
    date=dt.date(2023,3,14)+dt.timedelta(days=i);path=r.RAW/f'{date}.json'
    row=json.loads(path.read_text())
    if not row['errors']: continue
    if row.get('rpc_fallback'): continue
    row['rpc_fallback']=True;row['prior_errors']=row['errors'];row['errors']=[]
    try:
        ts=int(dt.datetime.combine(date,dt.time(23,59,59),dt.timezone.utc).timestamp())
        n=before(ts);row['block']=n
        s=row['sources'];s['header']=header(n);s['next_header']=header(n+1)
        assert stamp(n)<=ts<stamp(n+1)
        s['code']=r.rpc('eth_getCode',[r.TOKEN,hex(n)])
        if n>=17046833:
            for name,to,data in [('reserves',r.POOL,'0x0902f1ac'),('owner',r.TOKEN,'0x8da5cb5b'),('limited',r.TOKEN,'0x860a32ec'),('token0',r.POOL,'0x0dfe1681'),('token1',r.POOL,'0xd21220a7')]:
                s[name]=r.rpc('eth_call',[{'to':to,'data':data},hex(n)])
        row['retrieved_at']=dt.datetime.now(dt.timezone.utc).isoformat()
    except Exception as e: row['errors'].append(str(e))
    path.write_text(json.dumps(row,indent=2))
    print(date,'OK' if not row['errors'] else row['errors'],flush=True)
