// Independent evidence-gated model strategy for ISOLATED historical replay.
// There is no network access, GitHub write, wallet, OpenAI call, or hindsight winner input.
// This is NOT the cloud GPT strategy; it tests that the same PAPER execution gates
// can create both BUY and SELL from pre-existing market observations.
import {newState,settlePaper,inspectOrder,Reject,marketKey,DEFAULT_POLICY} from './core.mjs';
import {researchDue,chooseCadence} from './cadence.mjs';

const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const ms=value=>typeof value==='string'&&ISO.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const iso=value=>new Date(value).toISOString();
const decisionId=(at,kind,idx)=>'shadow-'+kind.toLowerCase()+'-'+at.toString(36)+'-'+String(idx).padStart(2,'0');
function gate(snapshot,now){
 if(!snapshot||!['SYNTHETIC_TEST','CONTEMPORANEOUS_RECORD'].includes(snapshot.provenance))return 'UNKNOWN_PROVENANCE';
 const observed=ms(snapshot.observed_at_utc),captured=ms(snapshot.archived_at_utc);
 if(observed===null||captured===null||observed>now||captured>now)return 'FUTURE_OR_UNVERIFIED_ARCHIVE';
 if(now-observed>600000)return 'SNAPSHOT_TOO_OLD';
 if(snapshot.provenance==='CONTEMPORANEOUS_RECORD'&&(!snapshot.source_archive_sha||snapshot.source_archive_sha.length!==40))return 'ARCHIVE_SHA_MISSING';
 if(!snapshot.discovery||!snapshot.risk)return 'DOT_CHAIN_MISSING';
 if(snapshot.risk.status!=='ELIGIBLE')return 'RISK_NOT_ELIGIBLE';
 for(const stamp of [snapshot.discovery.observed_at_utc,snapshot.risk.observed_at_utc]){
   const t=ms(stamp);if(t===null||t>now||t>observed)return 'DOT_CHAIN_FUTURE';
 }
 if(!Array.isArray(snapshot.quotes)||snapshot.quotes.length<2)return 'MISSING_QUOTES';
 for(const q of snapshot.quotes){
   const t=ms(q.observed_at);
   const published=ms(q.source_published_at_utc);
   if(t===null||published===null||t>observed||published>observed||t>now||published>now)return 'QUOTE_FUTURE_OR_UNDATED';
 }
 // A previous momentum reference has to pass the exact same PAPER quote,
 // liquidity and pool identity gates; otherwise later momentum is contaminated.
 try{inspectOrder(policyOrder(snapshot,now,'BUY',0),newState(),now,DEFAULT_POLICY);}
 catch(error){return error instanceof Reject?'QUOTE_GATE_'+error.code:'QUOTE_GATE_UNEXPECTED_ERROR';}
 return null;
}
function policyOrder(snapshot,now,action,idx){
 return {id:decisionId(now,action,idx),mode:'PAPER',authority:'dot-4-strategy',action,
   dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
   reason:'Independent historical shadow strategy with timestamped point-in-time observations',
   quote_quality:'INDICATIVE_WEB_ONLY',
   created_at:iso(now),expires_at:iso(now+120000),coin:snapshot.coin,
   ...(action==='BUY'?{amount_test_usdc:50}:{}),quotes:snapshot.quotes.map(({source_published_at_utc,...q})=>q)};
}
export function replaySignalDecisions({date,snapshots=[],activityObservations=[],targetPer24h=4,forceHourlyReview=false,params={}}){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z')))
   throw Error('INVALID_DATE');
 if(![4,8,12,24].includes(targetPer24h))throw Error('INVALID_TARGET');
 if(typeof forceHourlyReview!=='boolean')throw Error('INVALID_FORCE_HOURLY');
 if(!Array.isArray(snapshots)||!Array.isArray(activityObservations))throw Error('INVALID_SNAPSHOTS');
 const start=ms(date+'T00:00:00Z'),end=start+86400000;
 const p={entryMomentumPct:5,takeProfitPct:20,stopLossPct:10,maxMomentumAgeHours:2,...params};
 if(![p.entryMomentumPct,p.takeProfitPct,p.stopLossPct,p.maxMomentumAgeHours].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0))throw Error('INVALID_PARAMS');
 const state=newState(),initial=state.cash,events=[],sums={dataGap:0,available:0,fullReviews:0,buys:0,sells:0};
 let ledger=state,lastReview=null,sequence=0,currentTarget=targetPer24h;
 const history=new Map();
 // Training from BEFORE the day: no future snapshots; requires complete original
 // timestamps, matching quotes, and prior observations available before day start.
 for(const s of [...snapshots].sort((a,b)=>(ms(a?.observed_at_utc)??0)-(ms(b?.observed_at_utc)??0))){
   const at=ms(s?.observed_at_utc),captured=ms(s?.archived_at_utc);
   if(at===null||captured===null||at>=start||captured>start||start-at>p.maxMomentumAgeHours*3600000)continue;
   if(gate(s,Math.max(at,captured))!==null)continue;
   const price=s.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/s.quotes.length;
   history.set(marketKey(s.coin),{price,at_utc:s.observed_at_utc});
 }

 // Input MUST be independently collected and available at its own timestamp.
 // We evaluate every hour :35 and never preselect winners or sort by future performance.
 for(let hour=0;hour<24;hour++){
   const tick=start+hour*3600000+35*60000,at=iso(tick);
   // Dot 1 determines cadence from measured *as-of* activity on the first scan,
   // and on later hourly wakes. No evidence -> hold last setting.
   const activity=activityObservations.filter(x=>{
     const observed=ms(x?.observed_at_utc),captured=ms(x?.archived_at_utc);
     return observed!==null&&captured!==null&&observed<=tick&&captured<=tick
       &&tick-observed<=3600000&&x.provenance==='CONTEMPORANEOUS_RECORD'
       &&typeof x.source_archive_sha==='string'&&/^[0-9a-f]{40}$/.test(x.source_archive_sha);
   }).sort((a,b)=>ms(b.observed_at_utc)-ms(a.observed_at_utc))[0];
   const cadence=forceHourlyReview?{target:24,reason:'EXPLICIT_24_HOUR_DIAGNOSTIC'}:chooseCadence(activity?activity.metrics:null,currentTarget);
   currentTarget=cadence.target;
   const due=researchDue(at,lastReview,currentTarget).due;
   if(due){lastReview=at;sums.fullReviews++;}
   const valid=[],blocked=[];
   for(const s of snapshots){
     const observed=ms(s?.observed_at_utc);
     if(observed===null||observed>tick||tick-observed>600000)continue;
     const reason=gate(s,tick);
     if(reason){blocked.push({coin:s?.coin?.symbol||null,reason});continue;}
     valid.push(s);
   }
   valid.sort((a,b)=>String(a.coin.chain).localeCompare(String(b.coin.chain))||String(a.coin.contract).localeCompare(String(b.coin.contract))||String(a.coin.pool).localeCompare(String(b.coin.pool))||ms(a.observed_at_utc)-ms(b.observed_at_utc));
   const fresh=new Map();
   for(const s of valid)fresh.set(marketKey(s.coin),s);
   const step={at_utc:at,full_review:due,target_per_24h:currentTarget,cadence_reason:cadence.reason,eligible_snapshots:fresh.size,blocked_sources:blocked,status:'NO_TRADE',actions:[]};
   if(!fresh.size){sums.dataGap++;step.status='DATA_GAP_NO_FRESH_QUOTES';events.push(step);continue;}
   sums.available++;
   // Open positions are examined hourly; no 6h delay until next full discovery review.
   for(const [key,position] of Object.entries(ledger.positions)){
     const candidate=fresh.get(key);
     if(!candidate)continue;
     const avg=candidate.quotes.reduce((total,q)=>total+q.price_usdc,0)/candidate.quotes.length;
     const move=(avg/position.entryPrice-1)*100;
     let reason=move>=p.takeProfitPct?'TAKE_PROFIT':move<=-p.stopLossPct?'STOP_LOSS':null;
     if(!reason)continue;
     const order=policyOrder(candidate,tick,'SELL',sequence++);
     try{
       const settled=settlePaper(order,ledger,tick,DEFAULT_POLICY);ledger=settled.state;
       sums.sells++;step.status='SELL';step.actions.push({action:'SELL',reason,coin:candidate.coin,at_utc:at,
         simulated_price_usdc:settled.receipt.execution_price_usdc,realized_pnl_test_usdc:settled.receipt.realized_pnl_test_usdc,
         paper_receipt_status:'SYNTHETIC_REPLAY_ONLY'});
     }catch(err){step.actions.push({action:'SELL_REJECTED',code:err instanceof Reject?err.code:'UNEXPECTED_ERROR',reason});}
   }
   // A BUY needs at least one earlier recorded, time-valid quote: momentum computed
   // only from earlier records, never from a later daily winner table.
   if(due){
     for(const [key,candidate] of fresh.entries()){
       if(ledger.positions[key])continue;
       const prev=history.get(key);
       if(!prev)continue;
       const prevAt=ms(prev.at_utc),currentAt=ms(candidate.observed_at_utc);
       if(prevAt===null||currentAt===null||currentAt<=prevAt||currentAt-prevAt>p.maxMomentumAgeHours*3600000)continue;
       const price=candidate.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/candidate.quotes.length;
       const rise=(price/prev.price-1)*100;
       if(!(rise>=p.entryMomentumPct))continue;
       const order=policyOrder(candidate,tick,'BUY',sequence++);
       try{
         const settled=settlePaper(order,ledger,tick,DEFAULT_POLICY);ledger=settled.state;
         sums.buys++;step.status='BUY';step.actions.push({action:'BUY',reason:'POSITIVE_OBSERVED_MOMENTUM',
           observed_momentum_pct:rise,coin:candidate.coin,at_utc:at,
           simulated_price_usdc:settled.receipt.execution_price_usdc,
           paper_receipt_status:'SYNTHETIC_REPLAY_ONLY'});
       }catch(err){step.actions.push({action:'BUY_REJECTED',code:err instanceof Reject?err.code:'UNEXPECTED_ERROR'});}
     }
   }
   // Update history after evaluating signals to prohibit look-ahead.
   for(const [key,s] of fresh.entries()){
     const price=s.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/s.quotes.length;
     history.set(key,{price,at_utc:s.observed_at_utc});
   }
   events.push(step);
 }
 return {schema:1,kind:'EVIDENCE_GATED_SHADOW_STRATEGY',date,mode:'ISOLATED_SHADOW_PAPER',
   source_count:snapshots.length,starting_cash_test_usdc:initial,ending_cash_test_usdc:ledger.cash,
   positions_end:Object.keys(ledger.positions).length,summary:sums,events,
   reality_status:snapshots.length===0?'DATA_GAP_NO_HISTORICAL_INPUT':'NOT_A_CLOUD_DOT_ORDER_OR_CLIENT_FILL',
   caution:'Only timestamps in supplied evidence are checked, not their external authenticity. Synthetic observations are not actual historical prices.'};
}
