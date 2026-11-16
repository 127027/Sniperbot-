// TECHNICAL FIXTURE ONLY: 120d deterministic strategy emulator (NOT historical GPT).
// Proves timing, sealed train/test boundary, in-memory GitHub pointer/archive,
// risk-gated PAPER BUY/HOLD/SELL, independent loss stop, and one-account ledger.
// Never writes to user's local state or research/r29/channel/*.
import {createHash} from 'node:crypto';
import {archivePath,contentSha256,validateGptPaperDecision,
 validateGptPaperPointer} from '../../runner/gpt-paper-protocol.mjs';
import {dayPlan,frequencyFromEvidence,slotsForDay,PHASE_B,
 DEFAULT_CUTOFF,INITIAL_TEST_USDC,EVIDENCE_GATES,asofOnly,
 independentlyTradeable} from './historical-audit.mjs';

const iso=t=>new Date(t).toISOString();
const at=(day,h=0)=>iso(Date.parse(day.day_start_utc)+h*3600000);
const money=x=>Math.round(x*1e8)/1e8;
const HEXA='0x'+'a'.repeat(40),HEXB='0x'+'b'.repeat(40);
const HEXC='0x'+'c'.repeat(40),HEXD='0x'+'d'.repeat(40);
const ASSETS={
 65:{name:'FIXTURE_ALPHA',chain:'base',token:HEXA,pool:HEXB},
 78:{name:'FIXTURE_BETA',chain:'base',token:HEXC,pool:HEXD}
};
const hash=s=>createHash('sha256').update(s).digest('hex');
export const IS_SYNTHETIC_ONLY=true;
export const FIXTURE_POLICY_FROZEN_AT_UTC=PHASE_B;

function situation(dayIndex,day){
 let profile=null;
 if(dayIndex===25)profile={unique_buyers:34,new_pools:5,minute_volume_change_pct:24}; //4
 if(dayIndex===41)profile={unique_buyers:96,new_pools:8,minute_volume_change_pct:120}; //12
 if(dayIndex===65)profile={unique_buyers:133,new_pools:7,minute_volume_change_pct:112}; //12
 if(dayIndex===78)profile={unique_buyers:244,new_pools:31,minute_volume_change_pct:124}; //24
 if(dayIndex===82)profile={unique_buyers:30,new_pools:6,minute_volume_change_pct:28}; //4
 return profile?{...profile,source_id:'SYNTHETIC_ASOF_ACTIVITY',
  observed_at_utc:day.day_start_utc,independently_attested:true,
  source_type:'SYNTHETIC_FIXTURE_NOT_REAL_DATA'}:null;
}
function generateEvidence(day,index){
 const asset=ASSETS[index];if(!asset)return [];
 const t=day.day_start_utc;
 return EVIDENCE_GATES.map((cat,i)=>({
  evidence_id:'fixture-'+index+'-'+i,source_type:'SYNTHETIC',
  category:cat,chain:asset.chain,token_address:asset.token,
  pool_address:asset.pool,event_at_utc:t,
  available_at_utc:t,independent_proof_at_utc:t,
  independent_provenance_verified:true,
  synthetic_fixture_only:true
 }));
}
function price(index,h){
 if(index===65)return h>=6?1.28:h>=4?1.12:h>=2?1.06:1.0;
 if(index===78)return h>=1.5?.84:h>=1?1.04:1.0;
 return null;
}
function makeDecision({day,index,action,h,asset=null,sequence=0}){
 const t=at(day,h);
 const trade=action==='BUY'||action==='SELL';
 const uid=hash('FIXTURE_'+index+'_'+h+'_'+action+'_'+sequence).slice(0,32);
 const score=action==='BUY'?85:null;
 const text=JSON.stringify({index,h,asset:asset?.name||'NONE'});
 return {schema:'sniper_r29_gpt_paper_decision.v1',
  mode:'PAPER_ONLY',strategy:'GPT_ONLY',decision_id:'gpt_'+uid,action,
  chain:asset?.chain||null,token_address:asset?.token||null,
  pool_address:asset?.pool||null,
  amount_test_usdc:action==='BUY'?50:null,
  created_at_utc:t,expires_at_utc:iso(Date.parse(t)+(trade?120000:3600000)),
  source_review_sha256:hash(text),
  source_observed_at_utc:t,
  evidence_ids:['research/replay-120d/FIXTURE_SOURCE_'+index,
   'research/replay-120d/FIXTURE_SECURITY_'+index],
  security_assessment:action==='BUY'?'VERIFIED':'UNKNOWN',
  score_0_100:score,
  reason_de:'Synthetische Testentscheidung prueft nur Zeitfolge, GitHub-Bridge und Paper-Buchung; niemals historische GPT-Handelsperformance.',
  risk_level:'HIGH',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false};
}
export function makeFixtureGithubPaperBridge(){
 const archives=new Map(),receipts=new Map(),ledger={
  initial_test_usdc:INITIAL_TEST_USDC,cash_test_usdc:INITIAL_TEST_USDC,
  positions:new Map(),closed_pnl_test_usdc:0,
  fills:[],guard_receipts:[],rejected:0
 };
 let latestPointer=null,nonce=0;
 function validCoin(d){return d.chain==='base'&&
  Object.values(ASSETS).some(a=>a.chain===d.chain&&a.token===d.token_address&&
   a.pool===d.pool_address);}
 function filled(d,status,reason,time){return {
  decision_id:d.decision_id,action:d.action,received_at_utc:time,
  status,reason,mode:'PAPER_ONLY',wallet_touched:false,
  real_trading_enabled:false,synthetic_fixture:true
 }}
 function getNetExposure(){
  return [...ledger.positions.values()].reduce((s,x)=>s+x.amount_test_usdc,0);
 }
 function perform(d,{now,quote=null,proof=false}={}){
  if(receipts.has(d.decision_id))return {...receipts.get(d.decision_id),duplicate:true};
  if(!['BUY','SELL'].includes(d.action)){
   const r=filled(d,d.action,'FIXTURE_RESEARCH_NO_ORDER',now);
   receipts.set(d.decision_id,r);return r;
  }
  const size=d.amount_test_usdc||50;
  if(!validCoin(d)||!proof||!Number.isFinite(quote?.price_usd)||
    quote.price_usd<=0||quote.chain!==d.chain||
    quote.token_address!==d.token_address||quote.pool_address!==d.pool_address||
    quote.observed_at_utc!==now){
   const r=filled(d,'BLOCKED','FIXTURE_PROOF_OR_FRESH_EXACT_QUOTE_REQUIRED',now);
   receipts.set(d.decision_id,r);ledger.rejected++;return r;
  }
  const key=d.chain+':'+d.token_address+':'+d.pool_address;
  let r=null;
  if(d.action==='BUY'){
   if(ledger.positions.has(key)||size!==50||
    size>INITIAL_TEST_USDC*.01||
    getNetExposure()+size>INITIAL_TEST_USDC*.03||
    ledger.cash_test_usdc<size){
    r=filled(d,'BLOCKED','FIXTURE_RISK_BUDGET_OR_DUPLICATE',now);
    ledger.rejected++;
   }else{
    ledger.positions.set(key,{
     coin:key,amount_test_usdc:size,entry_price_usd:quote.price_usd,
     qty:size*.99/quote.price_usd,opened_at_utc:now,
     high_water_price_usd:quote.price_usd,synthetic_fixture:true});
    ledger.cash_test_usdc=money(ledger.cash_test_usdc-size);
    ledger.fills.push({source:'SYNTHETIC_POLICY',action:'BUY',at_utc:now,coin:key,
     price_usd:quote.price_usd,stake_test_usdc:50,status:'PAPER_FILLED'});
    r=filled(d,'PAPER_FILLED','FIXTURE_BUY_PAPER_ONLY',now);
   }
  }else{
   const position=ledger.positions.get(key);
   if(!position){
    r=filled(d,'BLOCKED','FIXTURE_NO_GPT_OWNED_PAPER_POSITION',now);
    ledger.rejected++;
   }else{
    const proceeds=money(position.qty*quote.price_usd*.99);
    const pnl=money(proceeds-position.amount_test_usdc);
    ledger.cash_test_usdc=money(ledger.cash_test_usdc+proceeds);
    ledger.closed_pnl_test_usdc=money(ledger.closed_pnl_test_usdc+pnl);
    ledger.positions.delete(key);
    ledger.fills.push({source:'SYNTHETIC_POLICY',action:'SELL',at_utc:now,
     coin:key,price_usd:quote.price_usd,
     returned_test_usdc:proceeds,pnl_test_usdc:pnl,status:'PAPER_FILLED'});
    r=filled(d,'PAPER_FILLED','FIXTURE_GPT_SELL_PAPER_ONLY',now);
   }
  }
  receipts.set(d.decision_id,r);return r;
 }
 function send(d,{now,quote=null,proof=false}={}){
  if(!now||d.created_at_utc!==now)throw Error('FIXTURE_VIRTUAL_CLOCK_MISMATCH');
  // Write once immutable archive, hash-bound pointer: no actual GitHub calls.
  const text=JSON.stringify(d,null,2)+'\n';
  const p=archivePath(d.decision_id,d.created_at_utc);
  if(archives.has(p))throw Error('FIXTURE_ARCHIVE_OVERWRITE_BLOCKED');
  archives.set(p,text);nonce++;
  const pointer={schema:'sniper_r29_gpt_paper_pointer.v1',
   mode:'PAPER_ONLY',decision_id:d.decision_id,archive_path:p,
   archive_sha256:contentSha256(text),published_at_utc:d.created_at_utc,
   real_trading_enabled:false};
  latestPointer=pointer;
  validateGptPaperPointer(pointer,{now:Date.parse(now)});
  const fetched=archives.get(pointer.archive_path);
  if(contentSha256(fetched)!==pointer.archive_sha256)
   throw Error('FIXTURE_ARCHIVE_HASH_TAMPER');
  const decoded=JSON.parse(fetched);
  validateGptPaperDecision(decoded,{now:Date.parse(now),forExecution:true});
  const receipt=perform(decoded,{now,quote,proof});
  return {archive_path:p,archive_sha256:pointer.archive_sha256,
   pointer:{...pointer},receipt,simulated_github_write_count:++nonce};
 }
 function guardExit({asset,now,observed_price_usd}){
  const key=asset.chain+':'+asset.token+':'+asset.pool;
  const held=ledger.positions.get(key);
  if(!held||!Number.isFinite(observed_price_usd)||observed_price_usd<=0)
   return {status:'NOOP',source:'LOCAL_GUARD_FIXTURE'};
  const loss=observed_price_usd/held.entry_price_usd-1;
  if(loss>-.1)return {status:'HOLD',source:'LOCAL_GUARD_FIXTURE'};
  const proceeds=money(held.qty*observed_price_usd*.99);
  const pnl=money(proceeds-held.amount_test_usdc);
  ledger.cash_test_usdc=money(ledger.cash_test_usdc+proceeds);
  ledger.closed_pnl_test_usdc=money(ledger.closed_pnl_test_usdc+pnl);
  ledger.positions.delete(key);
  const r={source:'LOCAL_GUARD_FIXTURE',action:'SELL',status:'PAPER_FILLED',
   reason:'MODEL_STOP_LOSS_MINUS_10_PERCENT',at_utc:now,coin:key,
   price_usd:observed_price_usd,pnl_test_usdc:pnl,
   real_trading_enabled:false,synthetic_fixture:true};
  ledger.fills.push(r);ledger.guard_receipts.push(r);
  return r;
 }
 return {archives,receipts,ledger,send,guardExit,
  getLatestPointer:()=>latestPointer};
}
export function runSyntheticMechanics({cutoff=DEFAULT_CUTOFF}={}){
 const days=dayPlan({cutoff});
 const bridge=makeFixtureGithubPaperBridge();
 const daily=[],scanRecords=[],allDecisions=[];
 let highest=1;
 for(const day of days){
  const index=day.index;
  const activity=situation(index,day);
  const ff=frequencyFromEvidence(activity,{at:day.day_start_utc});
  const freq=ff.frequency_per_day;
  highest=Math.max(highest,freq);
  const slots=slotsForDay(day,freq);
  const evidence=generateEvidence(day,index);
  const actions={BUY:0,SELL:0,HOLD:0,WATCH:0,NO_TRADE:0,LOCAL_GUARD_SELL:0};
  const paperReceipts=[];
  for(const time of slots){
   const hour=(Date.parse(time)-Date.parse(day.day_start_utc))/3600000;
   // Local risk guard is independent of GPT scans. This intermediate 01:30
   // event is delivered before the hour-02 GPT scan, never at hour 00.
   if(index===78&&hour>=2&&actions.LOCAL_GUARD_SELL===0){
    const r=bridge.guardExit({asset:ASSETS[78],now:at(day,1.5),
     observed_price_usd:0.84});
    if(r.status==='PAPER_FILLED'){
     actions.LOCAL_GUARD_SELL++;
     paperReceipts.push(r);
    }
   }
   const asset=ASSETS[index]||null;
   const marketOpen=asset&&independentlyTradeable(evidence,time);
   const key=asset?asset.chain+':'+asset.token+':'+asset.pool:null;
   const pos=key?bridge.ledger.positions.get(key):null;
   let action='NO_TRADE';
   if(day.phase==='A_TRAIN_OBSERVE'&&activity)action='WATCH';
   else if(day.phase==='B_FROZEN_HOLDOUT'){
    if(index===82)action='WATCH'; // explicitly not independently safe
    else if(marketOpen&&asset&&pos){
     action=index===65&&price(index,hour)>=1.25?'SELL':'HOLD';
    }else if(marketOpen&&asset&&!bridge.ledger.fills.some(x=>x.coin===key&&x.action==='BUY'))
     action='BUY';
   }
   const d=makeDecision({day,index,action,h:hour,
    asset:action==='NO_TRADE'?null:(asset||ASSETS[65]),
    sequence:scanRecords.length});
   const quote=asset?{chain:asset.chain,token_address:asset.token,
    pool_address:asset.pool,price_usd:price(index,hour),
    observed_at_utc:time}:null;
   const sent=bridge.send(d,{now:time,quote,proof:!!marketOpen});
   actions[action]++;
   paperReceipts.push(sent.receipt);
   allDecisions.push({time,action,coin:asset?.name||null,phase:day.phase,
    source_class:'SYNTHETIC_FIXTURE_ONLY',receipt_status:sent.receipt.status,
    decision_id:d.decision_id,archive_path:sent.archive_path,
    pointer_sha256:sent.archive_sha256});
   scanRecords.push({time,phase:day.phase,date:day.date,frequency:freq,
    action,receipt:sent.receipt.status});
  }
  daily.push({date:day.date,phase:day.phase,planned_frequency_per_day:freq,
   actual_simulated_scans:slots.length,scan_times_utc:slots,
   activity_reason:ff.evidence_status,
   action_counts:actions,paper_receipts:paperReceipts,
   open_positions_after_day:bridge.ledger.positions.size,
   cash_after_day_test_usdc:bridge.ledger.cash_test_usdc,
   source_class:'SYNTHETIC_FIXTURE_ONLY'});
 }
 const totals={BUY:0,SELL:0,HOLD:0,WATCH:0,NO_TRADE:0,LOCAL_GUARD_SELL:0};
 daily.forEach(d=>Object.keys(totals).forEach(k=>totals[k]+=d.action_counts[k]));
 return {schema:'sniper_r29_120d_synthetic_mechanics.v1',
  source_class:'SYNTHETIC_FIXTURE_ONLY',
  fully_generated_gpt_model_calls:0,reported_real_market_trades:0,
  mode:'DISPOSABLE_IN_MEMORY_PAPER_LEDGER',
  no_actual_github_writes:true,no_wallet_access:true,
  train_test_policy_frozen_at_utc:FIXTURE_POLICY_FROZEN_AT_UTC,
  days:daily.length,simulated_scan_count:scanRecords.length,
  scans_by_phase:{
   train:daily.filter(d=>d.phase==='A_TRAIN_OBSERVE').reduce((s,d)=>s+d.actual_simulated_scans,0),
   holdout:daily.filter(d=>d.phase==='B_FROZEN_HOLDOUT').reduce((s,d)=>s+d.actual_simulated_scans,0)},
  maximum_frequency_per_day:highest,actions:totals,
  closed_synthetic_trade_count:bridge.ledger.fills.filter(x=>x.action==='SELL').length,
  synthetic_buy_count:bridge.ledger.fills.filter(x=>x.action==='BUY').length,
  simulated_wallet_trades:0,
  cash_test_usdc:bridge.ledger.cash_test_usdc,
  closed_pnl_test_usdc:bridge.ledger.closed_pnl_test_usdc,
  open_positions:bridge.ledger.positions.size,
  paper_receipt_count:bridge.receipts.size,
  github_archive_count:bridge.archives.size,
  paper_fills:bridge.ledger.fills,
  daily,decision_journal:allDecisions,
  conclusion:'TECHNICAL_WORKFLOW_ONLY_NOT_ACTUAL_2026_MEMECOIN_PERFORMANCE'};
}
