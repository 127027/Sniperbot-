// Research-only validator for historical training output. No network, wallet,
// order generation, publisher, trade engine or changes to customer balances.
const roles=new Set(['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa']);
const expected={start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-11-09T23:59:59Z',virtual_days:61};
function reject(m){throw Error('TRAINING_ONLY_INVALID: '+m)}
export function validateDotTrainingReport(report) {
 if(!report||typeof report!=='object'||Array.isArray(report))reject('INVALID_REPORT');
 if(report.schema!=='sniper_dots_training_only.v1'||!roles.has(report.role)||report.mode!=='TRAINING_ONLY')
  reject('INVALID_ROLE_OR_MODE');
 if(report.bot_handoff!=='PAUSED'||report.actionable!==false||report.paper_only!==true||
    report.trade_execution!==false||report.orders_sent!==0)reject('TRADE_HANDOFF_NOT_PAUSED');
 for(const [k,v] of Object.entries(expected))if(report.period?.[k]!==v)reject('WRONG_TEST_WINDOW');
 if(!['PENDING','COMPLETED','BLOCKED'].includes(report.state))reject('BAD_STATUS');
 const fields=['source_checks','early_narratives','token_identities','hypothetical_decisions','risk_unknowns','failure_reasons'];
 for(const k of fields)if(!Array.isArray(report[k])||report[k].length>5000)reject('INVALID_'+k);
 // This validator intentionally fails closed when a research report includes
 // anything that looks like a transferable order or a completed trade.
 const prohibited=new Set(['signals','signed_order','signed_orders','signature','serialized_tx',
  'recipient_wallet','private_key','order_payload','publisher_payload','gateway_post',
  'submit_order','execute_order','trade_receipt','paper_balance_change']);
 const visited=new Set();
 function scan(obj){
  if(obj===null||typeof obj!=='object'||visited.has(obj))return;
  visited.add(obj);
  for(const [k,v] of Object.entries(obj)){
   if(prohibited.has(k))reject('FORBIDDEN_FIELD_'+k);
   if((k==='actionable'||k==='trade_executed'||k==='executed'||k==='sent_to_bot')&&v===true)
    reject('EXECUTION_FLAG');
   if(k==='orders_sent'&&v!==0)reject('NONZERO_ORDERS');
   scan(v);
  }
 }
 scan(report);
 for(const d of report.hypothetical_decisions){
  if(!['WATCH','PAPER_BUY_HYPOTHESIS','HOLD_HYPOTHESIS','SELL_HYPOTHESIS','REJECT','UNTESTABLE'].includes(d?.decision))
   reject('UNKNOWN_HYPOTHETICAL_DECISION');
  if(d?.paper_only!==true||d?.actionable!==false)reject('HYPOTHESIS_NOT_RESEARCH_ONLY');
  if(typeof d?.virtual_day_utc!=='string'||!(/^\d{4}-\d\d-\d\d$/.test(d.virtual_day_utc))||
     d.virtual_day_utc<expected.start_utc.slice(0,10)||d.virtual_day_utc>expected.end_utc.slice(0,10))
   reject('OUTSIDE_HISTORICAL_WINDOW');
  if(d.decision==='PAPER_BUY_HYPOTHESIS'||d.decision==='SELL_HYPOTHESIS'){
   if(!['STRICT_ASOF','PROVISIONAL_ONLY','UNTESTABLE'].includes(d?.evidence_grade))
    reject('MISSING_EVIDENCE_GRADE');
   if(d.evidence_grade!=='STRICT_ASOF'&&d?.quote_usdc!=null)
    reject('QUOTE_CANNOT_BE_CLAIMED_FROM_PROVISIONAL_DATA');
  }
 }
 return report;
}
