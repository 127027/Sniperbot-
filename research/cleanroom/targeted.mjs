// Targeted pool + security evidence; never publishes BUY/SELL or uses wallets.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const dir='research/cleanroom/', base='https://api.dexscreener.com/tokens/v1/', gt='https://api.geckoterminal.com/api/v2/networks/';
const nets={solana:'solana',ethereum:'eth',bsc:'bsc',base:'base',arbitrum:'arbitrum',polygon:'polygon_pos',optimism:'optimism',avalanche:'avax'};
const ids={ethereum:1,bsc:56,base:8453,arbitrum:42161,polygon:137,optimism:10,avalanche:43114};
const cgPlatforms={ethereum:'ethereum',bsc:'binance-smart-chain',base:'base',arbitrum:'arbitrum-one',polygon:'polygon-pos',optimism:'optimistic-ethereum',avalanche:'avalanche',solana:'solana'};
const norm=(c,a)=>typeof a==='string'?(c==='solana'?a:a.toLowerCase()):'';
const number=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const key=(c,a)=>c+':'+norm(c,a), now=()=>new Date().toISOString();
const fresh=(t,at)=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=at&&at-Date.parse(t)<=900000;
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
const logs=[],hostCooldown={};
const riskTTL=30*60000;
const usableRisk=(v,at)=>v?.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT'&&Number.isFinite(Date.parse(v.retrieved_at))&&Date.parse(v.retrieved_at)<=at&&at-Date.parse(v.retrieved_at)<=riskTTL;
const usableSecondary=(v,i,at)=>usableRisk(v?.evidence,at)&&v.pool_address===i.pool?.pool_address;
const cachedRisk=v=>({...v,reused_from_github:true});
function retryDelay(value,at){const n=Number(value);if(value!==null&&value!==''&&Number.isFinite(n)&&n>=0)return Math.max(60000,n*1000);const t=Date.parse(value);return Number.isFinite(t)&&t>at?Math.max(60000,t-at):120000;}
async function req(url,headers={}){
 const started_at=now();let status=null;
 const host=new URL(url).hostname;
 if((hostCooldown[host]??0)>Date.now()){logs.push({url,started_at,finished_at:now(),http_status:null,status:'SKIPPED_PROVIDER_COOLDOWN',retry_after_utc:new Date(hostCooldown[host]).toISOString()});return null}
 try{const r=await fetch(url,{headers:{accept:'application/json',...headers},signal:AbortSignal.timeout(10000),redirect:'error'});status=r.status;if(status===429)hostCooldown[host]=Date.now()+retryDelay(r.headers.get('retry-after'),Date.now());if(!r.ok){
 let provider_error=null;
 try{const body=await r.json();const value=body?.status?.error_message??body?.error??body?.message;
  if(typeof value==='string'){provider_error=value.slice(0,240);const secret=process.env.COINGECKO_DEMO_KEY;if(secret)provider_error=provider_error.split(secret).join('[REDACTED]');}
 }catch{}
 logs.push({url,started_at,finished_at:now(),http_status:status,status:'HTTP_'+status,provider_error});return null}
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
// Alternative contract-specific EUR quote, never infer timestamp from request time.
function contractQuote(j,identity,at,url){
 if(!j||typeof j!=='object'||Array.isArray(j))return null;
 const entry=Object.entries(j).find(([a])=>norm(identity.chain,a)===norm(identity.chain,identity.contract))?.[1];
 const t=number(entry?.last_updated_at),p=number(entry?.eur);
 if(!(p>0)||!Number.isFinite(t)||t<=0||t*1000>at||at-t*1000>900000)return null;
 return {price_eur:p,observed_at_utc:new Date(t*1000).toISOString(),source_url:url,quote_scope:'COINGECKO_CONTRACT_INDICATIVE_PAPER'};
}
// Provider-reported token taxes only; they are not a full execution quote.
function executionCosts(i,at){
 const fields=[];
 for(const v of [i.security,i.secondary_security]){
  if(!usableRisk(v,at))continue;
  const f=v.fields??{},scale=v.source==='GoPlus'?100:v.source==='Honeypot.is'?1:null;
  if(scale===null)continue;
  const buy=number(scale===100?f.buy_tax:f.buy_tax_pct),sell=number(scale===100?f.sell_tax:f.sell_tax_pct);
  fields.push({source:v.source,source_url:v.source_url??null,retrieved_at:v.retrieved_at,buy_tax_pct:buy!==null&&buy>=0&&buy*scale<=100?buy*scale:null,sell_tax_pct:sell!==null&&sell>=0&&sell*scale<=100?sell*scale:null});
 }
 return {scope:'PAPER_COST_EVIDENCE_NOT_EXECUTABLE_QUOTE',stake_eur:50,tax_observations:fields,gas_eur:null,dex_fee_pct:null,slippage_pct:null,round_trip_total_eur:null,limitations:'Taxes only when provider supplied valid current fields. Gas, route fee, price impact and total unknown; do not assume zero.'};
}
// Independent worker reports are untrusted discovery locators, not market facts.
function supportRows(doc){
 if(doc?.mode!=='RESEARCH_ONLY'||doc.non_executable!==true||!Array.isArray(doc.rows))return [];
 return doc.rows.filter(r=>nets[r.chain]&&(r.chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.contract??''):/^0x[0-9a-fA-F]{40}$/.test(r.contract??''))&&Array.isArray(r.sources)&&r.sources.some(u=>typeof u==='string'&&u.startsWith('https://'))).slice(0,32).map(r=>({chain:r.chain,contract:norm(r.chain,r.contract),sources:[{symbol:typeof r.name==='string'?r.name.slice(0,100):null}]}));
}
function loadSupport(at){
 const root='r31/research/cleanroom/autonomy-acceptance/',ref='refs/remotes/origin/cleanroom-support-read';
 const git=args=>spawnSync('git',args,{encoding:'utf8',timeout:15000,maxBuffer:2000000});
 const fetched=git(['fetch','--no-tags','--depth=1','origin','+refs/heads/codex/r31-control-center-paper:'+ref]);
 if(fetched.status!==0)return {status:'FETCH_FAILED',rows:[],files:[]};
 const tree=git(['ls-tree','-r','--name-only',ref,'--',root]);
 if(tree.status!==0)return {status:'TREE_FAILED',rows:[],files:[]};
 const names=tree.stdout.split('\n').filter(p=>p.startsWith(root)&&/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-support-evidence\.json$/.test(p.slice(root.length))).sort().reverse();
 const rows=[],files=[];
 for(const p of names.slice(0,4)){
  const t=Date.parse(p.slice(root.length,root.length+20).replace(/T(\d{2})-(\d{2})-(\d{2})Z/,'T$1:$2:$3Z'));
  if(!Number.isFinite(t)||t>at||at-t>2*3600000)continue;
  const file=git(['show',ref+':'+p]);if(file.status!==0)continue;
  try{const valid=supportRows(JSON.parse(file.stdout));if(valid.length){files.push(p);rows.push(...valid.map(r=>({...r,support_file:p})));}}catch{}
 }
 return {status:files.length?'OK':'NO_RECENT_VALID_REPORT',rows,files};
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
 const cq={[a]:{eur:0.01,last_updated_at:t}};
 assert.equal(contractQuote(cq,{chain:'ethereum',contract:a},at,'fixture').price_eur,0.01);
 assert.equal(contractQuote(cq,{chain:'ethereum',contract:b},at,'fixture'),null);
 assert.equal(contractQuote(cq,{chain:'ethereum',contract:a},at+3600000,'fixture'),null);
 assert.equal(contractQuote({[a]:{eur:0.01}},{chain:'ethereum',contract:a},at,'fixture'),null);
 assert.equal(contractQuote({[a]:{eur:0.01,last_updated_at:at/1000+1}},{chain:'ethereum',contract:a},at,'fixture'),null);
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
 const fixtureRisk={status:'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',retrieved_at:new Date(at-60000).toISOString(),flags:['test']};
 assert.equal(usableRisk(fixtureRisk,at),true);assert.equal(usableRisk(fixtureRisk,at+3600000),false);
 assert.equal(usableRisk({...fixtureRisk,retrieved_at:new Date(at+1000).toISOString()},at),false);
 assert.equal(usableRisk({...fixtureRisk,status:'UNAVAILABLE'},at),false);
 assert.equal(usableSecondary({evidence:fixtureRisk,pool_address:b},{pool:{pool_address:b}},at),true);
 assert.equal(usableSecondary({evidence:fixtureRisk,pool_address:a},{pool:{pool_address:b}},at),false);
 assert.equal(cachedRisk(fixtureRisk).retrieved_at,fixtureRisk.retrieved_at);
 const supportFixture={mode:'RESEARCH_ONLY',non_executable:true,rows:[{chain:'ethereum',contract:a,name:'fixture',sources:['https://example.com'],price_eur:999},{chain:'ethereum',contract:'bad',sources:['https://example.com']}]};
 assert.equal(supportRows(supportFixture).length,1);assert.equal(supportRows(supportFixture)[0].price_eur,undefined);assert.equal(supportRows({...supportFixture,non_executable:false}).length,0);
 const cost=executionCosts({security:{...fixtureRisk,source:'GoPlus',fields:{buy_tax:'0.02',sell_tax:'0.04'}},secondary_security:{...fixtureRisk,source:'Honeypot.is',fields:{buy_tax_pct:0,sell_tax_pct:3}}},at);
 assert.equal(cost.tax_observations[0].buy_tax_pct,2);assert.equal(cost.tax_observations[1].sell_tax_pct,3);assert.equal(cost.round_trip_total_eur,null);
 assert.equal(executionCosts({security:fixtureRisk},at+3600000).tax_observations.length,0);
 assert.equal(retryDelay('120',at),120000);assert.equal(retryDelay(null,at),120000);
 console.log('Targeted evidence and cache fixtures passed');
}else{
 const started_at=now(), e=JSON.parse(await fs.readFile(dir+'evidence-latest.json','utf8'));let prev={rows:[]};
 try{prev=JSON.parse(await fs.readFile(dir+'targeted-latest.json','utf8'))}catch{}
 // Persist only evidence with its original provider/retrieval time. Never renew its timestamp on a cache hit.
 const riskCache={...(prev.risk_cache??{})};
 for(const [host,until] of Object.entries(prev.host_cooldown??{}))if(Number.isFinite(until)&&until>Date.now())hostCooldown[host]=until;
 for(const l of e.source_logs??[])if(l.status==='HTTP_429'){try{const h=new URL(l.url).hostname,t=Date.parse(l.finished_at);if(Number.isFinite(t)&&t+120000>Date.now())hostCooldown[h]=Math.max(hostCooldown[h]??0,t+120000)}catch{}}
 for(const [k,v] of Object.entries(riskCache))if(!usableRisk(v.primary,Date.now())&&!usableRisk(v.secondary?.evidence,Date.now()))delete riskCache[k];
 const cacheHits={primary_risk:0,secondary_risk:0,kraken_mapping:0};
 const savePrimary=(k,v)=>{if(usableRisk(v,Date.now())){riskCache[k]??={};riskCache[k].primary=v;}};
 const reusePrimary=(k)=>{const v=riskCache[k]?.primary;if(!usableRisk(v,Date.now()))return null;cacheHits.primary_risk++;return cachedRisk(v);};
 const saveSecondary=(i,v)=>{if(usableRisk(v,Date.now())){const k=key(i.chain,i.contract);riskCache[k]??={};riskCache[k].secondary={pool_address:i.pool.pool_address,evidence:v};}};
 // Prior identities survive an upstream outage; their old quotes are never treated as current.
 const map=new Map((e.rows??[]).map(r=>[r.id,r]));for(const r of prev.rows??[])if(!r.id.startsWith('lead:')&&!map.has(r.id))map.set(r.id,{id:r.id,coin:r.coin,change_1h_pct:r.change_1h_pct,volume_24h_eur:r.volume_24h_eur,price_eur:null,observed_at_utc:null,source_url:null,identities:r.identities.map(i=>({chain:i.chain,contract:i.contract,pool:null})),risk_status:'NOT_ASSESSED'});
 // Reserve a separate bounded budget for raw discovery; do not let known assets crowd it out.
 // Preserve the current market-page discoveries and rotate the historical refresh budget.
 const mappedAttempts={...(prev.mapped_attempts??{})},currentIds=new Set((e.rows??[]).map(r=>r.id));
 const current=[...map.values()].filter(r=>currentIds.has(r.id));
 const older=[...map.values()].filter(r=>!currentIds.has(r.id)).sort((a,b)=>(mappedAttempts[a.id]??'').localeCompare(mappedAttempts[b.id]??'')||a.id.localeCompare(b.id));
 const rows=[...current,...older].slice(0,240), known=new Set(rows.flatMap(r=>r.identities.map(i=>key(i.chain,i.contract))));
 for(const r of rows)mappedAttempts[r.id]=started_at;
 const attempts={...(prev.lead_attempts??{})}, raw=new Map(),historicalKeys=new Set();
 const valid=(c,a)=>nets[c]&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a??''):/^0x[0-9a-fA-F]{40}$/.test(a??''));
 const addLead=(x,origin)=>{if(!valid(x.chain,x.contract))return;const k=key(x.chain,x.contract);if(known.has(k)||raw.has(k))return;raw.set(k,{...x,origin})};
 const support=loadSupport(Date.parse(started_at));
 for(const x of support.rows)addLead(x,'DOT_SUPPORT_DISCOVERY');
 for(const x of e.discovery?.rows??[])addLead(x,'CURRENT_DISCOVERY');
 let registryRead='NOT_AVAILABLE';try{
  const index=JSON.parse(await fs.readFile(dir+'token-registry/index.json','utf8'));
  for(const s of index.shards??[]){if(!/^[0-9a-f]{2}$/.test(s.id))throw Error('INVALID_SHARD');const part=JSON.parse(await fs.readFile(dir+'token-registry/'+s.id+'.json','utf8'));for(const x of part.rows??[]){historicalKeys.add(key(x.chain,x.contract));addLead(x,'HISTORICAL_REGISTRY')}}
  registryRead='OK';
 }catch(err){registryRead='ERROR:'+String(err.code??err.message);}
 const oldest=(a,b)=>(attempts[a[0]]??'').localeCompare(attempts[b[0]]??'')||a[0].localeCompare(b[0]);
 // New-to-registry contracts get priority for acquisition, not for trading.
 const supportSelected=[...raw].filter(([,x])=>x.origin==='DOT_SUPPORT_DISCOVERY').sort(oldest).slice(0,8);
 const recent=[...supportSelected,...[...raw].filter(([,x])=>x.origin==='CURRENT_DISCOVERY').sort((a,b)=>Number(historicalKeys.has(a[0]))-Number(historicalKeys.has(b[0]))||oldest(a,b)).slice(0,32-supportSelected.length)];
 const chosen=new Set(recent.map(([k])=>k));
 const other=[...raw].filter(([k])=>!chosen.has(k)).sort(oldest).slice(0,48-recent.length);
 const previousRaw=new Set((prev.rows??[]).filter(r=>r.id.startsWith('lead:')).flatMap(r=>r.identities.map(i=>key(i.chain,i.contract))));
 const currentUnseen=[...raw].filter(([k,x])=>x.origin==='CURRENT_DISCOVERY'&&!historicalKeys.has(k)).length;
 const rawFirstSelected=[...recent,...other].filter(([k])=>!Object.hasOwn(attempts,k)).length;
 const rawNewToRegistry=recent.filter(([k])=>!historicalKeys.has(k)).length;
 const rawOverlap=[...recent,...other].filter(([k])=>previousRaw.has(k)).length;
 for(const [k,x] of [...recent,...other]){
  const o=x.observations?.at(-1)??x.sources?.at(-1)??{};
  rows.push({id:'lead:'+k,coin:o.symbol??x.contract,price_eur:null,observed_at_utc:null,source_url:null,change_1h_pct:o.change_1h_pct??null,identities:[{chain:x.chain,contract:x.contract,pool:null}],classification:'UNVERIFIED_DISCOVERY_LEAD',discovery_origin:x.origin,support_file:x.support_file??null,decision_status:'RESEARCH_INPUT_NOT_BUY'});
  attempts[k]=started_at;
 }
 const selectedLeads=rows.filter(r=>r.id.startsWith('lead:')).length;
 const groups=new Map();for(const r of rows)for(const i of r.identities??[]){if(!nets[i.chain])continue;if(!groups.has(i.chain))groups.set(i.chain,new Set());groups.get(i.chain).add(i.contract)}
 const pools=new Map(),sec=new Map(),work=[];
 for(const [chain,set] of groups)for(const addresses of chunks([...set],30))work.push(async()=>{const url=base+chain+'/'+addresses.join(',');const j=await req(url);const retrieved=now();for(const a of addresses){const p=selectPairs(j,chain,a);if(p)pools.set(key(chain,a),pool(p,url,retrieved))}});
 await batch(work);
 for(const [chain,set] of groups)for(const a of set){const k=key(chain,a);if(pools.has(k)){const c=reusePrimary(k);if(c)sec.set(k,c);}}
 const securityWork=[];for(const [chain,set] of groups)for(const addresses of chunks([...set].filter(a=>pools.has(key(chain,a))&&!sec.has(key(chain,a))),20))securityWork.push(async()=>{const url='https://api.gopluslabs.io/api/v1/'+(chain==='solana'?'solana/token_security':'token_security/'+ids[chain])+'?contract_addresses='+addresses.join(',');const j=await req(url);for(const a of addresses){const k=key(chain,a),v={...security(j,chain,a),source_url:url,retrieved_at:now()};sec.set(k,v);savePrimary(k,v)}});
 await batch(securityWork,3);
 // Some batch calls yield only a subset. Retry each leading unresolved contract individually.
 const prioritized=rows.slice().sort((a,b)=>(b.change_1h_pct??0)-(a.change_1h_pct??0));const retry=[];
 for(const r of prioritized){const i=r.identities.filter(i=>pools.has(key(i.chain,i.contract))).sort((a,b)=>pools.get(key(b.chain,b.contract)).liquidity_usd-pools.get(key(a.chain,a.contract)).liquidity_usd)[0];if(i&&sec.get(key(i.chain,i.contract))?.status!=='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')retry.push(i)}
 await batch(retry.slice(0,16).map(i=>async()=>{const url='https://api.gopluslabs.io/api/v1/'+(i.chain==='solana'?'solana/token_security':'token_security/'+ids[i.chain])+'?contract_addresses='+i.contract;const j=await req(url);const k=key(i.chain,i.contract),v={...security(j,i.chain,i.contract),source_url:url,retrieved_at:now()};sec.set(k,v);savePrimary(k,v)}),2);
 const candidates=[];for(const r of rows){for(const i of r.identities??[]){i.pool=pools.get(key(i.chain,i.contract))??null;i.security=sec.get(key(i.chain,i.contract))??{status:'UNAVAILABLE'};if(i.pool)candidates.push({r,i})}r.identities.sort((a,b)=>(b.pool?.liquidity_usd??0)-(a.pool?.liquidity_usd??0));}
 // Independent, read-only risk checks for leading candidates with missing/incomplete GoPlus evidence.
 const riskAttempts={...(prev.risk_attempts??{})};
 const mergeSecondary=i=>{
  if(i.secondary_security?.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT'){
   const primary=i.security??{status:'UNAVAILABLE'};
   i.security={...primary,status:'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT',flags:[...new Set([...(primary.flags??[]),...(i.secondary_security.flags??[])])],secondary:i.secondary_security};
  }
 };
 for(const r of rows)for(const i of r.identities){const v=riskCache[key(i.chain,i.contract)]?.secondary;if(i.pool&&usableSecondary(v,i,Date.now())){i.secondary_security=cachedRisk(v.evidence);cacheHits.secondary_risk++;mergeSecondary(i);}}
 const secondaryCandidates=riskWork(rows.map(r=>({...r,identities:r.identities.filter(i=>!i.secondary_security)})),riskAttempts,Date.now());
 const blockedRiskHosts=new Set();
 await batch(secondaryCandidates.map(i=>async()=>{
  const url=i.chain==='solana'?'https://api.rugcheck.xyz/v1/tokens/'+i.contract+'/report/summary':'https://api.honeypot.is/v2/IsHoneypot?address='+i.contract+'&chainID='+ids[i.chain]+'&pair='+i.pool.pool_address;
  const host=new URL(url).hostname;if(blockedRiskHosts.has(host))return;
  riskAttempts[key(i.chain,i.contract)]=now();
  const raw=await req(url);if(logs.some(l=>l.url===url&&l.http_status===429))blockedRiskHosts.add(host);
  i.secondary_security={...secondaryRisk(raw,i),source_url:url,retrieved_at:now()};
  // Preserve original fields and contradictory flags; never convert absent evidence to a pass.
  saveSecondary(i,i.secondary_security);mergeSecondary(i);
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
 // Try a second provider for raw leads without a timestamped quote. One bounded batch per cycle.
 // Rotate chains across cycles. No symbol matching, fabricated quote time or forced buy.
 // Provider explicitly limits this endpoint to one address per request.
 const contractQuoteHistory={...(prev.contract_quote_attempts??{})};
 const quoteEligible=ranked.filter(r=>{const i=r.identities[0];return r.id.startsWith('lead:')&&!fresh(r.observed_at_utc,Date.now())&&cgPlatforms[i.chain]&&(i.pool.buys_1h??0)+(i.pool.sells_1h??0)>0});
 const ordered=quoteEligible.sort((a,b)=>(contractQuoteHistory[key(a.identities[0].chain,a.identities[0].contract)]??'').localeCompare(contractQuoteHistory[key(b.identities[0].chain,b.identities[0].contract)]??'')||a.id.localeCompare(b.id));
 let contractQuoteAttempts=0,contractQuoteHits=0,contractQuoteStatus='NO_ELIGIBLE_LEADS',contractQuoteError=null,contractQuoteSingleRetry=false,contractQuoteChain=null;
 if(ordered.length){
  const r=ordered[0],i=r.identities[0],chain=i.chain;
  const url='https://api.coingecko.com/api/v3/simple/token_price/'+cgPlatforms[chain]+'?contract_addresses='+encodeURIComponent(i.contract)+'&vs_currencies=eur&include_last_updated_at=true';
  const headers=process.env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':process.env.COINGECKO_DEMO_KEY}:{};
  const j=await req(url,headers),last=logs.at(-1);contractQuoteChain=chain;
  contractQuoteStatus=last?.status??'UNKNOWN';contractQuoteError=last?.provider_error??null;
  if(last?.status!=='SKIPPED_PROVIDER_COOLDOWN'){contractQuoteAttempts=1;contractQuoteHistory[key(chain,i.contract)]=started_at;}
  const q=contractQuote(j,i,Date.now(),url);if(q){applyQuote(r,i,q);contractQuoteHits++;}
  if(contractQuoteStatus==='OK'&&contractQuoteHits===0)contractQuoteStatus='OK_NO_FRESH_MATCH';
 }
 // Independent EUR trades from Kraken, only if CoinGecko explicitly maps the asset ID to its EUR pair.
 // Cache identity mapping, never cache price freshness. No symbol-only fallback.
 let cache={};try{cache=prev.kraken_identity_cache??{}}catch{}
 const wanted=ranked.filter(r=>!r.id.startsWith('lead:')).slice(0,25);
 const mappingFresh=id=>cache[id]&&Number.isFinite(Date.parse(cache[id].verified_at))&&Date.now()>=Date.parse(cache[id].verified_at)&&Date.now()-Date.parse(cache[id].verified_at)<86400000;
 const queryIds=wanted.filter(r=>!mappingFresh(r.id)).map(r=>r.id);cacheHits.kraken_mapping=wanted.length-queryIds.length;
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
 const out={schema:'cleanroom.targeted.v1',mode:'RESEARCH_ONLY',started_at,finished_at,source_snapshot:e.finished_at,mapped_attempts:mappedAttempts,contract_quote_attempts:contractQuoteHistory,kraken_identity_cache:cache,risk_cache:riskCache,host_cooldown:Object.fromEntries(Object.entries(hostCooldown).filter(([,v])=>v>Date.now())),cache_reuse:cacheHits,lead_attempts:attempts,risk_attempts:riskAttempts,discovery_coverage:{registry_read:registryRead,eligible_raw_contracts:raw.size,selected_raw_contracts:selectedLeads,unselected_raw_contracts:Math.max(0,raw.size-selectedLeads),current_discovery_new_to_registry:currentUnseen,selected_new_to_registry:rawNewToRegistry,selected_first_attempt:rawFirstSelected,selected_overlap_previous_cycle:rawOverlap,selected_current_discovery:recent.length,selected_rotating_backlog:other.length,cumulative_raw_selection_keys:Object.keys(attempts).length,mapped_current:rows.filter(r=>!r.id.startsWith('lead:')&&currentIds.has(r.id)).length},rows,news:e.news??[],source_logs:[...(e.source_logs??[]),...logs],summary:{support_status:support.status,support_files:support.files,support_received:support.rows.length,support_selected:supportSelected.length,support_with_pool:rows.filter(r=>r.discovery_origin==='DOT_SUPPORT_DISCOVERY'&&r.identities.some(i=>i.pool)).length,support_fresh_quotes:rows.filter(r=>r.discovery_origin==='DOT_SUPPORT_DISCOVERY'&&r.research_ready).length,contract_quote_eligible:quoteEligible.length,contract_quote_candidates:contractQuoteAttempts,contract_quote_hits:contractQuoteHits,contract_quote_chain:contractQuoteChain,contract_quote_status:contractQuoteStatus,contract_quote_provider_error:contractQuoteError,contract_quote_single_retry:contractQuoteSingleRetry,raw_new_to_registry:rawNewToRegistry,raw_first_selected:rawFirstSelected,raw_overlap_previous_cycle:rawOverlap,raw_current_selected:recent.length,raw_backlog_selected:other.length,raw_cumulative_selection_keys:Object.keys(attempts).length,cache_primary_risk:cacheHits.primary_risk,cache_secondary_risk:cacheHits.secondary_risk,cache_kraken_mapping:cacheHits.kraken_mapping,assets:rows.filter(r=>!r.id.startsWith('lead:')).length,raw_leads_checked:selectedLeads,raw_leads_with_pool:rows.filter(r=>r.id.startsWith('lead:')&&r.identities.some(i=>i.pool)).length,raw_leads_with_timestamped_quote:rows.filter(r=>r.id.startsWith('lead:')&&r.research_ready).length,pool_mapped:rows.filter(r=>!r.id.startsWith('lead:')&&r.identities.some(i=>i.pool)).length,fresh_quote_and_pool:rows.filter(r=>!r.id.startsWith('lead:')&&r.research_ready).length,security_fields:rows.filter(r=>!r.id.startsWith('lead:')&&r.identities.some(i=>i.security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')).length,raw_leads_with_security_fields:rows.filter(r=>r.id.startsWith('lead:')&&r.identities.some(i=>i.security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')).length,fallback_quotes:rows.filter(r=>r.fallback_quote).length,kraken_quotes:rows.filter(r=>r.kraken_quote).length,news:(e.news??[]).length},limitations:'Research inputs only. No safety certification. DEX snapshot retrieval time is not a provider quote timestamp. FX daily indicative; candles are historic completed minute closes, not executable prices. Missing risk fields are unknown. Discovery remains bounded.'};
 // Compact, unranked evidence pages for agents with connector response-size limits.
 const pageSize=16, pages=[];
 const pageRoot=dir+'candidate-pages';
 await fs.mkdir(pageRoot,{recursive:true});
 const compact=rows.map(r=>({id:r.id,coin:r.coin,classification:r.classification??'MAPPED_ASSET',discovery_origin:r.discovery_origin??null,support_file:r.support_file??null,price_eur:r.price_eur,observed_at_utc:r.observed_at_utc,source_url:r.source_url,quote_scope:r.quote_scope??null,change_1h_pct:r.change_1h_pct, research_ready:r.research_ready,risk_status:r.risk_status, fallback_identity:r.fallback_identity??null, fallback_quote:r.fallback_quote??null,kraken_quote:r.kraken_quote??null,identities:r.identities.map(i=>({chain:i.chain,contract:i.contract,pool:i.pool,security:i.security,secondary_security:i.secondary_security??null,execution_costs:executionCosts(i,at)}))})).sort((a,b)=>a.id.localeCompare(b.id));
 for(let offset=0;offset<compact.length;offset+=pageSize){
  const filename='page-'+String(offset/pageSize).padStart(3,'0')+'.json',data=compact.slice(offset,offset+pageSize);
  await fs.writeFile(pageRoot+'/'+filename+'.tmp',JSON.stringify({schema:'cleanroom.candidate-page.v1',snapshot:finished_at,rows:data})+'\n');await fs.rename(pageRoot+'/'+filename+'.tmp',pageRoot+'/'+filename);
  pages.push({file:filename,count:data.length,ids:data.map(r=>r.id),fresh_research_rows:data.filter(r=>r.research_ready).length,active_pool_rows:data.filter(r=>r.identities.some(i=>(i.pool?.buys_1h??0)+(i.pool?.sells_1h??0)>0)).length});
 }
 // Small, automatically generated entry slice for tool-access testing, not a shortlist.
 // Rotate alphabetically by five-minute slot, with no BUY recommendation or manual token inputs.
 const entryOffset=Math.floor(Date.parse(finished_at)/300000);
 // Give the agent a small unranked entry across current market, new discovery and backlog.
 // No fixed list, BUY ranking or restriction on subsequent discovery.
 const segments=[compact.filter(r=>!r.id.startsWith('lead:')&&r.research_ready),compact.filter(r=>r.discovery_origin==='CURRENT_DISCOVERY'),compact.filter(r=>r.discovery_origin==='HISTORICAL_REGISTRY')];
 const entryRows=[],entryIds=new Set();
 for(const segment of segments){if(!segment.length)continue;const row=segment[entryOffset%segment.length];if(!entryIds.has(row.id)){entryRows.push(row);entryIds.add(row.id);}}
 for(let i=0;i<compact.length&&entryRows.length<3;i++){const row=compact[(entryOffset+i)%compact.length];if(!entryIds.has(row.id)){entryRows.push(row);entryIds.add(row.id);}}
 const entry={schema:'cleanroom.candidate-page.v1',snapshot:finished_at,rows:entryRows,selection:'ROTATING_UNRANKED_CURRENT_DISCOVERY_BACKLOG',limitations:'Unranked evidence only; choose and investigate independently. Read full index for broader discovery.'};
 await fs.writeFile(pageRoot+'/entry.json.tmp',JSON.stringify(entry)+'\n');await fs.rename(pageRoot+'/entry.json.tmp',pageRoot+'/entry.json');
 const index={schema:'cleanroom.candidate-index.v1',snapshot:finished_at,summary:out.summary,discovery_coverage:out.discovery_coverage,pages,entry_file:'entry.json',total_rows:compact.length,limitations:'Alphabetical evidence pages, no ranking or recommendations. Read page snapshot and index together. Risk fields are not safety guarantees. Historical prices must be checked for freshness.'};
 await fs.writeFile(pageRoot+'/index.json.tmp',JSON.stringify(index,null,2)+'\n');await fs.rename(pageRoot+'/index.json.tmp',pageRoot+'/index.json');
 await fs.writeFile(dir+'targeted-latest.json.tmp',JSON.stringify(out,null,2)+'\n');await fs.rename(dir+'targeted-latest.json.tmp',dir+'targeted-latest.json');console.log(JSON.stringify(out.summary));
}
