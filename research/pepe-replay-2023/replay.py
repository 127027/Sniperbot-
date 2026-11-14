"""Public read-only historical diagnostic; no wallet, orders or bot imports."""
import concurrent.futures as cf
import datetime as dt
import hashlib, json, pathlib, requests, csv, time
ROOT=pathlib.Path(__file__).parent
RAW=ROOT/'daily-raw'; RAW.mkdir(exist_ok=True)
TOKEN='0x6982508145454ce325ddbe47a25d4ec3d2311933'
POOL='0xa43fe16908251ee70ef74718545e4fe6c5ccec9f'
def rpc(method,params):
    r=requests.post('https://eth.drpc.org',json={'jsonrpc':'2.0','id':1,'method':method,'params':params},timeout=25)
    r.raise_for_status(); return r.json()
def day(i):
    date=dt.date(2023,3,14)+dt.timedelta(days=i)
    path=RAW/f'{date}.json'
    if path.exists():
        old=json.loads(path.read_text())
        if not old['errors']: return old
        if old.get('retried'): return old
        (RAW/f'{date}.first-attempt.json').write_text(json.dumps(old,indent=2))
    time.sleep(1.5)
    row={'date':str(date),'retried':path.exists(),'retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'sources':{},'errors':[]}
    try:
        ts=int(dt.datetime.combine(date,dt.time(23,59,59),dt.timezone.utc).timestamp())
        b=requests.get('https://eth.blockscout.com/api',params={'module':'block','action':'getblocknobytime','timestamp':ts,'closest':'before'},timeout=25).json()
        row['sources']['block_lookup']=b
        block=int(b['result']['blockNumber']); row['block']=block
        row['sources']['header']=rpc('eth_getBlockByNumber',[hex(block),False])
        row['sources']['code']=rpc('eth_getCode',[TOKEN,hex(block)])
        if block>=17046833:
            for name,to,data in [('reserves',POOL,'0x0902f1ac'),('owner',TOKEN,'0x8da5cb5b'),('limited',TOKEN,'0x860a32ec'),('token0',POOL,'0x0dfe1681'),('token1',POOL,'0xd21220a7')]:
                row['sources'][name]=rpc('eth_call',[{'to':to,'data':data},hex(block)])
    except Exception as e: row['errors'].append(str(e))
    path.write_text(json.dumps(row,indent=2),encoding='utf-8'); return row
if __name__=='__main__':
    with cf.ThreadPoolExecutor(max_workers=1) as ex: rows=list(ex.map(day,range(62)))
    ledger=[]
    for r in rows:
        s=r['sources']; code=s.get('code',{}).get('result'); reserves=s.get('reserves',{}).get('result')
        record={'date':r['date'],'block':r.get('block'),'decision':'NO_BUY','reason':'DATA_GAP','reserve_pepe':None,'reserve_weth':None,'owner':s.get('owner',{}).get('result'),'limited':s.get('limited',{}).get('result'),'coverage':'UNKNOWN'}
        if code=='0x': record.update(reason='TOKEN_NOT_DEPLOYED',coverage='TOKEN_ABSENT_AT_DAY_END')
        elif reserves and len(reserves)==194:
            words=[int(reserves[2+i*64:2+(i+1)*64],16) for i in range(3)]
            record.update(reserve_pepe=words[0]/1e18,reserve_weth=words[1]/1e18,coverage='END_OF_DAY_STATE',reason='NO_INDEPENDENT_SECURITY_CLEARANCE_OR_ASOF_SOCIAL')
        ledger.append(record)
    (ROOT/'daily-ledger.json').write_text(json.dumps(ledger,indent=2),encoding='utf-8')
    with (ROOT/'daily-ledger.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=ledger[0].keys());w.writeheader();w.writerows(ledger)
    manifest=[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(RAW.glob('*.json'))]
    (ROOT/'daily-manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps({'days':len(ledger),'coverage':{k:sum(r['coverage']==k for r in ledger) for k in sorted(set(r['coverage'] for r in ledger))},'errors':sum(bool(r['errors']) for r in rows)}))
