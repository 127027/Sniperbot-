// One-shot network diagnostics. Public HTML only; no accounts, APIs, keys or writes.
const cases=[
 ['BASKET','3Tg6YnNrfPdFfsY14MaNsDMWLseAyrUDS3myJtbaJN6f','CixcofsPwHnYWjsoDxXxvLd6uM5fH7w8MFPL9mpQpqtX'],
 ['PERRO','4Di56UJzpnb7E4D7aLXFf7aLF5TrpJYv9Q3mR398pump','4s1epXdedd7TY1UtJ7frou3saSxuG98os7HcPtNEu8WH']
];
async function inspect(coin,contract,pool,url){
 const start=new Date().toISOString();
 try{
  const r=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','Cache-Control':'no-cache'}});
  const type=r.headers.get('content-type')??'';
  if(!r.ok||!type.includes('text/html'))return {coin,url,http:r.status,type,result:'NO_HTML',started_at_utc:start};
  const reader=r.body.getReader(),decoder=new TextDecoder();let html='',size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();return {coin,url,http:r.status,result:'BODY_LIMIT',started_at_utc:start}}html+=decoder.decode(value,{stream:true})}
  html+=decoder.decode();
  // Diagnostic hints only: raw HTML occurrences are not proof that these
  // values describe the same market observation.
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/[\u2066-\u2069\u200e\u200f]/g,'').replace(/\s+/g,' ');
  const samples=[...text.matchAll(/(?:As of|Updated)\s+[^<>]{0,120}?UTC/gi)].slice(0,3).map(x=>x[0]);
  // Bounded diagnostic contexts, not prices approved for settlement.
  const raw=html.replace(/&quot;/g,'"').replace(/&#34;/g,'"').replace(/&amp;/g,'&');
  const matches=[...raw.matchAll(/(?:["'](?:blockTime|timestamp|updatedAt|lastTradeAt|priceUsd|price_usd|tradeTime|lastUpdated|poolAddress|pairAddress|generatedAt)["']\s*[:=]|<time\b|datetime=["']|2026-11-25T\d{2}:\d{2}:\d{2})/gi)].slice(0,14);
  const field_hints=matches.map(m=>raw.slice(Math.max(0,m.index-24),Math.min(raw.length,m.index+140)).replace(/\s+/g,' ').replace(/[\u0000-\u001f]/g,''));
  const trade_hints=[...text.matchAll(/(?:\b\d{1,2}:\d{2}(?::\d{2})?\s*UTC\b|\b\d{1,2}:\d{2}:\d{2}\b)/g)].slice(0,5).map(m=>text.slice(Math.max(0,m.index-50),m.index+110));
  return {field_hints,trade_hints,coin,url,http:r.status,type,size,exact_contract_present:html.includes(contract),exact_pool_present:html.includes(pool),timestamp_hints:samples,result:'HTML_REACHED_NOT_VERIFIED_QUOTE',started_at_utc:start};
 }catch(e){return {coin,url,result:'FETCH_FAILED',error:e.cause?.code??e.name,started_at_utc:start}}
}
const outcomes=await Promise.all(cases.flatMap(([coin,contract,pool])=>[
 inspect(coin,contract,pool,'https://dextrading.com/tokens/solana/'+contract),
 inspect(coin,contract,pool,'https://sasapad.fun/x/solana/'+contract+'/'),
 inspect(coin,contract,pool,'https://www.dexalerts.io/token/solana/'+contract),
 ...(coin==='PERRO'?[inspect(coin,contract,pool,'https://pumpscan.io/token/'+contract)]:[])
]));
console.log(JSON.stringify({mode:'DIAGNOSTIC_ONLY',outcomes},null,2));
