// Targeted pool + security evidence; never publishes BUY/SELL or uses wallets.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='research/cleanroom/', base='https://api.dexscreener.com/tokens/v1/', gt='https://api.geckoterminal.com/api/v2/networks/';
const nets={solana:'solana',ethereum:'eth',bsc:'bsc',base:'base',arbitrum:'arbitrum',polygon:'polygon_pos',optimism:'optimism',avalanche:'avax'};
const ids={ethereum:1,bsc:56,base:8453,arbitrum:42161,polygon:137,optimism:10,avalanche:43114};
const norm=(c,a)=>typeof a==='string'?(c==='solana'?a:a.toLowerCase()):'';
const number=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const key=(c,a)=>c+':'+norm(c,a), now=()=>new Date().toISOString();
const fresh=(t,at)=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=at&&at-Date.parse(t)<=900000;
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
const logs=[];
async function req(url){
 const started_at=now();let status=null;
 try{const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});status=r.status;if(!r.ok){logs.push({url,started_at,finished_at:now(),http_status:status,status:'HTTP_'+status});return null}
 const data=await r.json();logs.push({url,started_at,finished_at:now(),http_status:status,status:'OK'});return data;
 }catch(e){logs.push({url,started_at,finished_at:now(),http_status:status,status:'ERROR',error:String(e.cause?.code??e.message)});return null}
}
function selectPairs(pairs,chain,contract){
 if(!Array.isArray(pairs))return null;
 const k=norm(chain,contract);
 return pairs.filter(p=>p.chainId===chain&&norm(chain,p.baseToken?.address)===k&&p.pairAddress&&number(p.liquidity?.usd)>0&&number(p.priceUsd)>0).sort((a,b)=>number(b.liquidity.usd)-number(a.liquidity.usd))[0]??null;
}
function pool(p,source,observed){
 return {pool_address:p.pairAddress,source_url:source,retrieved_at:observed,provider_quote_time:null,price_usd:number(p.priceUsd),liquidity_usd:number(p.liquidity?.usd),volume_1h_usd:number(p.volume?.h1),volume_24h_usd:number(p.volume?.h24),change_1h_pct:number(p.priceChange?.h1),buys_1h:number(p.txns?.h1?.buys),sells_1h:number(p.txns?.h1?.sells),pair_created_at:Number.isFinite(p.pairCreatedAt)?new Date(p.pairCreatedAt).toISOString():null,dex:p.dexId??null};
}
function candleQuote(j,identity,fx,at,url){
 const a=j?.data?.attributes?.ohlcv_list, meta=j?.meta;
 if(!Array.isArray(a)||!meta?.base?.address||norm(identity.chain,meta.base.address)!==norm(identity.chain,identity.contract)||!(number(fx?.rates?.EUR)>0)||!/^\d{4}-\d{2}-\d{2}$/.test(fx?.date??'')||Date.parse(fx.date)>at||at-Date.parse(fx.date)>7*86400000)return null;
 const c=a.filter(x=>Array.isArray(x)&&Number.isFinite(x[0])&&x[0]*1000+60000<=at&&at-x[0]*1000<=900000&&number(x[4])>0&&number(x[5])>0).sort((x,y)=>y[0]-x[0])[0];
 if(!c)return null;
 return {price_eur:Number(c[4])*Number(fx.rates.EUR),observed_at_utc:new Date(c[0]*1000).toISOString(),source_url:url,quote_scope:'COMPLETED_POOL_MINUTE_CANDLE_CLOSE_INDICATIVE_PAPER',candle_close_utc:new Date(c[0]*1000+60000).toISOString(),price_usd:Number(c[4]),fx_rate:fx.rates.EUR,fx_date:fx.date,fx_source:'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'};
}
// A real pool trade has a provider block time. Do not promote pool retrieval time.
function poolTradeQuote(j,identity,fx,at,url){
 if(!Array.isArray(j?.data)||!(number(fx?.rates?.EUR)>0)||!/^\d{4}-\d{2}-\d{2}$/.test(fx?.date??'')||Date.parse(fx.date)>at||at-Date.parse(fx.date)>7*86400000)return null;
 const wanted=norm(identity.chain,identity.contract);
 const trades=j.data.flatMap(x=>{
  const a=x.attributes??{},t=a.block_timestamp;
  if(!fresh(t,at)||!a.tx_hash||a.is_anomalous===true||!(number(a.volume_in_usd)>0))return [];
  const from=norm(identity.chain,a.from_token_address)===wanted,to=norm(identity.chain,a.to_token_address)===wanted;
  if(from===to)return [];
  const p=number(from?a.price_from_in_usd:a.price_to_in_usd);
  return p>0?[{p,t:new Date(t).toISOString(),tx:a.tx_hash}]:[];
 }).sort((a,b)=>Date.parse(b.t)-Date.parse(a.t));
 const x=trades[0];return x?{price_eur:x.p*Number(fx.rates.EUR),observed_at_utc:x.t,source_url:url,quote_scope:'POOL_LAST_TRADE_USD_FX_INDICATIVE_PAPER',price_usd:x.p,fx_rate:fx.rates.EUR,fx_date:fx.date,fx_source:'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR',tx_hash:x.tx}:null;
}
function krakenQuote(raw,at,url,pair){
 const list=Object.entries(raw?.result??{}).filter(([k,v])=>k!=='last'&&Array.isArray(v));
 if(!Array.isArray(raw?.error)||raw.error.length||list.length!==1||list[0][0]!==pair)return null;
 const t=list[0][1].filter(x=>Array.isArray(x)&&number(x[0])>0&&number(x[1])>0&&number(x[2])>0&&fresh(new Date(Number(x[2])*1000).toISOString(),at)).sort((a,b)=>Number(b[2])-Number(a[2]))[0];
 return t?{price_eur:Number(t[0]),observed_at_utc:new Date(Number(t[2])*1000).toISOString(),source_url:url,quote_scope:'KRAKEN_LAST_TRADE_EUR_ASSET_INDICATIVE_PAPER'}:null;
}
function secondaryRisk(raw,i){
 if(i.chain==='solana'){
  if(!Array.isArray(raw?.risks)||!Number.isFinite(raw.score_normalised))return {status:'UNAVAILABLE'};
  return {status:'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',source:'RugCheck',fields:{score_normalised:raw.score_normalised,lp_locked_pct:number(raw.lpLockedPct),token_program:raw.tokenProgram??null,risks:raw.risks.slice(0,30).map(x=>({name:x.name,level:x.level,value:x.value}))},flags:raw.risks.filter(x=>['danger','critical'].includes(x.level)).map(x=>x.name)};
 }
 if(norm(i.chain,raw?.token?.address)!==norm(i.chain,i.contract)||Number(raw?.chain?.id)!==ids[i.chain]||norm(i.chain,raw?.pair?.pair?.address??raw?.pairAddress)!==norm(i.chain,i.pool.pool_address))return {status:'UNAVAILABLE'};
 const h=raw.honeypotResult?.isHoneypot;
 if(typeof h!=='boolean')return {status:'UNAVAILABLE'};
 const sell=number(raw.simulationResult?.sellTax);
 return {status:'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',source:'Honeypot.is',fields:{is_honeypot:h,simulation_success:raw.simulationSuccess===true,buy_tax_pct:number(raw.simulationResult?.buyTax),sell_tax_pct:sell,reported_risk:raw.summary?.risk??null,risk_level:raw.summary?.riskLevel??null,provider_flags:raw.summary?.flags??[]},flags:[...(h?['HONEYPOT']:[]),...(sell!==null&&sell>=50?['HIGH_SELL_TAX']:[])]};
}
function security(raw,chain,contract){
 if(raw?.code!==1&&raw?.code!=='1')return {status:'UNAVAILABLE'};
 const v=Object.entries(raw.result??{}).find(([a])=>norm(chain,a)===norm(chain,contract))?.[1];if(!v||typeof v!=='object'||!Object.keys(v).length)return {status:'UNAVAILABLE'};
 const fields=['is_honeypot','cannot_sell_all','is_blacklisted','is_mintable','is_proxy','is_open_source','buy_tax','sell_tax','transfer_pausable','hidden_owner','mintable','freezable','non_transferable','transfer_fee','metadata_mutable','default_account_state','holder_count'];
 const evidence=Object.fromEntries(fields.filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]));
 const flags=['is_honeypot','cannot_sell_all','is_blacklisted','hidden_owner'].filter(k=>String(v[k])==='1');if(number(v.sell_tax)!==null&&number(v.sell_tax)>=0.5)flags.push('HIGH_SELL_TAX');
 return {status:Object.keys(evidence).length?'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT':'UNAVAILABLE',flags,fields:evidence,source:'GoPlus'};
}
// Retrieval coverage policy, not a trading score. Reserve a discovery budget and rotate unresolved identities.
function riskWork(rows,previous,at,max=24,rawBudget=8){
 const items=new Map();
 for(const r of rows)for(const i of r.identities??[]){
  if(!i.pool||!['solana','ethereum','bsc','base'].includes(i.chain))continue;
  const k=key(i.chain,i.contract),x={i,k,raw:r.id.startsWith('lead:'),fresh:!r.id.startsWith('lead:')&&fresh(r.observed_at_utc,at),missing:i.security?.status!=='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',active:(i.pool.buys_1h??0)+(i.pool.sells_1h??0)>0,last:previous[k]??''};
  const old=items.get(k);if(!old||(!x.raw&&old.raw))items.set(k,x);
 }
 const order=(a,b)=>Number(b.missing)-Number(a.missing)||Number(b.active)-Number(a.active)||Number(b.fresh)-Number(a.fresh)||a.last.localeCompare(b.last)||a.k.localeCompare(b.k);
 const sorted=[...items.values()].sort(order),raw=sorted.filter(x=>x.raw).slice(0,Math.min(rawBudget,max)),used=new Set(raw.map(x=>x.k));
 return [...raw,...sorted.filter(x=>!used.has(x.k)).slice(0,max-raw.length)].map(x=>x.i);
}
async function batch(work,n=4){for(const group of chunks(work,n))await Promise.all(group.map(f=>f()))}
if(process.argv.includes('--self-test')){
 const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),p={chainId:'ethereum',baseToken:{address:a},quoteToken:{address:b},pairAddress:b,priceUsd:'1',liquidity:{usd:100}};
 assert.equal(selectPairs([p],'ethereum',a),p);assert.equal(selectPairs([p],'ethereum',b),null);assert.equal(selectPairs([p],'bsc',a),null);
 const at=Date.parse('2026-11-26T12:00:00Z'),t=at/1000-120,fx={date:'2026-11-25',rates:{EUR:0.9}};
 const j={meta:{base:{address:a}},data:{attributes:{ohlcv_list:[[t,1,2,1,2,3]]}}};
 assert.equal(candleQuote(j,{chain:'ethereum',contract:a},fx,at,'https://example.com').price_eur,1.8);
 assert.equal(candleQuote(j,{chain:'ethereum',contract:b},fx,at,'https://example.com'),null);
 assert.equal(candleQuote(j,{chain:'ethereum',contract:a},fx,at+3600000,'https://example.com'),null);
 assert.equal(security({code:1,result:{[a]:{is_honeypot:'1'}}},'ethereum',a).flags[0],'is_honeypot');assert.equal(security({code:1,result:{}},'ethereum',a).status,'UNAVAILABLE');
 assert.equal(krakenQuote({error:[],result:{PEPEEUR:[['0.001','1',at/1000-10]],last:'1'}},at,'https://example.com','PEPEEUR').price_eur,0.001);
 assert.equal(krakenQuote({error:[],result:{OTHER:[['0.001','1',at/1000-10]],last:'1'}},at,'https://example.com','PEPEEUR'),null);
 assert.equal(secondaryRisk({risks:[],score_normalised:1},{chain:'solana'}).status,'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT');
 assert.equal(secondaryRisk({risks:[{name:'Freeze authority',level:'danger'}],score_normalised:80},{chain:'solana'}).flags[0],'Freeze authority');
 assert.equal(secondaryRisk({token:{address:a},chain:{id:1},pair:{pair:{address:b}},honeypotResult:{isHoneypot:true}},{chain:'ethereum',contract:a,pool:{pool_address:b}}).flags[0],'HONEYPOT');
 assert.equal(secondaryRisk({token:{address:a},chain:{id:56},pair:{pair:{address:b}},honeypotResult:{isHoneypot:false}},{chain:'ethereum',contract:a,pool:{pool_address:b}}).status,'UNAVAILABLE');
 const trade={data:[{attributes:{from_token_address:a,to_token_address:b,price_from_in_usd:'2',price_to_in_usd:'3',volume_in_usd:'10',block_timestamp:new Date(at-10000).toISOString(),tx_hash:'fixture'}}]};
 assert.equal(poolTradeQuote(trade,{chain:'ethereum',contract:a},fx,at,'https://example.com').price_eur,1.8);
 assert.equal(poolTradeQuote(trade,{chain:'ethereum',contract:b},fx,at,'https://example.com').price_eur,2.7);
 assert.equal(poolTradeQuote(trade,{chain:'ethereum',contract:a},fx,at+3600000,'https://example.com'),null);
 assert.equal(poolTradeQuote(trade,{chain:'ethereum',contract:'0x'+'c'.repeat(40)},fx,at,'https://example.com'),null);
 assert.equal(poolTradeQuote({data:[{attributes:{...trade.data[0].attributes,is_anomalous:true}}]},{chain:'ethereum',contract:a},fx,at,'https://example.com'),null);
 const testRisk={pool:{buys_1h:2,sells_1h:1},security:{status:'UNAVAILABLE'}};
 const riskRows=[{id:'known',observed_at_utc:new Date(at-1000).toISOString(),identities:[{...testRisk,chain:'ethereum',contract:a}]},{id:'lead:solana:fixture',identities:[{...testRisk,chain:'solana',contract:'fixture'}]},{id:'dup',identities:[{...testRisk,chain:'ethereum',contract:a}]}];
 assert.equal(riskWork(riskRows,{},at,2,1).length,2);
 assert.equal(riskWork(riskRows,{},at,1,1)[0].chain,'solana');
 console.log('Targeted evidence fixtures passed');
}else{
 const started_at=now(), e=JSON.parse(await fs.readFile(dir+'evidence-latest.json','utf8'));let prev={rows:[]};
 try{prev=JSON.parse(await fs.readFile(dir+'targeted-latest.json','utf8'))}catch{}
 // Prior identities survive an upstream outage; their old quotes are never treated as current.
 const map=new Map((e.rows??[]).map(r=>[r.id,r]));for(const r of prev.rows??[])if(!r.id.startsWith('lead:')&&!map.has(r.id))map.set(r.id,{id:r.id,coin:r.coin,change_1h_pct:r.change_1h_pct,volume_24h_eur:r.volume_24h_eur,price_eur:null,observed_at_utc:null,source_url:null,identities:r.identities.map(i=>({chain:i.chain,contract:i.contract,pool:null})),risk_status:'NOT_ASSESSED'});
 // Reserve a separate bounded budget for raw discovery; do not let known assets crowd it out.
 const rows=[...map.values()].slice(0,240), known=new Set(rows.flatMap(r=>r.identities.map(i=>key(i.chain,i.contract))));
 const attempts={...(prev.lead_attempts??{})}, raw=new Map();
 const valid=(c,a)=>nets[c]&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a??''):/^0x[0-9a-fA-F]{40}$/.test(a??''));
 const addLead=(x,origin)=>{if(!valid(x.chain,x.contract))return;const k=key(x.chain,x.contract);if(known.has(k)||raw.has(k))return;raw.set(k,{...x,origin})};
 for(const x of e.discovery?.rows??[])addLead(x,'CURRENT_DISCOVERY');
 let registryRead='NOT_AVAILABLE';try{
  const index=JSON.parse(await fs.readFile(dir+'token-registry/index.json','utf8'));
  for(const s of index.shards??[]){if(!/^[0-9a-f]{2}$/.test(s.id))throw Error('INVALID_SHARD');const part=JSON.parse(await fs.readFile(dir+'token-registry/'+s.id+'.json','utf8'));for(const x of part.rows??[])addLead(x,'HISTORICAL_REGISTRY')}
  registryRead='OK';
 }catch(err){registryRead='ERROR:'+String(err.code??err.message);}
 const oldest=(a,b)=>(attempts[a[0]]??'').localeCompare(attempts[b[0]]??'')||a[0].localeCompare(b[0]);
 const recent=[...raw].filter(([,x])=>x.origin==='CURRENT_DISCOVERY').sort(oldest).slice(0,24);
 const chosen=new Set(recent.map(([k])=>k));
 const other=[...raw].filter(([k])=>!chosen.has(k)).sort(oldest).slice(0,24);
 for(const [k,x] of [...recent,...other]){
  const o=x.observations?.at(-1)??x.sources?.at(-1)??{};
  rows.push({id:'lead:'+k,coin:o.symbol??x.contract,price_eur:null,observed_at_utc:null,source_url:null,change_1h_pct:o.change_1h_pct??null,identities:[{chain:x.chain,contract:x.contract,pool:null}],classification:'UNVERIFIED_DISCOVERY_LEAD',discovery_origin:x.origin,decision_status:'RESEARCH_INPUT_NOT_BUY'});
  attempts[k]=started_at;
 }
 const selectedLeads=rows.filter(r=>r.id.startsWith('lead:')).length;
 const groups=new Map();for(const r of rows)for(const i of r.identities??[]){if(!nets[i.chain])continue;if(!groups.has(i.chain))groups.set(i.chain,new Set());groups.get(i.chain).add(i.contract)}
 const pools=new Map(),sec=new Map(),work=[];
 for(const [chain,set] of groups)for(const addresses of chunks([...set],30))work.push(async()=>{const url=base+chain+'/'+addresses.join(',');const j=await req(url);const retrieved=now();for(const a of addresses){const p=selectPairs(j,chain,a);if(p)pools.set(key(chain,a),pool(p,url,retrieved))}});
 await batch(work);
 const securityWork=[];for(const [chain,set] of groups)for(const addresses of chunks([...set].filter(a=>pools.has(key(chain,a))),20))securityWork.push(async()=>{const url='https://api.gopluslabs.io/api/v1/'+(chain==='solana'?'solana/token_security':'token_security/'+ids[chain])+'?contract_addresses='+addresses.join(',');const j=await req(url);for(const a of addresses)sec.set(key(chain,a),{...security(j,chain,a),source_url:url,retrieved_at:now()})});
 await batch(securityWork,3);
 // Some batch calls yield only a subset. Retry each leading unresolved contract individually.
 const prioritized=rows.slice().sort((a,b)=>(b.change_1h_pct??0)-(a.change_1h_pct??0));const retry=[];
 for(const r of prioritized){const i=r.identities.filter(i=>pools.has(key(i.chain,i.contract))).sort((a,b)=>pools.get(key(b.chain,b.contract)).liquidity_usd-pools.get(key(a.chain,a.contract)).liquidity_usd)[0];if(i&&sec.get(key(i.chain,i.contract))?.status!=='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')retry.push(i)}
 await batch(retry.slice(0,16).map(i=>async()=>{const url='https://api.gopluslabs.io/api/v1/'+(i.chain==='solana'?'solana/token_security':'token_security/'+ids[i.chain])+'?contract_addresses='+i.contract;const j=await req(url);sec.set(key(i.chain,i.contract),{...security(j,i.chain,i.contract),source_url:url,retrieved_at:now()})}),2);
 const candidates=[];for(const r of rows){for(const i of r.identities??[]){i.pool=pools.get(key(i.chain,i.contract))??null;i.security=sec.get(key(i.chain,i.contract))??{status:'UNAVAILABLE'};if(i.pool)candidates.push({r,i})}r.identities.sort((a,b)=>(b.pool?.liquidity_usd??0)-(a.pool?.liquidity_usd??0));}
 // Independent, read-only risk checks for leading candidates with missing/incomplete GoPlus evidence.
 const riskAttempts={...(prev.risk_attempts??{})};
 const secondaryCandidates=riskWork(rows,riskAttempts,Date.now());
 const blockedRiskHosts=new Set();
 await batch(secondaryCandidates.map(i=>async()=>{
  const url=i.chain==='solana'?'https://api.rugcheck.xyz/v1/tokens/'+i.contract+'/report/summary':'https://api.honeypot.is/v2/IsHoneypot?address='+i.contract+'&chainID='+ids[i.chain]+'&pair='+i.pool.pool_address;
  const host=new URL(url).hostname;if(blockedRiskHosts.has(host))return;
  riskAttempts[key(i.chain,i.contract)]=now();
  const raw=await req(url);if(logs.some(l=>l.url===url&&l.http_status===429))blockedRiskHosts.add(host);
  i.secondary_security={...secondaryRisk(raw,i),source_url:url,retrieved_at:now()};
  // Preserve original fields and contradictory flags; never convert absent evidence to a pass.
  if(i.secondary_security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT'){
   const primary=i.security??{status:'UNAVAILABLE'};
   i.security={...primary,status:'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',flags:[...new Set([...(primary.flags??[]),...(i.secondary_security.flags??[])])],secondary:i.secondary_security};
  }
 }),1);
 // Primary quotes remain asset-level; fallback uses completed pool candles, never DEX retrieval time as provider time.
 const ranked=rows.filter(r=>r.identities[0]?.pool).sort((a,b)=>(b.change_1h_pct??0)-(a.change_1h_pct??0));
 // Give discovery leads a bounded timestamped-trade budget instead of relying on untimed snapshots.
 const rawNeeds=ranked.filter(r=>r.id.startsWith('lead:')&&!fresh(r.observed_at_utc,Date.now())).sort((a,b)=>(b.identities[0].pool.volume_1h_usd??0)-(a.identities[0].pool.volume_1h_usd??0)).slice(0,4);
 const needs=ranked.filter(r=>!fresh(r.observed_at_utc,Date.now())).slice(0,8);
 const probes=[...needs,...ranked.filter(r=>!needs.includes(r)).slice(0,2)];
 const fx=(probes.length||rawNeeds.length)?await req('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'):null;
 let geckoLimited=(e.source_logs??[]).some(l=>String(l.url??'').includes('api.geckoterminal.com')&&(l.status==='HTTP_429'||l.http_status===429));
 const applyQuote=(r,i,q)=>{if(!q)return;r.fallback_quote={...q,chain:i.chain,contract:i.contract};if(!fresh(r.observed_at_utc,Date.now())){Object.assign(r,q);r.fallback_identity={chain:i.chain,contract:i.contract}}};
 for(const r of rawNeeds){if(geckoLimited)break;const i=r.identities[0],url=gt+nets[i.chain]+'/pools/'+encodeURIComponent(i.pool.pool_address)+'/trades';const j=await req(url);geckoLimited=logs.at(-1)?.http_status===429;applyQuote(r,i,poolTradeQuote(j,i,fx,Date.now(),url));}
 for(const r of probes){if(geckoLimited)break;if(r.fallback_quote)continue;const i=r.identities[0],url=gt+nets[i.chain]+'/pools/'+i.pool.pool_address+'/ohlcv/minute?aggregate=1&limit=5&currency=usd&token=base';const j=await req(url);geckoLimited=logs.at(-1)?.http_status===429;applyQuote(r,i,candleQuote(j,i,fx,Date.now(),url));}
 // Independent EUR trades from Kraken, only if CoinGecko explicitly maps the asset ID to its EUR pair.
 // Cache identity mapping, never cache price freshness. No symbol-only fallback.
 let cache={};try{cache=prev.kraken_identity_cache??{}}catch{}
 const wanted=ranked.filter(r=>!r.id.startsWith('lead:')).slice(0,25), queryIds=wanted.map(r=>r.id);
 if(queryIds.length){
 const mappingUrl='https://api.coingecko.com/api/v3/exchanges/kraken/tickers?coin_ids='+encodeURIComponent(queryIds.join(','));
 const mapping=await req(mappingUrl);
 for(const t of mapping?.tickers??[]){if(queryIds.includes(t.coin_id)&&t.market?.identifier==='kraken'&&t.target==='EUR'&&/^[A-Z0-9]{1,20}$/.test(t.base??'')&&t.is_anomaly!==true)cache[t.coin_id]={base:t.base,source_url:mappingUrl,verified_at:now()}}
 }
 const toTry=ranked.filter(r=>!r.id.startsWith('lead:')).filter(r=>!fresh(r.observed_at_utc,Date.now())||r.fallback_quote==null).filter(r=>cache[r.id]&&Date.now()-Date.parse(cache[r.id].verified_at)<7*86400000).slice(0,12);
 if(toTry.length){
 const pairs=await req('https://api.kraken.com/0/public/AssetPairs');
 await batch(toTry.map(r=>async()=>{const m=cache[r.id],entry=Object.entries(pairs?.result??{}).find(([k,v])=>v.wsname===m.base+'/EUR');if(!entry)return;const [pair]=entry;const url='https://api.kraken.com/0/public/Trades?pair='+encodeURIComponent(pair);const raw=await req(url),q=krakenQuote(raw,Date.now(),url,pair);if(!q)return;r.kraken_quote={...q,identity_mapping:m,market_pair:pair};if(!fresh(r.observed_at_utc,Date.now())){Object.assign(r,q);delete r.fallback_identity}}),2);
 }
 const finished_at=now(),at=Date.parse(finished_at);
 for(const r of rows){const i=r.identities.find(x=>r.fallback_identity?key(x.chain,x.contract)===key(r.fallback_identity.chain,r.fallback_identity.contract):x.pool);r.research_ready=Boolean(i?.pool&&fresh(r.observed_at_utc,at)&&number(r.price_eur)>0&&i.pool.volume_1h_usd!==null&&i.pool.sells_1h!==null);r.risk_status=i?.security?.status??'UNAVAILABLE';r.decision_status='RESEARCH_INPUT_NOT_BUY'}
 const out={schema:'cleanroom.targeted.v1',mode:'RESEARCH_ONLY',started_at,finished_at,source_snapshot:e.finished_at,kraken_identity_cache:cache,lead_attempts:attempts,risk_attempts:riskAttempts,discovery_coverage:{registry_read:registryRead,eligible_raw_contracts:raw.size,selected_raw_contracts:selectedLeads,unselected_raw_contracts:Math.max(0,raw.size-selectedLeads)},rows,news:e.news??[],source_logs:[...(e.source_logs??[]),...logs],summary:{assets:rows.filter(r=>!r.id.startsWith('lead:')).length,raw_leads_checked:selectedLeads,raw_leads_with_pool:rows.filter(r=>r.id.startsWith('lead:')&&r.identities.some(i=>i.pool)).length,raw_leads_with_timestamped_quote:rows.filter(r=>r.id.startsWith('lead:')&&r.research_ready).length,pool_mapped:rows.filter(r=>!r.id.startsWith('lead:')&&r.identities.some(i=>i.pool)).length,fresh_quote_and_pool:rows.filter(r=>!r.id.startsWith('lead:')&&r.research_ready).length,security_fields:rows.filter(r=>!r.id.startsWith('lead:')&&r.identities.some(i=>i.security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')).length,raw_leads_with_security_fields:rows.filter(r=>r.id.startsWith('lead:')&&r.identities.some(i=>i.security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')).length,fallback_quotes:rows.filter(r=>r.fallback_quote).length,kraken_quotes:rows.filter(r=>r.kraken_quote).length,news:(e.news??[]).length},limitations:'Research inputs only. No safety certification. DEX snapshot retrieval time is not a provider quote timestamp. FX daily indicative; candles are historic completed minute closes, not executable prices. Missing risk fields are unknown. Discovery remains bounded.'};
 // Compact, unranked evidence pages for agents with connector response-size limits.
 const pageSize=16, pages=[];
 const pageRoot=dir+'candidate-pages';
 await fs.mkdir(pageRoot,{recursive:true});
 const compact=rows.map(r=>({id:r.id,coin:r.coin,classification:r.classification??'MAPPED_ASSET',discovery_origin:r.discovery_origin??null,price_eur:r.price_eur,observed_at_utc:r.observed_at_utc,source_url:r.source_url,quote_scope:r.quote_scope??null,change_1h_pct:r.change_1h_pct, research_ready:r.research_ready,risk_status:r.risk_status, fallback_identity:r.fallback_identity??null, fallback_quote:r.fallback_quote??null,kraken_quote:r.kraken_quote??null,identities:r.identities.map(i=>({chain:i.chain,contract:i.contract,pool:i.pool,security:i.security,secondary_security:i.secondary_security??null}))})).sort((a,b)=>a.id.localeCompare(b.id));
 for(let offset=0;offset<compact.length;offset+=pageSize){
  const filename='page-'+String(offset/pageSize).padStart(3,'0')+'.json',data=compact.slice(offset,offset+pageSize);
  await fs.writeFile(pageRoot+'/'+filename+'.tmp',JSON.stringify({schema:'cleanroom.candidate-page.v1',snapshot:finished_at,rows:data})+'\n');await fs.rename(pageRoot+'/'+filename+'.tmp',pageRoot+'/'+filename);
  pages.push({file:filename,count:data.length,ids:data.map(r=>r.id)});
 }
 const index={schema:'cleanroom.candidate-index.v1',snapshot:finished_at,summary:out.summary,discovery_coverage:out.discovery_coverage,pages,total_rows:compact.length,limitations:'Alphabetical evidence pages, no ranking or recommendations. Read page snapshot and index together. Risk fields are not safety guarantees. Historical prices must be checked for freshness.'};
 await fs.writeFile(pageRoot+'/index.json.tmp',JSON.stringify(index,null,2)+'\n');await fs.rename(pageRoot+'/index.json.tmp',pageRoot+'/index.json');
 await fs.writeFile(dir+'targeted-latest.json.tmp',JSON.stringify(out,null,2)+'\n');await fs.rename(dir+'targeted-latest.json.tmp',dir+'targeted-latest.json');console.log(JSON.stringify(out.summary));
}
