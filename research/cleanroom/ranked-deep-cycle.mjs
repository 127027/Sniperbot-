import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {pacedFetch} from './paced-provider.mjs';
import {lookup} from './exact-contract-probe.mjs';
import {run as quotes} from './readonly-roundtrip-probe.mjs';
import {makePacket} from './source-receipt-packet.mjs';
const allowed=['solana','base','optimism','ethereum','bsc'];
const same=(c,a,b)=>typeof a==='string'&&typeof b==='string'&&(c==='solana'?a===b:a.toLowerCase()===b.toLowerCase());
const valid=(c,a)=>allowed.includes(c)&&typeof a==='string'&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a):/^0x[0-9a-fA-F]{40}$/.test(a));
const key=(c,a)=>c+':'+(c==='solana'?a:a.toLowerCase());
const nonExec={mode:'RESEARCH_ONLY',non_executable:true};
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const nets={solana:'solana',base:'base',optimism:'optimism',ethereum:'eth',bsc:'bsc'};
const ids={base:'8453',optimism:'10',ethereum:'1',bsc:'56'};
const select=(o,ks)=>Object.fromEntries(ks.filter(k=>Object.hasOwn(o??{},k)).map(k=>[k,o[k]]));
const text=x=>typeof x==='string'?x.slice(0,100):'';
async function get(url,fetcher=fetch){
 const started_at=new Date().toISOString();let http_status=null,response_sha256=null,response_bytes=null;
 try{const r=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),headers:{accept:'application/json'}});http_status=r.status;let chunks=[],size=0;if(r.body)for await(const chunk of r.body){size+=chunk.byteLength;if(size>2e6)throw Error('RESPONSE_TOO_LARGE');chunks.push(Buffer.from(chunk));}
 const b=Buffer.concat(chunks);response_bytes=b.length;response_sha256=createHash('sha256').update(b).digest('hex');const data=r.ok?JSON.parse(b.toString('utf8')):null;
 return {receipt:{url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,response_bytes,error:r.ok?null:'HTTP_'+r.status},data};
 }catch(e){return {receipt:{url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,response_bytes,error:String(e.message).slice(0,180)},data:null}}
}
export function selectRoster(sources,previous){
 const old=new Set(previous.map(([c,a])=>key(c,a))),seen=new Set(),buckets=new Map(allowed.map(c=>[c,[]]));
 for(const source of sources){
 if(!Array.isArray(source.data))continue;
 for(const x of source.data){const c=x.chainId,a=x.tokenAddress;if(!valid(c,a))continue;const k=key(c,a);if(seen.has(k))continue;seen.add(k);buckets.get(c).push({chain:c,contract:a,label:'Discovery lead '+a.slice(0,8),discovery_source:source.receipt.url,previous:old.has(k),classification:'UNVERIFIED_DISCOVERY_LEAD'});}
 }
 const selected=[];
 // Prefer previously unseen identities; alternate networks, without ranking paid boosts as quality.
 for(const prior of [false,true]){
 let active=true;while(active&&selected.length<10){active=false;for(const c of allowed){const b=buckets.get(c),i=b.findIndex(x=>x.previous===prior);if(i>=0){selected.push(b.splice(i,1)[0]);active=true;if(selected.length===10)break}}}
 }
 return {eligible:seen.size,selected,network_counts:Object.fromEntries(allowed.map(c=>[c,selected.filter(x=>x.chain===c).length]))};
}
export function tradeEvidence(j,c,a,pool,at){
 if(!Array.isArray(j?.data))return null;
 const cutoff=Date.parse(at);
 const found=j.data.map(t=>t.attributes).filter(t=>t&&same(c,t.token_address??t.base_token_address,a)&&finite(t.price_to_in_usd)&&Date.parse(t.block_timestamp)<=cutoff&&cutoff-Date.parse(t.block_timestamp)<=900000);
 // Gecko trade records usually expose from_token_address/to_token_address instead; validate exact side, no guessed association.
 const directional=j.data.map(t=>t.attributes).filter(t=>t&&Date.parse(t.block_timestamp)<=cutoff&&cutoff-Date.parse(t.block_timestamp)<=900000).map(t=>{const from=same(c,t.from_token_address,a),to=same(c,t.to_token_address,a);if(from===to)return null;const p=from?t.price_from_in_usd:t.price_to_in_usd;return finite(p)&&Number(p)>0?{provider_quote_time:t.block_timestamp,price_usd:Number(p),pool,tx_hash:t.tx_hash??null,side:from?'from':'to'}:null}).filter(Boolean);
 return directional.sort((a,b)=>Date.parse(b.provider_quote_time)-Date.parse(a.provider_quote_time))[0]??null;
}
async function security(c,a,fetcher){
 const url='https://api.gopluslabs.io/api/v1/'+(c==='solana'?'solana/token_security':'token_security/'+ids[c])+'?contract_addresses='+encodeURIComponent(a);
 const x=await get(url,fetcher);const j=x.data;const k=Object.keys(j?.result??{}).find(z=>same(c,z,a));const record=j?.code===1&&k&&j.result[k]&&typeof j.result[k]==='object'?j.result[k]:null;
 return {receipt:x.receipt,status:record?'PROVIDER_RECORD_NOT_AUDIT':'UNAVAILABLE',error:record?null:x.receipt.error??'NO_EXACT_SECURITY_RECORD',fields:record?select(record,['is_honeypot','buy_tax','sell_tax','is_mintable','owner_change_balance','can_take_back_ownership','is_blacklisted','freezable','mintable','holder_count']):null};
}
export function nextBatch(m,at){
 if(m?.schema!=='r31.broad-dispatch.v1'||m.mode!=='RESEARCH_ONLY'||m.non_executable!==true||!m.source_run||!/^[a-f0-9]{40}$/.test(m.source_commit)||!Array.isArray(m.ranked)||!Number.isInteger(m.cursor)||m.cursor<0)throw Error('BAD_RANKED_MANIFEST');
 const elapsed=Date.parse(at)-Date.parse(m.observed_at);
 if(!Number.isFinite(elapsed)||elapsed<0||elapsed>900000)throw Error('RANKING_STALE_REFRESH_REQUIRED');
 const seen=new Set();let last=Infinity;
 for(const x of m.ranked){if(!valid(x.chain,x.contract)||typeof x.priority!=='number'||!Number.isFinite(x.priority)||x.priority>last||seen.has(key(x.chain,x.contract)))throw Error('INVALID_RANKED_ROW');last=x.priority;seen.add(key(x.chain,x.contract));}
 const selected=m.ranked.slice(m.cursor,m.cursor+10).map(x=>({...x,label:x.label??x.contract.slice(0,8),classification:'UNVERIFIED_RESEARCH_LEAD'}));
 return {eligible:m.ranked.length,selected,remaining:Math.max(0,m.ranked.length-m.cursor-selected.length),network_counts:Object.fromEntries(allowed.map(c=>[c,selected.filter(x=>x.chain===c).length]))};
}

async function acquire(){
 const manifest=JSON.parse(fs.readFileSync(process.env.R31_DISPATCH_PATH??'r31/research/cleanroom/worker-diagnostics/broad-current-dispatch.json','utf8'));
 if(process.env.R31_SAME_RUN==='1'&&(manifest.source_run!==process.env.GITHUB_RUN_ID||manifest.source_commit!==process.env.GITHUB_SHA))throw Error('FOREIGN_SCAN_RUN');
 const start=new Date().toISOString(),limiter=pacedFetch();
 const selection=nextBatch(manifest,start);
 console.log('RANKED_DISPATCH '+JSON.stringify({started_at:start,source_run:manifest.source_run,eligible:selection.eligible,selected:selection.selected,remaining:selection.remaining}));
 if(selection.selected.length!==10)throw Error('RANKED_BATCH_INCOMPLETE:'+selection.selected.length);
 const roster=selection.selected.map(x=>[x.chain,x.contract,x.label]),probes=[],extra=[];
 // Per-candidate all required evidence in one acquisition window. Trade fallback paced with other Gecko requests.
 for(const x of selection.selected){
  const {chain:c,contract:a,label}=x,probe=await lookup(c,a,limiter.fetch);probes.push(probe);
  const pools=probe.attempts.flatMap(s=>s.rows).filter(r=>same(c,r.contract,a)).sort((a,b)=>Number(b.liquidity_usd)-Number(a.liquidity_usd));
  const pool=pools[0]?.pool;
  let trade={status:'NO_EXACT_POOL',receipt:null,quote:null};
  if(pool){const u='https://api.geckoterminal.com/api/v2/networks/'+nets[c]+'/pools/'+encodeURIComponent(pool)+'/trades';const t=await get(u,limiter.fetch);const q=tradeEvidence(t.data,c,a,pool,t.receipt.finished_at);trade={status:q?'TIMESTAMPED_POOL_TRADE':'NO_RECENT_EXACT_TRADE',receipt:t.receipt,quote:q,error:q?null:t.receipt.error??'NO_RECENT_EXACT_TRADE'};}
  const q=await quotes(fetch,[[c,a,label]]);const s=await security(c,a,fetch);
  const row={...x,market:probe.attempts.map(s=>({provider:s.provider,status:s.status,http_status:s.http_status,finished_at:s.finished_at,rows:s.rows.length})),trade,roundtrip:q.results[0],fx:q.fx,security:s,news:{status:'NOT_ACQUIRED',reason:'No verified news/social connector in this collector; separate exact-source research required.'},complete_costs:false,qualified_buy:false};
  extra.push(row);console.log('RANKED_ROW '+JSON.stringify(row));
 }
 const end=new Date().toISOString(),p=makePacket(probes,{run_id:process.env.GITHUB_RUN_ID,commit:process.env.GITHUB_SHA,at:end,roster});
 for(let i=0;i<10;i++){p.candidates[i].additional_evidence=extra[i];console.log('RANKED_CANDIDATE '+JSON.stringify(p.candidates[i]));}
 p.provenance.started_at=start;p.provenance.broad_source_run=manifest.source_run;p.provenance.broad_source_commit=manifest.source_commit;p.provenance.ranked_cursor=manifest.cursor;p.provenance.remaining=selection.remaining;p.provenance.rate_limit_events=limiter.events;
 const summary={...nonExec,started_at:start,finished_at:end,eligible:selection.eligible,selected:10,remaining_ranked:selection.remaining,network_counts:selection.network_counts,market_matches:probes.filter(x=>x.exact_pool_matches>0).length,market_http200:probes.flatMap(x=>x.attempts).filter(x=>x.http_status===200).length,timestamped_trades:extra.filter(x=>x.trade.quote).length,entry:extra.filter(x=>x.roundtrip.entry?.quote).length,exit:extra.filter(x=>x.roundtrip.exit?.quote).length,security:extra.filter(x=>x.security.status==='PROVIDER_RECORD_NOT_AUDIT').length,current_catalysts:0,complete_costs:0,verified_buys:0};
 console.log('RANKED_META '+JSON.stringify({...p,candidates:undefined}));console.log('RANKED_SUMMARY '+JSON.stringify(summary));
 fs.writeFileSync('ranked-packet.json',JSON.stringify(p,null,2));fs.writeFileSync('ranked-summary.json',JSON.stringify(summary,null,2));
}
function test(){
 const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),at='2026-11-27T14:00:00Z';
 const s=selectRoster([{receipt:{url:'fixture'},data:[{chainId:'base',tokenAddress:a},{chainId:'base',tokenAddress:a.toUpperCase().replace('0X','0x')},{chainId:'ethereum',tokenAddress:b},{chainId:'unsupported',tokenAddress:a}]}],[['base',a]]);
 assert.equal(s.eligible,2);assert.equal(s.selected[0].contract,b);
 const trade={from_token_address:a,to_token_address:b,price_from_in_usd:'2',block_timestamp:'2026-11-27T13:59:00Z',tx_hash:'fixture'};
 assert.equal(tradeEvidence({data:[{attributes:trade}]},'base',a,b,at).price_usd,2);
 assert.equal(tradeEvidence({data:[{attributes:{...trade,block_timestamp:'2026-11-27T13:00:00Z'}}]},'base',a,b,at),null);
 assert.equal(tradeEvidence({data:[{attributes:{...trade,block_timestamp:'2026-11-27T14:01:00Z'}}]},'base',a,b,at),null);
 assert.equal(tradeEvidence({data:[{attributes:trade}]},'base','0x'+'c'.repeat(40),b,at),null);
 const manifest={schema:'r31.broad-dispatch.v1',mode:'RESEARCH_ONLY',non_executable:true,source_run:'fixture',source_commit:'a'.repeat(40),observed_at:at,cursor:0,ranked:[{chain:'base',contract:a,priority:9},{chain:'ethereum',contract:b,priority:1}]};
 assert.equal(nextBatch(manifest,at).selected[0].contract,a);assert.equal(nextBatch({...manifest,cursor:1},at).selected[0].contract,b);
 assert.throws(()=>nextBatch({...manifest,ranked:[manifest.ranked[1],manifest.ranked[0]]},at),/INVALID_RANKED/);
 assert.throws(()=>nextBatch(manifest,'2026-11-27T14:30:00Z'),/STALE/);
 console.log('RANKED_FIXTURES_PASS deduplication, rotation, exact token side, stale/future rejection');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){test();if(!process.argv.includes('--self-test'))await acquire();}
