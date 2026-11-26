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
function security(raw,chain,contract){
 if(raw?.code!==1&&raw?.code!=='1')return {status:'UNAVAILABLE'};
 const v=Object.entries(raw.result??{}).find(([a])=>norm(chain,a)===norm(chain,contract))?.[1];if(!v||typeof v!=='object'||!Object.keys(v).length)return {status:'UNAVAILABLE'};
 const fields=['is_honeypot','cannot_sell_all','is_blacklisted','is_mintable','is_proxy','is_open_source','buy_tax','sell_tax','transfer_pausable','hidden_owner','mintable','freezable','non_transferable','transfer_fee','metadata_mutable','default_account_state','holder_count'];
 const evidence=Object.fromEntries(fields.filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]));
 const flags=['is_honeypot','cannot_sell_all','is_blacklisted','hidden_owner'].filter(k=>String(v[k])==='1');if(number(v.sell_tax)!==null&&number(v.sell_tax)>=0.5)flags.push('HIGH_SELL_TAX');
 return {status:Object.keys(evidence).length?'PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT':'UNAVAILABLE',flags,fields:evidence,source:'GoPlus'};
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
 console.log('Targeted evidence fixtures passed');
}else{
 const started_at=now(), e=JSON.parse(await fs.readFile(dir+'evidence-latest.json','utf8'));let prev={rows:[]};
 try{prev=JSON.parse(await fs.readFile(dir+'targeted-latest.json','utf8'))}catch{}
 // Prior identities survive an upstream outage; their old quotes are never treated as current.
 const map=new Map((e.rows??[]).map(r=>[r.id,r]));for(const r of prev.rows??[])if(!map.has(r.id))map.set(r.id,{...r,price_eur:null,observed_at_utc:null,source_url:null,identities:r.identities.map(i=>({chain:i.chain,contract:i.contract,pool:null})),risk_status:'NOT_ASSESSED'});
 const rows=[...map.values()].slice(0,160);
 const groups=new Map();for(const r of rows)for(const i of r.identities??[]){if(!nets[i.chain])continue;if(!groups.has(i.chain))groups.set(i.chain,new Set());groups.get(i.chain).add(i.contract)}
 const pools=new Map(),sec=new Map(),work=[];
 for(const [chain,set] of groups)for(const addresses of chunks([...set],30))work.push(async()=>{const url=base+chain+'/'+addresses.join(',');const j=await req(url);const retrieved=now();for(const a of addresses){const p=selectPairs(j,chain,a);if(p)pools.set(key(chain,a),pool(p,url,retrieved))}});
 await batch(work);
 const securityWork=[];for(const [chain,set] of groups)for(const addresses of chunks([...set].filter(a=>pools.has(key(chain,a))),20))securityWork.push(async()=>{const url='https://api.gopluslabs.io/api/v1/'+(chain==='solana'?'solana/token_security':'token_security/'+ids[chain])+'?contract_addresses='+addresses.join(',');const j=await req(url);for(const a of addresses)sec.set(key(chain,a),{...security(j,chain,a),source_url:url,retrieved_at:now()})});
 await batch(securityWork,3);
 const candidates=[];for(const r of rows){for(const i of r.identities??[]){i.pool=pools.get(key(i.chain,i.contract))??null;i.security=sec.get(key(i.chain,i.contract))??{status:'UNAVAILABLE'};if(i.pool)candidates.push({r,i})}r.identities.sort((a,b)=>(b.pool?.liquidity_usd??0)-(a.pool?.liquidity_usd??0));}
 // Primary quotes remain asset-level; fallback uses completed pool candles, never DEX retrieval time as provider time.
 const ranked=rows.filter(r=>r.identities[0]?.pool).sort((a,b)=>(b.change_1h_pct??0)-(a.change_1h_pct??0));
 const needs=ranked.filter(r=>!fresh(r.observed_at_utc,Date.now())).slice(0,12);
 const probes=[...needs,...ranked.filter(r=>!needs.includes(r)).slice(0,2)];
 const fx=probes.length?await req('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'):null;
 for(const r of probes){const i=r.identities[0],url=gt+nets[i.chain]+'/pools/'+i.pool.pool_address+'/ohlcv/minute?aggregate=1&limit=5&currency=usd&token=base';const j=await req(url);const q=candleQuote(j,i,fx,Date.now(),url);if(q){r.fallback_quote={...q,chain:i.chain,contract:i.contract};if(!fresh(r.observed_at_utc,Date.now())){Object.assign(r,q);r.fallback_identity={chain:i.chain,contract:i.contract}}}}
 const finished_at=now(),at=Date.parse(finished_at);
 for(const r of rows){const i=r.identities.find(x=>r.fallback_identity?key(x.chain,x.contract)===key(r.fallback_identity.chain,r.fallback_identity.contract):x.pool);r.research_ready=Boolean(i?.pool&&fresh(r.observed_at_utc,at)&&number(r.price_eur)>0&&i.pool.volume_1h_usd!==null&&i.pool.sells_1h!==null);r.risk_status=i?.security?.status??'UNAVAILABLE';r.decision_status='RESEARCH_INPUT_NOT_BUY'}
 const out={schema:'cleanroom.targeted.v1',mode:'RESEARCH_ONLY',started_at,finished_at,source_snapshot:e.finished_at,rows,news:e.news??[],source_logs:[...(e.source_logs??[]),...logs],summary:{assets:rows.length,pool_mapped:rows.filter(r=>r.identities.some(i=>i.pool)).length,fresh_quote_and_pool:rows.filter(r=>r.research_ready).length,security_fields:rows.filter(r=>r.identities.some(i=>i.security.status==='PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT')).length,fallback_quotes:rows.filter(r=>r.fallback_quote).length,news:(e.news??[]).length},limitations:'Research inputs only. No safety certification. DEX snapshot retrieval time is not a provider quote timestamp. FX daily indicative; candles are historic completed minute closes, not executable prices. Missing risk fields are unknown. Discovery remains bounded.'};
 await fs.writeFile(dir+'targeted-latest.json.tmp',JSON.stringify(out,null,2)+'\n');await fs.rename(dir+'targeted-latest.json.tmp',dir+'targeted-latest.json');console.log(JSON.stringify(out.summary));
}
