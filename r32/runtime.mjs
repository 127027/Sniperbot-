// R32 local pilot: deterministic scanning, virtual orders, independent monitoring.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Scanner,upsert,normalize} from './scanner.mjs';
import {inspectMint} from './risk.mjs';
import {fxReference,roundTrip,routeQuote,USDC} from './providers.mjs';
import {decide,qualify,applyBuy,monitor,paperBudgetRaw} from './decision.mjs';
import {fresh,identity} from './paper.mjs';
import {Recorder} from './recorder.mjs';
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const iso=t=>new Date(t).toISOString();
const rank=c=>Math.max(-50,Math.min(200,Number.isFinite(c.market.change_1h_pct)?c.market.change_1h_pct:0))/200+
  Math.log10(1+c.market.volume_1h_usd)/10+Math.log10(1+c.market.liquidity_usd)/10-(c.promoted?0.1:0);
const recent=(t,n,max)=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=n&&n-Date.parse(t)<=max;
export function atomic(file,value){
  fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2));
  fs.renameSync(file+'.tmp',file);
}
function read(file,fallback){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function safeUrl(s){try{return new URL(s).protocol==='https:';}catch{return false;}}
export function narrativeMap(feed,now){
  const map=new Map();
  if(feed?.mode!=='PAPER_ONLY'||!Array.isArray(feed.leads))return map;
  for(const x of feed.leads){
    if(x.chain!=='solana'||!MINT.test(x.address??'')||x.meme_classification!=='MEME'||
      !safeUrl(x.classification_source)||!recent(x.observed_at,now,3600000)||
      typeof x.classification_reason!=='string'||!x.classification_reason.trim())continue;
    // A sourced research classification, NOT on-chain risk clearance.
    const prev=map.get(x.address);
    if(!prev||Date.parse(x.observed_at)>Date.parse(prev.meme_observed_at))map.set(x.address,{
      meme_status:'VERIFIED_MEME',meme_source:x.classification_source,meme_observed_at:x.observed_at,
      classification_reason:x.classification_reason});
  }
  return map;
}
// One request queue per provider, with exit requests ahead of entry requests.
// Limits are conservative pilot defaults, not a guarantee of provider entitlement.
export function gatedFetch(fetcher=fetch){
  const hosts=new Map();
  return (url,opts={},priority=0)=>new Promise((resolve,reject)=>{
    const host=new URL(url).hostname;
    if(!hosts.has(host))hosts.set(host,{queue:[],running:false,next:0});
    const h=hosts.get(host);h.queue.push({url,opts,priority,resolve,reject});
    if(h.running)return;
    h.running=true;
    void (async()=>{
      try{
        while(h.queue.length){
          await new Promise(r=>setTimeout(r,Math.max(0,h.next-Date.now())));
          h.queue.sort((a,b)=>b.priority-a.priority);
          const q=h.queue.shift();
          try{
            // Start timeout after rate-limit queue, not while waiting in queue.
            const r=await fetcher(q.url,{...q.opts,signal:AbortSignal.timeout(10000)});
            h.next=Date.now()+(host==='api.jup.ag'?2200:host==='api.mainnet-beta.solana.com'?1100:250);
            if(r.status===429){
              const v=r.headers?.get('retry-after'), seconds=Number(v);
              h.next=Date.now()+Math.max(60000,v&&Number.isFinite(seconds)?seconds*1000:Date.parse(v)-Date.now()||0);
              for(const pending of h.queue.splice(0))pending.reject(Error('RATE_BACKOFF '+host));
            }
            q.resolve(r);
          }catch(e){h.next=Date.now()+1000;q.reject(e);}
        }
      }finally{h.running=false;}
    })();
  });
}
export class Pilot {
  constructor({dir,clock=Date.now,scanner,readNarratives=async()=>({mode:'PAPER_ONLY',leads:[]}),
      getFx,inspect,quoteRoundtrip,quoteExit,fetcher=fetch}){
    this.dir=dir;this.clock=clock;fs.mkdirSync(dir,{recursive:true});
    this.file=path.join(dir,'portfolio-pilot.json');
    this.state=read(this.file,fresh());
    if(this.state.version!==1||!Number.isSafeInteger(this.state.cash)||this.state.cash<0||
      typeof this.state.enabled!=='boolean'||!Array.isArray(this.state.positions)||!Array.isArray(this.state.history)||
      this.state.positions.some(p=>p.model!=='QUOTED_PAPER_USDC_USD_PARITY'))
      throw Error('INVALID_PILOT_PORTFOLIO');
    const old=read(path.join(dir,'universe-pilot.json'),{candidates:[],backoff:{}});
    const limited=gatedFetch(fetcher),normal=(u,o)=>limited(u,o,0),exit=(u,o)=>limited(u,o,10);
    this.scanner=scanner??new Scanner({fetcher:normal,clock,
      universe:new Map(old.candidates.map(c=>[c.address,c])),backoff:old.backoff});
    this.readNarratives=readNarratives;this.getFx=getFx??(()=>fxReference(normal));
    this.inspect=inspect??(a=>inspectMint(a,normal));
    this.quoteRoundtrip=quoteRoundtrip??((a,b)=>roundTrip(a,b,normal,async()=>{}));
    this.quoteExit=quoteExit??((a,q)=>routeQuote(a,USDC,q,exit));
    this.diag={started_at:iso(clock()),loops:{},errors:{},narrative_sha:null,mode:'PAPER_ONLY'};
    this.narratives=new Map();this.fx=null;this.snapshot=this.scanner.snapshot();
    this.buys=[];this.blocked=[];this.busy={};this.recorder=new Recorder(dir,{clock});this.save(this.state);
    this.record('session_start',{initial:this.state});
  }
  save(s){atomic(this.file,s);this.state=s;}
  record(kind,data){try{return this.recorder.append(kind,data);}catch(e){this.diag.errors.recorder=String(e.message);throw e;}}
  toggle(){const enabled=!this.state.enabled;this.record('toggle',{enabled});this.save({...this.state,enabled});}
  async guard(name,fn){
    if(this.busy[name])return;
    this.busy[name]=true;const start=this.clock();
    try{await fn();delete this.diag.errors[name];this.diag.loops[name]={start:iso(start),end:iso(this.clock()),status:'OK'};}
    catch(e){this.diag.errors[name]=String(e.message);this.diag.loops[name]={start:iso(start),end:iso(this.clock()),status:'FAIL'};}
    finally{this.busy[name]=false;}
  }
  async scan(){return this.guard('scan',async()=>{
    this.snapshot=await this.scanner.cycle();
    atomic(path.join(this.dir,'universe-pilot.json'),this.snapshot);
    this.record('scan',{snapshot:this.snapshot});
  });}
  async context(){return this.guard('context',async()=>{
    const errors=[];
    try{this.fx=await this.getFx();}catch(e){errors.push('FX '+e.message);}
    try{
      const j=await this.readNarratives();
      this.narratives=narrativeMap(j,this.clock());
      this.diag.narrative_sha=createHash('sha256').update(JSON.stringify(j)).digest('hex');
      for(const [address,n] of this.narratives){
        // Add candidates not discovered by the local sources; preserve original observation separately.
        if(!this.scanner.universe.has(address))upsert(this.scanner.universe,{address,source:n.meme_source,kind:'narrative'},this.clock());
      }
    }catch(e){errors.push('NARRATIVE '+e.message);}
    this.record('context',{fx:this.fx,narratives:[...this.narratives],errors});
    if(errors.length)throw Error(errors.join('; '));
  });}
  async entries(){return this.guard('entries',async()=>{
    const start=this.clock(),hour=Math.floor(start/3600000);
    this.buys=[];this.blocked=[];
    if(!this.fx)throw Error('FX_UNAVAILABLE');
    // Broad discovery remains independent of the bounded expensive validation stage.
    const candidates=this.scanner.snapshot().candidates
      .map(c=>({...c,...this.narratives.get(c.address),fx:this.fx}))
      .filter(c=>c.meme_status==='VERIFIED_MEME'&&recent(c.meme_observed_at,start,3600000))
      .filter(c=>!qualify(c,start).some(x=>!['RISK','ROUTE'].includes(x)))
      .sort((a,b)=>rank(b)-rank(a));
    this.diag.entry_pool=candidates.length;
    const cap=20;
    for(const c of candidates.slice(0,cap)){
      if(Math.floor(this.clock()/3600000)!==hour||this.buys.length>=10)break;
      try{
        c.risk_evidence=await this.inspect(c.address);
        if(c.risk_evidence.risk!=='PASS'){this.blocked.push({address:c.address,reasons:['RISK'],detail:c.risk_evidence.error??c.risk_evidence.checks});continue;}
        c.roundtrip=await this.quoteRoundtrip(c.address,paperBudgetRaw(c.fx,this.clock()));
        const now=this.clock();
        const {buys,blocked}=decide([c],now);this.blocked.push(...blocked);
        if(!buys.length)continue;
        // Actual entry revalidates evidence after async provider work and respects a concurrent pause.
        this.buys.push(buys[0]);
        // Advice never depends on one device's portfolio. Same-hour re-entry is a local policy.
        if(this.state.history.some(h=>h.id===identity(c)&&h.action==='BUY'&&Math.floor(Date.parse(h.at)/3600000)===hour))continue;
        this.record('entry',{candidate:c,signal:buys[0],decision_at:now});
        const r=applyBuy(this.state,buys[0],c,now);
        if(r.reason==='BOUGHT')this.save(r.state);
        else this.diag.last_local_action={address:c.address,reason:r.reason};
      }catch(e){this.blocked.push({address:c.address,reasons:['PROVIDER_ERROR'],detail:String(e.message)});}
    }
    this.diag.entry_capacity={eligible:candidates.length,limit:cap,remaining:Math.max(0,candidates.length-cap)};
    this.record('entry_summary',{buys:this.buys,blocked:this.blocked,capacity:this.diag.entry_capacity});
    atomic(path.join(this.dir,'last-entry-pilot.json'),{at:iso(this.clock()),buys:this.buys,blocked:this.blocked});
  });}
  async exits(){return this.guard('exits',async()=>{
    // Independent of entry enabled state, even when scanner/feed fails.
    for(const p of [...this.state.positions]){
      let quote=null,market=null,err=null;
      try{quote=await this.quoteExit(p.address,p.qty_raw);}catch(e){err=String(e.message);}
      // Independent held-position market refresh, never depend on discovery retention.
      try{
        const url='https://api.dexscreener.com/tokens/v1/solana/'+p.address;
        const pairs=await this.scanner.request(url);
        market=normalize(p.address,pairs,this.clock());
      }catch(e){err=[err,String(e.message)].filter(Boolean).join('; ');}
      const now=this.clock(), evidence={quote,fx:this.fx,market};
      this.record('exit',{id:p.id,evidence,decision_at:now});
      const r=monitor(this.state,p.id,evidence,now);
      let state=r.state;
      if(err)state={...state,positions:state.positions.map(x=>x.id===p.id?{...x,last_error:err}:x)};
      this.save(state);
    }
  });}
  view(){
    const s=this.state,now=this.clock();
    const rows=this.scanner.snapshot().candidates.filter(c=>!c.market_stale)
      .sort((a,b)=>(b.market.change_5m_pct??-Infinity)-(a.market.change_5m_pct??-Infinity)).slice(0,10);
    return {state:s,shortlist:rows.map(c=>({symbol:c.market.symbol,chain:c.chain,change:c.market.change_5m_pct,
      status:'Beobachtung · '+(this.narratives.has(c.address)?'Narrativ belegt':'Meme-Evidenz offen')})),
      qualified:this.buys.filter(b=>Date.parse(b.expires_at)>now).length,
      invested:s.positions.reduce((n,p)=>n+p.amount,0),last:this.diag.loops.context?.end??null,
      errors:[...Object.values(this.diag.errors),...(this.snapshot.errors??[]).map(e=>e.error)],
      note:'Lokaler Solana-Pilot · virtuelle Quote-Simulation · USDC/USD-Parität und 0,10 EUR je Seite modelliert.',
      diag:{...this.diag,coverage:this.snapshot.coverage,blocked:this.blocked}};
  }
}
