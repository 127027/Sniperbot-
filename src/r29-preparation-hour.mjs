// Source archive projection. No trades, no winner ranking, no claim of actual executable quote.
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {Transform} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
const addr=x=>typeof x==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
const time=x=>typeof x==='number'&&Number.isFinite(x)?(x<1e12?x*1000:x):NaN;
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const iso=x=>new Date(x).toISOString();
export function createHourProjection({hourUtc,cutoffUtc}){
 const start=Date.parse(hourUtc),cutoff=Date.parse(cutoffUtc);
 if(!Number.isFinite(start)||start%3600000||cutoff!==Date.parse('2026-10-12T00:00:00Z')||start+3600000>cutoff)throw Error('INVALID_PREPARATION_HOUR');
 const end=start+3600000,seen=new Set(),pools=new Map(),minutes=new Map(),counts={lines:0,invalid:0,duplicate:0,after_cutoff:0,outside_hour:0,accepted:0,other_actions:0,missing_identity:0};
 let first=null,last=null;
 function add(e){
  counts.lines++;const at=time(e?.localTimestamp),event=time(e?.timestamp);
  if(!Number.isFinite(at)||!Number.isFinite(event)||event>at+60000){counts.invalid++;return;}
  if(Math.max(at,event)+60000>=cutoff){counts.after_cutoff++;return;}
  if(at<start||at>=end){counts.outside_hour++;return;}
  if(!['buy','sell'].includes(e.action)){counts.other_actions++;return;}
  if(!addr(e.mint)||!addr(e.pool)||!addr(e.quoteMint)||typeof e.signature!=='string'||!e.signature||!Number.isInteger(e.txIndex)){counts.invalid++;counts.missing_identity++;return;}
  const id=JSON.stringify([e.signature,e.pool,e.mint,e.action,e.txIndex]);
  if(seen.has(id)){counts.duplicate++;return;}seen.add(id);
  counts.accepted++;first=first===null?at:Math.min(first,at);last=last===null?at:Math.max(last,at);
  const k=e.mint+':'+e.pool+':'+e.quoteMint;
  const p=pools.get(k)||{chain:'solana',mint:e.mint,pool:e.pool,quote_mint:e.quoteMint,protocols:new Set(),buys:0,sells:0,buyers:new Set(),sellers:new Set(),first:null,last:null,first_price:null,last_price:null,last_reserve:null,last_tokens:null,latest_event:null};
  if(typeof e.protocol==='string')p.protocols.add(e.protocol);
  if(e.action==='buy')p.buys++;else p.sells++;
  for(const a of Array.isArray(e.tradersInvolved)?e.tradersInvolved:[])if(addr(a))(e.action==='buy'?p.buyers:p.sellers).add(a);
  const price=num(e.price);
  if(p.first===null||at<p.first){p.first=at;p.first_price=price;}
  if(p.last===null||at>p.last||(at===p.last&&id>p.latest_event)){p.last=at;p.last_price=price;p.last_reserve=num(e.quoteInPool);p.last_tokens=num(e.tokensInPool);p.latest_event=id;}
  pools.set(k,p);
  const minute=Math.floor(at/60000)*60000,mk=k+':'+minute;
  const m=minutes.get(mk)||{mint:e.mint,pool:e.pool,quote_mint:e.quoteMint,minute_utc:iso(minute),buys:0,sells:0,quote_buy_volume_reported:0,quote_sell_volume_reported:0,quote_amount_missing:0,first_at:null,last_at:null,open:null,close:null,high:null,low:null,last_reserve:null,last_tokens:null,last_signature:null,order_tie:false};
  if(e.action==='buy')m.buys++;else m.sells++;
  const amount=num(e.quoteAmount);if(amount===null)m.quote_amount_missing++;else m[e.action==='buy'?'quote_buy_volume_reported':'quote_sell_volume_reported']+=amount;
  if(price!==null){m.high=m.high===null?price:Math.max(m.high,price);m.low=m.low===null?price:Math.min(m.low,price);}
  if(m.first_at===null||at<m.first_at){m.first_at=at;m.open=price;}else if(at===m.first_at)m.order_tie=true;
  if(m.last_at===null||at>m.last_at){m.last_at=at;m.close=price;m.last_reserve=num(e.quoteInPool);m.last_tokens=num(e.tokensInPool);m.last_signature=e.signature;}else if(at===m.last_at)m.order_tie=true;
  minutes.set(mk,m);
 }
 function report(){return {kind:'R29_PREPARATION_ARCHIVE_HOUR_PROJECTION',hour_utc:hourUtc,cutoff_utc:cutoffUtc,counts,first_capture_utc:first===null?null:iso(first),last_capture_utc:last===null?null:iso(last),pools:[...pools.values()].map(p=>({chain:p.chain,mint:p.mint,pool:p.pool,quote_mint:p.quote_mint,protocols:[...p.protocols].sort(),buys:p.buys,sells:p.sells,unique_buyers:p.buyers.size,unique_sellers:p.sellers.size,first_capture_utc:iso(p.first),last_capture_utc:iso(p.last),first_price_reported:p.first_price,last_price_reported:p.last_price,last_quote_reserve_reported:p.last_reserve,last_token_reserve_reported:p.last_tokens,latest_event_key:p.latest_event,source_units_and_executable_quote_verified:false,risk_status:'UNKNOWN'})).sort((a,b)=>(a.mint+':'+a.pool+':'+a.quote_mint).localeCompare(b.mint+':'+b.pool+':'+b.quote_mint)),minute_observations:[...minutes.values()].map(m=>({...m,first_capture_utc:iso(m.first_at),last_capture_utc:iso(m.last_at)})),global_coverage_proven:false,orders:0};}
 return {add,invalidLine(){counts.lines++;counts.invalid++;},report};
}
export async function projectArchive(file,options){
 const p=createHourProjection(options),input=createReadStream(file),decoder=createZstdDecompress();
 input.on('error',e=>decoder.destroy(e));input.pipe(decoder);
 const lines=createInterface({input:decoder,crlfDelay:Infinity});
 try{for await(const line of lines){if(!line.trim())continue;let e;try{e=JSON.parse(line);}catch{p.invalidLine();continue;}p.add(e);}}finally{lines.close();input.destroy();decoder.destroy();}
 return p.report();
}
export function combinePreparationCandidates({legacy,earlier,projection}){
 const result=new Map();
 for(const c of legacy.candidates)result.set(c.mint,{mint:c.mint,legacy_feature:c,earlier_model_candidate:null,source_pools:[]});
 for(const c of earlier.preparation.candidates){const r=result.get(c.mint)||{mint:c.mint,legacy_feature:null,source_pools:[]};r.earlier_model_candidate=c;result.set(c.mint,r);}
 for(const p of projection.pools){const r=result.get(p.mint)||{mint:p.mint,legacy_feature:null,earlier_model_candidate:null,source_pools:[]};r.source_pools.push(p);result.set(p.mint,r);}
 return [...result.values()].map(r=>({...r,has_pre_midnight_swap_evidence:r.source_pools.length>0,has_recent_two_sided_swap_evidence:r.source_pools.some(p=>p.buys>0&&p.sells>0&&Date.parse(p.last_capture_utc)>Date.parse(projection.cutoff_utc)-600000),trade_input_verified:false})).sort((a,b)=>a.mint.localeCompare(b.mint));
}

// Stream the entire compressed hour, without retaining the huge source file in Git.
// Exact full-stream digest only on successful EOF. Minute projections are lossy.
// Raw transaction bytes remain with the provider and are not claimed archived here.
export async function projectArchiveStream(input,options){
 const h=createHash('sha256');let bytes=0;
 const tap=new Transform({transform(chunk,enc,cb){bytes+=chunk.length;h.update(chunk);cb(null,chunk);}});
 const p=createHourProjection(options),decoder=createZstdDecompress();
 input.on('error',e=>tap.destroy(e));tap.on('error',e=>decoder.destroy(e));input.pipe(tap).pipe(decoder);
 const lines=createInterface({input:decoder,crlfDelay:Infinity});
 try{for await(const line of lines){if(!line.trim())continue;let e;try{e=JSON.parse(line);}catch{p.invalidLine();continue;}p.add(e);}
 const report=p.report();return {report,archive_sha256:h.digest('hex'),archive_bytes:bytes,stream_complete:true};
 }finally{lines.close();input.destroy();tap.destroy();decoder.destroy();}
}
