// Only an evidence preflight for historical GPT decisions. No model outputs,
// trades, generated prices, paid API, live GitHub pointer or wallet operations.
// Missing evidence means NO_ORDER_EVIDENCE_GAP, NOT a strategic GPT NO_TRADE.
export const HISTORICAL_EVIDENCE_SCHEMA='sniper_r29_historical_trade_preflight.v1';
export const REQUIRED_PROOFS=[
 'NEUTRAL_CANDIDATE_IDENTITY',
 'ASOF_POOL_AND_RESERVES',
 'ASOF_CONTRACT_OR_MINT_SECURITY',
 'ASOF_INDEPENDENT_WALLET_DEMAND',
 'ASOF_BIDIRECTIONAL_SWAPABILITY',
 'ASOF_EXECUTABLE_COSTED_QUOTE'
];
const ts=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))?
 Date.parse(t):NaN;
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const addrEvm=/^0x[a-fA-F0-9]{40}$/;
export function assessHistoricalPreflight(input){
 const asof=ts(input?.asof_utc);
 if(!Number.isFinite(asof))throw Error('ASOF_CLOCK_REQUIRED');
 const chain=input?.chain,mint=input?.token_address;
 if(!['solana','ethereum','base','bsc'].includes(chain)||
   (chain==='solana'?!ADDRESS.test(mint||''):!addrEvm.test(mint||'')))
  throw Error('ASOF_CONTRACT_IDENTITY_INVALID');
 const evidence=Array.isArray(input?.evidence)?input.evidence:[];
 if(evidence.length>100)throw Error('ASOF_EXCESSIVE_EVIDENCE');
 const accepted=[],rejected=[];
 for(const x of evidence){
  if(!x||typeof x!=='object'||!REQUIRED_PROOFS.includes(x.type)||
   typeof x.source_uri!=='string'||!x.source_uri.startsWith('https://')||
   typeof x.source_sha256!=='string'||!/^[a-f0-9]{64}$/i.test(x.source_sha256)||
   typeof x.proof_id!=='string'||!x.proof_id||
   typeof x.token_address!=='string'||x.token_address!==mint||
   x.chain!==chain||x.independent_asof_proof!==true||
   typeof x.tradable_from_historical_pool!=='boolean'|| 
   !Number.isFinite(ts(x.event_at_utc))||
   !Number.isFinite(ts(x.evidence_available_at_utc))||
   ts(x.event_at_utc)>asof||
   ts(x.evidence_available_at_utc)>asof||
   ts(x.evidence_available_at_utc)<ts(x.event_at_utc)){
   rejected.push({type:x?.type||'UNKNOWN',
    reason:'UNVERIFIED_PROVENANCE_OR_FUTURE_OR_OTHER_TOKEN'});
   continue;
  }
  // Spot swapability and quotes must be very recent relative to as-of clock.
  if(['ASOF_BIDIRECTIONAL_SWAPABILITY','ASOF_EXECUTABLE_COSTED_QUOTE',
      'ASOF_POOL_AND_RESERVES'].includes(x.type)&&
   asof-ts(x.event_at_utc)>5*60000){
   rejected.push({type:x.type,reason:'STALE_ASOF_LIQUIDITY_OR_EXECUTION'});
   continue;
  }
  if(x.tradable_from_historical_pool!==true){
   rejected.push({type:x.type,reason:'NO_VERIFIED_TRADEABILITY'});
   continue;
  }
  accepted.push(x);
 }
 const validated=new Set(accepted.map(x=>x.type));
 const missing=REQUIRED_PROOFS.filter(t=>!validated.has(t));
 const action=missing.length?'NO_ORDER_EVIDENCE_GAP':'REVIEWABLE_BY_GPT_PAPER_ONLY';
 return {schema:HISTORICAL_EVIDENCE_SCHEMA,
  mode:'HISTORICAL_RESEARCH_ONLY',
  asof_utc:input.asof_utc,chain,token_address:mint,
  source_proofs_accepted:accepted.length,
  source_proofs_rejected:rejected,
  missing_required_proofs:missing,
  permission:action,
  model_decision_generated:false,
  gpt_buy_decision:null,
  actual_historical_buy_or_sell_fill:false,
  historical_usdc_profit_loss:null,
  wallet_or_live_paper_mutated:false};
}
