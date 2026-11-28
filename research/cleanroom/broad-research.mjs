import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const chains=['solana','ethereum','bsc','base','arbitrum','polygon','optimism','avalanche'];
const deepChains=new Set(['solana','ethereum','bsc','base','optimism']);
const canon=(c,a)=>chains.includes(c)&&typeof a==='string'?(c==='solana'?(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)?a:null):(/^0x[0-9a-fA-F]{40}$/.test(a)?a.toLowerCase():null)):null;
const key=(c,a)=>c+':'+canon(c,a);
const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const sha=b=>createHash('sha256').update(b).digest('hex');
const mode={mode:'RESEARCH_ONLY',non_executable:true};
function loadRegistry(root){
 const index=JSON.parse(fs.readFileSync(path.join(root,'index.json')));
 const rows=[],seen=new Set();
 for(const s of index.shards){if(!/^[a-f0-9]{2}$/.test(s.id))throw Error('BAD_SHARD');const j=JSON.parse(fs.readFileSync(path.join(root,s.id+'.json')));assert.equal(j.schema,index.schema);assert.equal(j.rows.length,s.count);
 for(const r of j.rows){const a=canon(r.chain,r.contract);if(!a)throw Error('INVALID_REGISTRY_IDENTITY');const k=key(r.chain,a);if(seen.has(k))throw Error('DUPLICATE_REGISTRY_IDENTITY');seen.add(k);rows.push({chain:r.chain,contract:a,label:r.asset_ids?.[0]??r.sources?.at(-1)?.symbol??a.slice(0,8),first_seen_at:r.first_seen_at,last_seen_at:r.last_seen_at,origin:'REGISTRY',classification:'UNVERIFIED'});}}
 assert.equal(rows.length,index.total_contracts);return {index,rows};
}
function addDiscovery(rows,feeds){
 const m=new Map(rows.map(r=>[key(r.chain,r.contract),r]));let added=0;for(const f of feeds)if(Array.isArray(f.data))for(const r of f.data){const a=canon(r.chainId,r.tokenAddress);if(!a)continue;const k=key(r.chainId,a);if(!m.has(k)){m.set(k,{chain:r.chainId,contract:a,label:a.slice(0,8),origin:'LIVE_DISCOVERY',classification:'UNVERIFIED',source:f.receipt.url});added++;}}
 return {rows:[...m.values()],added};
}

// Ingest immutable support checkpoints as identity leads only; never reuse their quotes.
function mergeSupport(rows,reports){
 const m=new Map(rows.map(r=>[key(r.chain,r.contract),r])),unsupported=[],invalid=[];let added=0,matched=0;
 for(const f of reports)for(const x of f.data.candidates??[]){
  const chain=x.chain,contract=x.contract,a=canon(chain,contract);
  const source={path:f.path,sha256:f.sha256,observed_at:x.observation_utc??null};
  if(!chains.includes(chain)){unsupported.push({chain,contract,source,disposition:'UNSUPPORTED_MARKET_CHAIN'});continue}
  if(!a){invalid.push({chain,contract,source,disposition:'INVALID_SUPPORT_IDENTITY'});continue}
  const k=key(chain,a),prior=m.get(k);
  if(prior){prior.support_refs=[...(prior.support_refs??[]),source];matched++;continue}
  m.set(k,{chain,contract:a,label:String(x.label??a.slice(0,8)).slice(0,60),origin:'SUPPORT_DISCOVERY',classification:'UNVERIFIED',support_refs:[source]});added++;
 }
 return {rows:[...m.values()],added,matched,unsupported,invalid};
}
function readSupport(root,at){
 if(!fs.existsSync(root))return {reports:[],errors:[],status:'DIRECTORY_MISSING'};
 const reports=[],errors=[];
 for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.json')).sort()){
  const file=path.join(root,name);
  try{
   const b=fs.readFileSync(file),data=JSON.parse(b),t=Date.parse(data.observed_at_utc??data.created_at_utc??data.actual_utc??'');
   if(data.mode!=='RESEARCH_ONLY'||data.non_executable!==true||!Array.isArray(data.candidates))throw Error('INVALID_SUPPORT_SCHEMA');
   if(!Number.isFinite(t)||t>Date.parse(at)||Date.parse(at)-t>24*3600000)throw Error('SUPPORT_TIME_OUTSIDE_24H');
   reports.push({path:file,sha256:sha(b),data});
  }catch(e){errors.push({path:file,error:String(e.message).slice(0,120)})}
 }
 return {reports,errors,status:'READ'};
}

function extract(r,all,at){
 const p=all.filter(x=>x.chainId===r.chain&&canon(r.chain,x.baseToken?.address)===r.contract&&typeof x.pairAddress==='string'&&num(x.priceUsd)>0&&num(x.liquidity?.usd)>0).sort((a,b)=>num(b.liquidity.usd)-num(a.liquidity.usd))[0];
 if(!p)return null;
 const m={pool:p.pairAddress,symbol:typeof p.baseToken.symbol==='string'?p.baseToken.symbol.slice(0,60):null,price_usd:num(p.priceUsd),liquidity_usd:num(p.liquidity.usd),volume_5m:num(p.volume?.m5),volume_1h:num(p.volume?.h1),volume_6h:num(p.volume?.h6),change_5m:num(p.priceChange?.m5),change_1h:num(p.priceChange?.h1),change_6h:num(p.priceChange?.h6),buys_5m:num(p.txns?.m5?.buys),sells_5m:num(p.txns?.m5?.sells),pair_created_at:num(p.pairCreatedAt),retrieved_at:at,provider_quote_time:null};
 return m;
}
// Research priority only, not a return forecast. Unknown metrics stay unknown.
function score(m){
 if(!m||[m.volume_5m,m.volume_1h,m.change_5m,m.change_1h,m.buys_5m,m.sells_5m].some(x=>x===null))return null;
 if(m.liquidity_usd<1000||m.volume_1h<=0||m.buys_5m+m.sells_5m<=0)return null;
 const confidence=cap((m.buys_5m+m.sells_5m)/12,0,1);
 const accel=cap((m.volume_5m*12/Math.max(m.volume_1h,1)-1)*12,-12,24);
 const momentum=cap(m.change_5m*1.5,-25,25)+cap(m.change_1h/8,-20,15);
 const imbalance=cap((m.buys_5m-m.sells_5m)/Math.max(1,m.buys_5m+m.sells_5m)*15,-15,15);
 const liquidity=cap(Math.log10(m.liquidity_usd/1000)*5,0,20);
 const activity=cap(Math.log10(Math.max(1,m.volume_1h))*3,0,18);
 const latePenalty=cap((m.change_1h-80)/8,0,35);
 return Math.round(((accel+imbalance)*confidence+momentum+liquidity+activity-latePenalty)*100)/100;
}
function disposition(r){
 if(!r.market)return r.status;
 const m=r.market,missing=['volume_5m','volume_1h','change_5m','change_1h','buys_5m','sells_5m'].filter(k=>m[k]===null);
 if(missing.length)return 'MISSING_FIELDS:'+missing.join(',');
 if(m.liquidity_usd<1000)return 'LOW_LIQUIDITY';
 if(m.volume_1h<=0)return 'NO_HOURLY_VOLUME';
 if(m.buys_5m+m.sells_5m<=0)return 'NO_5M_TRADES';
 if(r.priority===null)return 'UNCLASSIFIED';
 return deepChains.has(r.chain)?'RANKABLE_SUPPORTED':'RANKABLE_UNSUPPORTED_DEEP';
}
function rank(rows){
 const ranked=rows.filter(r=>r.priority!==null).sort((a,b)=>b.priority-a.priority||key(a.chain,a.contract).localeCompare(key(b.chain,b.contract)));
 const deep=ranked.filter(r=>deepChains.has(r.chain));
 const selected=deep.slice(0,10),backlog=deep.slice(10);
 return {ranked,selected,backlog,unsupported_deep:ranked.filter(r=>!deepChains.has(r.chain)).length,unsupported_rows:ranked.filter(r=>!deepChains.has(r.chain))};
}
async function get(url){
 const started_at=new Date().toISOString();let http_status=null,hash=null,bytes=null,retry_after=null;
 try{const r=await fetch(url,{method:'GET',signal:AbortSignal.timeout(12000),redirect:'error',headers:{accept:'application/json'}});http_status=r.status;retry_after=r.headers.get('retry-after');let chunks=[],n=0;if(r.body)for await(const b of r.body){n+=b.byteLength;if(n>8e6)throw Error('RESPONSE_LIMIT');chunks.push(Buffer.from(b));}const body=Buffer.concat(chunks);bytes=body.length;hash=sha(body);return {receipt:{url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256:hash,response_bytes:bytes,retry_after,error:r.ok?null:'HTTP_'+r.status},data:r.ok?JSON.parse(body.toString('utf8')):null};}catch(e){return {receipt:{url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256:hash,response_bytes:bytes,retry_after,error:String(e.message).slice(0,180)},data:null}}
}
function test(){
 const c='base',a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),at='2026-11-27T15:00:00Z';
 const pair={chainId:c,baseToken:{address:a,symbol:'A'},pairAddress:'pool',priceUsd:'1',liquidity:{usd:10000},volume:{m5:2000,h1:8000},priceChange:{m5:8,h1:15},txns:{m5:{buys:20,sells:5}}};
 const r={chain:c,contract:a},m=extract(r,[{...pair,chainId:'bsc'},{...pair,baseToken:{address:b}},pair],at);assert.equal(m.symbol,'A');assert.equal(extract(r,[{...pair,baseToken:{address:b}}],at),null);assert.equal(score({...m,change_5m:null}),null);
 assert.ok(score(m)>score({...m,change_5m:-20,change_1h:-20,buys_5m:1,sells_5m:20}));
 assert.ok(score(m)>score({...m,change_1h:800}));assert.equal(rank([{...r,priority:1},{chain:c,contract:b,priority:10}]).selected[0].contract,b);
 const union=addDiscovery([r],[{receipt:{url:'fixture'},data:[{chainId:c,tokenAddress:a},{chainId:c,tokenAddress:b}]}]);assert.equal(union.added,1);assert.equal(union.rows.length,2);
 assert.ok(score({...m,buys_5m:1,sells_5m:0})<score({...m,buys_5m:20,sells_5m:5}));
 const many=Array.from({length:121},(_,i)=>({chain:c,contract:'0x'+i.toString(16).padStart(40,'0'),priority:121-i}));assert.equal(rank(many).backlog.length,111);
 const joined=mergeSupport([r],[{path:'fixture',sha256:'fixture',data:{candidates:[{chain:c,contract:a},{chain:c,contract:b},{chain:'robinhood',contract:a},{chain:c,contract:'bad'}]}}]);assert.equal(joined.added,1);assert.equal(joined.matched,1);assert.equal(joined.unsupported.length,1);assert.equal(joined.invalid.length,1);assert.equal(joined.rows.length,2);
 const late={chain:c,contract:'0x'+'f'.repeat(40),priority:1000};assert.equal(rank([...many,late]).selected[0].contract,late.contract);assert.equal(rank([late,...many.reverse()]).selected[0].contract,late.contract);
 console.log('BROAD_FIXTURE_PASS exact base identity, missing data, momentum, exhaustion penalty, deduplication and ranking');
}
async function run(){
 const started_at=new Date().toISOString();const {index,rows:registry}=loadRegistry('collector-data/research/cleanroom/token-registry');
 const feeds=[];for(const endpoint of ['token-profiles/latest/v1','token-boosts/latest/v1','token-boosts/top/v1','community-takeovers/latest/v1'])feeds.push(await get('https://api.dexscreener.com/'+endpoint));
 const u=addDiscovery(registry,feeds),support=readSupport('r31/research/cleanroom/hourly-support',started_at),merged=mergeSupport(u.rows,support.reports),receipts=[],rows=[];u.rows=merged.rows;let cooldown=0,stop=false;
 for(const c of chains){const group=u.rows.filter(r=>r.chain===c);for(let i=0;i<group.length;i+=30){
 const batch=group.slice(i,i+30);if(stop){for(const r of batch)rows.push({...r,status:'NOT_ATTEMPTED_COOLDOWN',priority:null,market:null});continue}
 await sleep(Math.max(500,cooldown-Date.now()));const x=await get('https://api.dexscreener.com/tokens/v1/'+c+'/'+batch.map(r=>r.contract).join(','));
 const receipt={...x.receipt,chain:c,count:batch.length,id:'B'+(receipts.length+1)};receipts.push(receipt);
 if(receipt.http_status===429){let delay=/^\d+$/.test(receipt.retry_after??'')?Number(receipt.retry_after)*1000:Date.parse(receipt.retry_after)-Date.now();if(!Number.isFinite(delay)||delay<0)delay=60000;if(delay>120000)stop=true;else cooldown=Date.now()+Math.max(delay,15000);}
 for(const r of batch){const m=Array.isArray(x.data)?extract(r,x.data,receipt.finished_at):null;rows.push({...r,receipt_id:receipt.id,status:m?'EXACT_MARKET_MATCH':Array.isArray(x.data)?'NO_EXACT_MARKET_MATCH':'SOURCE_ERROR',market:m,priority:score(m)});}
 }}
 for(const r of rows)r.disposition=disposition(r);
 const v=rank(rows),finished_at=new Date().toISOString();
 const summary={...mode,started_at,finished_at,registry_snapshot:index.updated_at,registry_count:registry.length,discovery_new:u.added,support_new:merged.added,support_matches:merged.matched,support_unsupported:merged.unsupported.length,support_invalid:merged.invalid.length,support_reports:support.reports.length,universe:u.rows.length,attempted:rows.filter(r=>r.receipt_id).length,batch_requests:receipts.length,batch_http200:receipts.filter(r=>r.http_status===200).length,batch_429:receipts.filter(r=>r.http_status===429).length,matched:rows.filter(r=>r.market).length,rankable:v.ranked.length,deep_unsupported:v.unsupported_deep,selected:v.selected.length,backlog:v.backlog.length,qualified_buys:0,dispositions:rows.reduce((a,r)=>(a[r.disposition]=(a[r.disposition]??0)+1,a),{}),by_chain:Object.fromEntries(chains.map(c=>[c,{universe:rows.filter(r=>r.chain===c).length,attempted:rows.filter(r=>r.chain===c&&r.receipt_id).length,matched:rows.filter(r=>r.chain===c&&r.market).length,rankable:rows.filter(r=>r.chain===c&&r.priority!==null).length}]))};
 const p={schema:'r31.broad-research.v1',...mode,provenance:{run_id:process.env.GITHUB_RUN_ID,commit:process.env.GITHUB_SHA,registry_commit:process.env.REGISTRY_COMMIT},summary,support_receipts:{status:support.status,reports:support.reports.map(f=>({path:f.path,sha256:f.sha256})),errors:support.errors,unsupported:merged.unsupported,invalid:merged.invalid},discovery_receipts:feeds.map(f=>f.receipt),batch_receipts:receipts,selected:v.selected,backlog:v.backlog,unsupported_rows:v.unsupported_rows,unresolved:rows.filter(r=>!r.market||r.priority===null).map(r=>({chain:r.chain,contract:r.contract,status:r.status,disposition:r.disposition,receipt_id:r.receipt_id??null})),limitations:'Known registry plus four discovery feeds and eligible support checkpoint identities; no claim of exhaustive global coverage. Single market provider, unknown quote times, unverified meme identity, heuristic priority not BUY. Backlog not yet dispatched.'};
 assert.equal(rows.length,u.rows.length);assert.equal(new Set(rows.map(r=>key(r.chain,r.contract))).size,rows.length);
 fs.writeFileSync('broad-research.json',JSON.stringify(p,null,2));fs.writeFileSync('broad-observations.json',JSON.stringify(rows,null,2));
 console.log('BROAD_SUMMARY '+JSON.stringify(summary));console.log('BROAD_PROVENANCE '+JSON.stringify(p.provenance));
 for(const r of [...v.selected,...v.backlog])console.log('BROAD_PRIORITY '+JSON.stringify({...r,selected:v.selected.includes(r)}));
 console.log('BROAD_RECEIPTS '+JSON.stringify(receipts.map(r=>({id:r.id,http_status:r.http_status,count:r.count,chain:r.chain,error:r.error}))));
}
test();if(!process.argv.includes('--self-test'))await run();
