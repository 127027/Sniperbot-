// Approved public market-only return channel. Fixed destination, no portfolio or credentials in payload.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const BASE='https://api.github.com/repos/127027/Sniperbot-/contents/';
export const DATA_BRANCH='r32-data';
import {POLICY} from './decision.mjs';
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const mint=x=>typeof x==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
export function buildQueue(snapshot,now){
 const candidates=(snapshot.candidates??[]).filter(c=>c.chain==='solana'&&mint(c.address)&&!c.market_stale&&c.market&&
   Number.isFinite(Date.parse(c.market.retrieved_at))&&Date.parse(c.market.retrieved_at)<=now&&now-Date.parse(c.market.retrieved_at)<=300000)
 .map(c=>({chain:'solana',address:c.address,first_seen:num(c.first_seen),promoted:c.promoted===true,
   market:{symbol:typeof c.market.symbol==='string'?c.market.symbol.slice(0,80):null,
   pool:mint(c.market.pool)?c.market.pool:null,
   source:mint(c.market.pool)?'https://dexscreener.com/solana/'+c.market.pool:null,
   retrieved_at:c.market.retrieved_at,pair_created_at:num(c.market.pair_created_at),
   price_usd:num(c.market.price_usd),liquidity_usd:num(c.market.liquidity_usd),volume_1h_usd:num(c.market.volume_1h_usd),
   change_5m_pct:num(c.market.change_5m_pct),change_1h_pct:num(c.market.change_1h_pct),
   buys_5m:num(c.market.buys_5m),sells_5m:num(c.market.sells_5m)}}));
 // Research priority is NOT a trade recommendation. Unknown/zero liquidity never boosts rank.
 const ready=[],early=[],unknown=[],low=[];
 for(const c of candidates){
  const m=c.market;
  if(m.liquidity_usd===null){unknown.push({...c,research_lane:'UNKNOWN_LIQUIDITY'});continue;}
  if(m.liquidity_usd<5000){low.push(c);continue;}
  const gate=m.liquidity_usd>=POLICY.minLiquidity&&m.volume_1h_usd>=POLICY.minVolume&&
    m.pair_created_at>0&&now-m.pair_created_at>=POLICY.minPairAge&&m.sells_5m>0&&m.buys_5m/m.sells_5m>=1.2;
  const turnover=Math.min(30,Math.max(0,m.volume_1h_usd??0)/m.liquidity_usd);
  const score=Math.log10(1+turnover)+Math.log10(1+m.liquidity_usd)/5+
    Math.min(3,Math.max(0,m.buys_5m??0)/Math.max(1,m.sells_5m??0))/5;
  (gate?ready:early).push({...c,research_lane:gate?'MARKET_GATES_MET':'EARLY_RESEARCH',queue_score:Math.round(score*10000)/10000});
 }
 const order=(a,b)=>b.queue_score-a.queue_score||a.address.localeCompare(b.address);
 ready.sort(order);early.sort(order);unknown.sort((a,b)=>(b.first_seen??0)-(a.first_seen??0)||a.address.localeCompare(b.address));
 // Reserve a limited research lane for early/unknown candidates without displacing actionable market observations.
 const selected=ready.slice(0,50);
 selected.push(...early.slice(0,Math.min(60-selected.length,Math.max(10,50-selected.length))));
 selected.push(...unknown.slice(0,Math.min(8,60-selected.length)));
 if(selected.length<60){
  const ids=new Set(selected.map(c=>c.address));
  selected.push(...[...ready,...early].filter(c=>!ids.has(c.address)).slice(0,60-selected.length));
 }
 const laneOrder={MARKET_GATES_MET:0,EARLY_RESEARCH:1,UNKNOWN_LIQUIDITY:2};
 selected.sort((a,b)=>laneOrder[a.research_lane]-laneOrder[b.research_lane]||(b.queue_score??0)-(a.queue_score??0)||a.address.localeCompare(b.address));
 return {version:1,mode:'PAPER_ONLY',generated_at:new Date(now).toISOString(),
 coverage:{identities:num(snapshot.coverage?.identities),fresh_market:num(snapshot.coverage?.fresh_market),
  market_gates_met:ready.length,early_research:early.length,unknown_liquidity:unknown.length,below_research_liquidity:low.length,
  published_market_gates_met:selected.filter(c=>c.research_lane==='MARKET_GATES_MET').length},
 candidates:selected,status:'MARKET_OBSERVATIONS_NOT_TRADE_SIGNALS'};
}
export class Transport{
 constructor({fetcher=fetch,tokenProvider=async()=>process.env.R32_GH_TOKEN||(await exec('gh',['auth','token'],{timeout:10000,windowsHide:true})).stdout.trim()}={}){
  this.fetcher=fetcher;this.tokenProvider=tokenProvider;this.cache=new Map();
 }
 async request(path,opts={}){
  const token=await this.tokenProvider();
  if(!token)throw Error('GITHUB_AUTH_REQUIRED');
  const url=BASE+path+(opts.method==='PUT'?'':'?ref='+DATA_BRANCH);
  return this.fetcher(url,{...opts,redirect:'error',signal:AbortSignal.timeout(15000),headers:{
   accept:'application/vnd.github+json',authorization:'Bearer '+token,'content-type':'application/json',...opts.headers}});
 }
 async readSignals(){
  const feeds=[];
  for(let dot=1;dot<=4;dot++){
   const path='r32/signals/dot-'+dot+'.json',cached=this.cache.get(path);
   try{
    const r=await this.request(path,{headers:cached?.etag?{'if-none-match':cached.etag}:{}});
    if(r.status===304&&cached){feeds.push({expected_dot:dot,feed:cached.feed});continue;}
    if(!r.ok)throw Error('HTTP '+r.status);
    const j=await r.json();
    const feed=JSON.parse(Buffer.from(j.content,'base64').toString('utf8'));
    this.cache.set(path,{feed,etag:r.headers.get('etag')});feeds.push({expected_dot:dot,feed});
   }catch(e){feeds.push({expected_dot:dot,feed:null,error:String(e.message).slice(0,120)});}
  }
  return feeds;
 }
 async publish(snapshot,now){
  const path='r32/local/queue.json',payload=buildQueue(snapshot,now);
  for(let attempt=0;attempt<2;attempt++){
   const old=await this.request(path);
   if(!old.ok&&old.status!==404)throw Error('QUEUE_READ_HTTP_'+old.status);
   const sha=old.ok?(await old.json()).sha:undefined;
   const r=await this.request(path,{method:'PUT',body:JSON.stringify({branch:DATA_BRANCH,sha,
    message:'R32 public market queue',content:Buffer.from(JSON.stringify(payload)).toString('base64')})});
   if(r.status===409)continue;
   if(!r.ok)throw Error('QUEUE_WRITE_HTTP_'+r.status);
   const verify=await this.request(path);
   if(!verify.ok)throw Error('QUEUE_READBACK_HTTP_'+verify.status);
   const j=await verify.json();
   if(Buffer.from(j.content,'base64').toString('utf8')!==JSON.stringify(payload))throw Error('QUEUE_READBACK_MISMATCH');
   return {status:'PUBLISHED',sha:j.sha,count:payload.candidates.length};
  }
  throw Error('QUEUE_CONFLICT');
 }
}
