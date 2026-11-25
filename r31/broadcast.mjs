// One immutable, account-neutral hourly broadcast. All currency is indicative PAPER.
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const canonical=x=>iso(x)&&new Date(x).toISOString()===x;
export function identity(d){
 if(!d||typeof d.chain!=='string'||typeof d.contract!=='string'||!d.chain.trim()||!d.contract.trim()||d.chain!==d.chain.trim()||d.contract!==d.contract.trim())throw Error('INVALID_IDENTITY');
 return d.chain.toLowerCase()+':'+(/^(ethereum|base|bsc|bnb chain|arbitrum|polygon|optimism|avalanche)$/i.test(d.chain)?d.contract.toLowerCase():d.contract);
}
const only=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
export function validateBroadcast(s){
 if(!only(s,['schema','mode','sequence','target_utc','published_at_utc','expires_at_utc','decisions','previous_blob_sha'])||s.schema!=='r31.broadcast.v1'||s.mode!=='PAPER_ONLY'||!Number.isSafeInteger(s.sequence)||s.sequence<1||!canonical(s.target_utc)||s.target_utc.slice(14)!=='00:00.000Z'||!canonical(s.published_at_utc)||!canonical(s.expires_at_utc)||!Array.isArray(s.decisions)||s.decisions.length>500)throw Error('INVALID_BROADCAST');
 const t=Date.parse(s.target_utc),p=Date.parse(s.published_at_utc),e=Date.parse(s.expires_at_utc);
 if(p<t||p>t+10*60000||e<=p||e>t+15*60000)throw Error('INVALID_SIGNAL_WINDOW');
 if(s.sequence===1?s.previous_blob_sha!==null:!/^[a-f0-9]{40}$/.test(s.previous_blob_sha??''))throw Error('INVALID_PREVIOUS_SIGNAL');
 const seen=new Set();
 for(const d of s.decisions){
  if(!only(d,['coin','chain','contract','action','price_eur','observed_at_utc','source_url','reason','fraction'])||!['BUY','SELL','HOLD','WATCH','NO_TRADE','DATA_GAP'].includes(d.action)||typeof d.coin!=='string'||!d.coin.trim()||typeof d.reason!=='string'||!d.reason.trim())throw Error('INVALID_DECISION');
  const k=identity(d);if(seen.has(k))throw Error('DUPLICATE_DECISION');seen.add(k);
  if(d.action==='SELL'&&d.fraction!==undefined&&(!Number.isFinite(d.fraction)||d.fraction<=0||d.fraction>1))throw Error('INVALID_FRACTION');
  if(d.fraction!==undefined&&d.action!=='SELL')throw Error('UNEXPECTED_FRACTION');
  if(['BUY','SELL','HOLD'].includes(d.action)){
   if(!(Number.isFinite(d.price_eur)&&d.price_eur>0)||!canonical(d.observed_at_utc)||Date.parse(d.observed_at_utc)>p||p-Date.parse(d.observed_at_utc)>15*60000)throw Error('INVALID_SIGNAL_PRICE');
   let u;try{u=new URL(d.source_url)}catch{throw Error('INVALID_SOURCE')};if(u.protocol!=='https:'||u.username||u.password)throw Error('INVALID_SOURCE');
  }
 }
 return s;
}
