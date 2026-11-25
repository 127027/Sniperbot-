// R46 canonical strategy sidecar, account-neutral, no network and no orders.
const allowed=['BUY','SELL','NO_ACTION'];
const status=['ASSESSED','PROVISIONAL','NOT_ASSESSED'];
const epoch=x=>typeof x==='string'?Date.parse(x):NaN;
const chainName=x=>({'robinhood chain':'robinhood','bnb chain':'bsc'}[x.toLowerCase()]??x.toLowerCase());
export function exactIdentity(d){
 if(!d||typeof d.chain!=='string'||!d.chain.trim()||typeof d.contract!=='string'||!d.contract.trim())throw Error('IDENTITY_REQUIRED');
 const c=chainName(d.chain.trim()),a=d.contract.trim();
 return c+':'+(c==='solana'?a:a.toLowerCase());
}
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
const validEvidence=(e,t)=>Array.isArray(e)&&e.length>0&&e.every(x=>https(x.source_url)&&Number.isFinite(epoch(x.observed_at_utc))&&epoch(x.observed_at_utc)<=t);
const quoteOK=(q,t)=>q&&Number.isFinite(q.price_eur)&&q.price_eur>0&&https(q.source_url)&&Number.isFinite(epoch(q.observed_at_utc))&&epoch(q.observed_at_utc)<=t&&t-epoch(q.observed_at_utc)<=900000;
const wireIdentity=d=>({coin:d.coin??d.aliases?.[0]??d.contract,chain:d.chain,contract:d.contract});
export function buildHour({registry=[],index=[],positions=[],priorUniverse=[],assessments=[],target_utc,decision_at_utc}){
 const target=epoch(target_utc),t=epoch(decision_at_utc);
 if(!Number.isFinite(target)||!Number.isFinite(t)||t<target||t>target+600000)throw Error('DECISION_WINDOW');
 const identities=new Map(),prior=new Map(),assessed=new Map();
 for(const d of [...index,...registry,...positions,...priorUniverse,...assessments]){const k=exactIdentity(d);if(!identities.has(k)||d.coin)identities.set(k,wireIdentity(d))}
 for(const d of priorUniverse){const k=exactIdentity(d);if(prior.has(k))throw Error('DUPLICATE_PRIOR');prior.set(k,d);identities.set(k,wireIdentity(d))}
 for(const a of assessments){const k=exactIdentity(a);if(assessed.has(k))throw Error('DUPLICATE_ASSESSMENT');if(!allowed.includes(a.strategy)||!status.includes(a.assessment_status))throw Error('INVALID_STRATEGY');assessed.set(k,a)}
 const rows=[],wire=[];
 for(const [k,d] of identities){
  const a=assessed.get(k),p=prior.get(k),e=validEvidence(a?.evidence,t),review=a&&e?a.assessment_status:'NOT_ASSESSED';
  let strategy=review==='ASSESSED'?a.strategy:'NO_ACTION',thesis=review==='PROVISIONAL'?(a.thesis??a.strategy):null;
  let reason=review==='NOT_ASSESSED'?'No adequate time-bounded evidence for current assessment.':String(a.reason??'Current assessment');
  const quote=a?.quote,ready=quoteOK(quote,t)&&a?.risk_clear===true&&review==='ASSESSED';
  if(p?.intent==='EXIT'&&!(strategy==='BUY'&&ready)){strategy='SELL';reason='Persistent prior EXIT; '+reason}
  const executable=strategy!=='NO_ACTION'&&ready&&(strategy===a.strategy||p?.intent==='EXIT'&&a.strategy!=='BUY');
  const execution_status=strategy==='NO_ACTION'?'NO_ORDER':executable?'READY':!quoteOK(quote,t)?'PRICE_PENDING':'RISK_OR_REVIEW_PENDING';
  rows.push({key:k,...d,strategy,assessment_status:review,thesis,execution_status,reason,evidence:e?a.evidence:[],quote:executable?quote:null});
  if(executable){wire.push({...d,action:strategy,reason,price_eur:quote.price_eur,observed_at_utc:new Date(epoch(quote.observed_at_utc)).toISOString(),source_url:quote.source_url,...(strategy==='SELL'?{fraction:1}:{})})}
  else if(p||positions.some(x=>exactIdentity(x)===k)||strategy!=='NO_ACTION'){wire.push({...d,action:'DATA_GAP',reason:'[STRATEGY '+strategy+'] [EXECUTION '+execution_status+'] '+reason})}
 }
 const counts=Object.fromEntries(allowed.map(s=>[s,rows.filter(x=>x.strategy===s).length]));
 const assessedCount=rows.filter(x=>x.assessment_status==='ASSESSED').length;
 return {schema:'r46.hour.v1',mode:'PAPER_ONLY',target_utc,decision_at_utc,rows,summary:{known:rows.length,assessed:assessedCount,provisional:rows.filter(x=>x.assessment_status==='PROVISIONAL').length,not_assessed:rows.filter(x=>x.assessment_status==='NOT_ASSESSED').length,strategies:counts,executable_buy:wire.filter(x=>x.action==='BUY').length,executable_sell:wire.filter(x=>x.action==='SELL').length,zero_buy_diagnosis:counts.BUY===0?{data_gap:rows.length-assessedCount,assessed_no_entry:rows.filter(x=>x.assessment_status==='ASSESSED'&&x.strategy!=='BUY').length,requires_research:true}:null},v1_projection:wire.length>500?null:wire,v1_capacity_incident:wire.length>500?{required:wire.length,limit:500}:null};
}
