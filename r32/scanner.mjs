// Local, read-only Solana discovery pilot. No trading or risk approvals.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {USDC, WSOL} from './providers.mjs';

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const TTL = 86400000;
const LIMIT = 2000;
const numeric = x => x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x)) ? Number(x) : null;
const valid = x => typeof x === 'string' && MINT.test(x) && x !== USDC && x !== WSOL;
const gt = 'https://api.geckoterminal.com/api/v2/networks/solana/';
const ds = 'https://api.dexscreener.com/';
export const sources = [
  {url:gt+'new_pools?page=1',kind:'new_pool'},
  {url:gt+'new_pools?page=2',kind:'new_pool'},
  {url:gt+'trending_pools?page=1',kind:'trending'},
  {url:ds+'token-profiles/latest/v1',kind:'profile'},
  {url:ds+'token-boosts/latest/v1',kind:'boost'}
];
export function extract(j, src) {
  if (src.kind === 'new_pool' || src.kind === 'trending') {
    if (!Array.isArray(j?.data)) throw Error('INVALID_POOL_RESPONSE');
    return j.data.flatMap(p => {
      const id = p.relationships?.base_token?.data?.id;
      const address = typeof id === 'string' && id.startsWith('solana_') ? id.slice(7) : null;
      const a=p.attributes??{}, pool=a.address??(typeof p.id==='string'&&p.id.startsWith('solana_')?p.id.slice(7):null);
      const price=numeric(a.base_token_price_usd), liquidity=numeric(a.reserve_in_usd);
      const market=typeof pool==='string'&&MINT.test(pool)&&price>0&&liquidity!==null&&liquidity>=0?{
        symbol:null,pool,price_usd:price,liquidity_usd:liquidity,volume_1h_usd:numeric(a.volume_usd?.h1),
        change_5m_pct:numeric(a.price_change_percentage?.m5),change_1h_pct:numeric(a.price_change_percentage?.h1),
        buys_5m:numeric(a.transactions?.m5?.buys),sells_5m:numeric(a.transactions?.m5?.sells),
        pair_created_at:Number.isFinite(Date.parse(a.pool_created_at))?Date.parse(a.pool_created_at):null,
        provider_quote_time:null,risk:'UNKNOWN',sellability:'UNKNOWN',status:'INDICATIVE_NOT_EXECUTABLE',
        market_source:src.url
      }:null;
      return valid(address) ? [{address,source:src.url,kind:src.kind,...(market?{market}:{})}] : [];
    });
  }
  if (!Array.isArray(j)) throw Error('INVALID_PROFILE_RESPONSE');
  return j.filter(p=>p.chainId==='solana' && valid(p.tokenAddress))
    .map(p=>({address:p.tokenAddress,source:src.url,kind:src.kind}));
}
export function upsert(universe, x, now) {
  if (!valid(x.address)) return;
  const old = universe.get(x.address);
  const seed=x.market&&(!old?.market||now-(old.last_refresh??0)>300000||old.market.liquidity_usd==null)&&(!old?.market?.pool||old.market.pool===x.market.pool||now-(old.last_refresh??0)>300000);
  universe.set(x.address, {
    ...old, chain:'solana', address:x.address,
    first_seen:old?.first_seen ?? now, last_seen:now,
    last_attempt:old?.last_attempt ?? 0, last_refresh:old?.last_refresh ?? 0,
    sources:[...new Set([...(old?.sources??[]),x.source])],
    discovery_kinds:[...new Set([...(old?.discovery_kinds??[]),x.kind])],
    promoted:old?.promoted===true || x.kind==='boost',
    meme_status:'UNVERIFIED',
    ...(seed?{market:{...x.market,retrieved_at:new Date(now).toISOString()},last_refresh:now,last_error:undefined}:{})
  });
}
export function prune(universe, now, limit=LIMIT) {
  for (const [id,c] of universe) if (now-c.last_seen>TTL) universe.delete(id);
  const sorted=[...universe.values()].sort((a,b)=>b.last_seen-a.last_seen);
  for (const c of sorted.slice(limit)) universe.delete(c.address);
}
export function nextBatch(universe,n=60,now=Date.now()) {
  const rows=[...universe.values()].sort((a,b)=>a.last_attempt-b.last_attempt||a.first_seen-b.first_seen);
  const priority=rows.filter(c=>c.dot_priority_until>now&&now-c.last_attempt>=60000).slice(0,Math.floor(n/3));
  const ids=new Set(priority.map(c=>c.address));
  return [...priority,...rows.filter(c=>!ids.has(c.address))].slice(0,n);
}
export function normalize(address,pairs,now) {
  const p=pairs.filter(x=>x.chainId==='solana' && x.baseToken?.address===address &&
    typeof x.pairAddress==='string' && MINT.test(x.pairAddress) && numeric(x.priceUsd)>0)
    .sort((a,b)=>(numeric(b.liquidity?.usd)??0)-(numeric(a.liquidity?.usd)??0))[0];
  if(!p) return null;
  return {symbol:p.baseToken.symbol??null,pool:p.pairAddress,price_usd:numeric(p.priceUsd),
    liquidity_usd:numeric(p.liquidity?.usd),volume_1h_usd:numeric(p.volume?.h1),
    change_5m_pct:numeric(p.priceChange?.m5),change_1h_pct:numeric(p.priceChange?.h1),
    buys_5m:numeric(p.txns?.m5?.buys),sells_5m:numeric(p.txns?.m5?.sells),
    pair_created_at:numeric(p.pairCreatedAt),retrieved_at:new Date(now).toISOString(),
    provider_quote_time:null,risk:'UNKNOWN',sellability:'UNKNOWN',
    status:'INDICATIVE_NOT_EXECUTABLE'};
}
export class Scanner {
  constructor({fetcher=fetch,clock=Date.now,universe=new Map(),backoff={}}={}) {
    this.fetcher=fetcher; this.clock=clock; this.universe=universe; this.backoff=backoff;
    this.errors=[]; this.receipts=[]; this.busy=false;
  }
  async request(url) {
    const host=new URL(url).hostname, now=this.clock();
    if((this.backoff[host]??0)>now) throw Error('RATE_BACKOFF '+host);
    const r=await this.fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{accept:'application/json'}});
    if(r.status===429) {
      const raw=r.headers?.get('retry-after'), sec=Number(raw);
      const delay=raw && Number.isFinite(sec)?Math.max(60,sec)*1000:Math.max(60000,Date.parse(raw)-now||0);
      this.backoff[host]=now+delay;
    }
    if(!r.ok) throw Error('HTTP '+r.status+' '+host);
    return r.json();
  }
  async cycle() {
    if(this.busy) return {status:'BUSY'};
    this.busy=true; this.errors=[]; this.receipts=[];
    try {
      for(const src of sources) {
        try {
          const leads=extract(await this.request(src.url),src);
          for(const lead of leads) upsert(this.universe,lead,this.clock());
          this.receipts.push({url:src.url,at:new Date(this.clock()).toISOString(),leads:leads.length});
        } catch(e) {this.errors.push({url:src.url,error:String(e.message)});}
      }
      prune(this.universe,this.clock());
      const batch=nextBatch(this.universe,60,this.clock());
      for(let i=0;i<batch.length;i+=30) {
        const group=batch.slice(i,i+30);
        const url=ds+'tokens/v1/solana/'+group.map(c=>c.address).join(',');
        // A backoff skip does not count as an attempted refresh.
        if((this.backoff['api.dexscreener.com']??0)>this.clock()) break;
        for(const c of group) c.last_attempt=this.clock();
        try {
          const pairs=await this.request(url);
          if(!Array.isArray(pairs)) throw Error('INVALID_PAIRS_RESPONSE');
          for(const c of group) {
            const at=this.clock(), row=normalize(c.address,pairs,at);
            if(row) {
              // A null DEX liquidity reading is not a zero and must not erase
              // a fresh observation of the same pool. Preserve the complete
              // original snapshot (including its timestamp), not a mixed row.
              const keep=row.liquidity_usd===null&&c.market?.pool===row.pool&&
                c.market.liquidity_usd!==null&&c.market.liquidity_usd!==undefined&&
                at-c.last_refresh<=300000;
              if(!keep){c.market=row;c.last_refresh=at;}
              delete c.last_error;
            }
            else if(!(c.market?.market_source?.includes('geckoterminal')&&at-c.last_refresh<=300000))
              c.last_error='NO_EXACT_BASE_POOL';
          }
          this.receipts.push({url,at:new Date(this.clock()).toISOString(),requested:group.length,
            matched:group.filter(c=>!c.last_error).length});
        } catch(e) {
          for(const c of group) c.last_error=String(e.message);
          this.errors.push({url,error:String(e.message)});
        }
      }
      return this.snapshot();
    } finally {this.busy=false;}
  }
  snapshot() {
    const now=this.clock();
    const entries=[...this.universe.values()].map(c=>({...c,
      market_stale:!c.market || !!c.last_error || now-c.last_refresh>300000}));
    return {mode:'PAPER_ONLY',scope:'SOLANA_DISCOVERY_PILOT',ts:Math.floor(now/1000),
      candidates:entries,backoff:this.backoff,errors:this.errors,receipts:this.receipts,
      coverage:{identities:entries.length,fresh_market:entries.filter(c=>!c.market_stale).length},
      status:'OBSERVATION_ONLY'};
  }
}
export async function runLocalScanner(dir,once=false) {
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'universe.json');
  const saved=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{candidates:[],backoff:{}};
  const scanner=new Scanner({universe:new Map(saved.candidates.filter(c=>valid(c.address)).map(c=>[c.address,c])),backoff:saved.backoff});
  do {
    const result=await scanner.cycle();
    fs.writeFileSync(file+'.tmp',JSON.stringify(result,null,2));
    fs.renameSync(file+'.tmp',file);
    console.log(JSON.stringify({ts:result.ts,coverage:result.coverage,errors:result.errors}));
    if(!once) await new Promise(r=>setTimeout(r,60000));
  } while(!once);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const dir=process.env.R32_DATA_DIR||path.join(process.env.LOCALAPPDATA||os.homedir(),'MemeSniperR32');
  await runLocalScanner(dir,process.argv.includes('--once'));
}
