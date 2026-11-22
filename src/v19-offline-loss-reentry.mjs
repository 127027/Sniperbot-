// D4-05: compare re-entry after a *modeled realized loss* without altering
// the unified signal, Dot3, trading permissions or closed client positions.
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const oracle=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||'post_event_rank' in x||x.source_class==='POST_EVENT_ORACLE');
export function studyLossReentryRecovery({
 lossReceipt,observations=[],asOfUtc,policyFrozenAtUtc,
 baselineCooldownMinutes=60,comparisonCooldownMinutes=120
}={}){
 const now=ms(asOfUtc),frozen=ms(policyFrozenAtUtc),loss=ms(lossReceipt?.timestamp);
 if(now===null||frozen===null||loss===null||frozen>loss||loss>now
  ||lossReceipt?.action!=='SELL'||lossReceipt?.status!=='MODELED_FILL_NOT_CLIENT'
  ||lossReceipt.provenance!=='SYNTHETIC_REPLAY_ONLY'
  ||lossReceipt.verified_client_fill!==false
  ||!Number.isFinite(lossReceipt.realized_pnl_test_usdc)
  ||lossReceipt.realized_pnl_test_usdc>=0
  ||!Array.isArray(observations)||observations.length>10000
  ||!Number.isInteger(baselineCooldownMinutes)||baselineCooldownMinutes<0
  ||!Number.isInteger(comparisonCooldownMinutes)
  ||comparisonCooldownMinutes<baselineCooldownMinutes)
  throw Error('INVALID_SHADOW_LOSS_REENTRY_STUDY');
 const valid=[],rejected=[];
 for(const [index,x] of observations.entries()){
  const at=ms(x?.observed_at_utc),available=ms(x?.available_at_utc);
  if(oracle(x)||!['ORIGINAL_CAPTURE','SYNTHETIC_TEST'].includes(x?.source_class)
   ||x?.chain!==lossReceipt.coin.chain||x?.contract!==lossReceipt.coin.contract
   ||x?.pool!==lossReceipt.coin.pool
   ||at===null||available===null||available<at||at<loss
   ||at>now||available>now||!positive(x.price_usdc)
   ||!positive(x.liquidity_usd)
   ||typeof x.source_path!=='string'||!x.source_path.startsWith('research/')){
   rejected.push({index,reason:'UNAVAILABLE_OR_WRONG_POOL_OR_ORACLE'});continue;
  }
  valid.push(x);
 }
 valid.sort((a,b)=>ms(a.observed_at_utc)-ms(b.observed_at_utc));
 const last=valid.at(-1),prev=valid.at(-2);
 const panel=!!last&&!!prev&&last.observed_at_utc!==prev.observed_at_utc
  &&now-ms(last.observed_at_utc)<=10*60000;
 const afterMinutes=(now-loss)/60000;
 const trend=panel?100*(last.price_usdc/prev.price_usdc-1):null;
 const liq=panel?100*(last.liquidity_usd/prev.liquidity_usd-1):null;
 const verifiedRecovery=panel&&trend>=5&&liq>=0;
 // Candidate is always a RESEARCH WATCH recommendation. A Buy must still
 // pass the unchanged Dot3 and quote-age gates and actual GPT decision later.
 const baseline=afterMinutes>=baselineCooldownMinutes;
 const comparison=afterMinutes>=comparisonCooldownMinutes&&verifiedRecovery;
 return {schema:1,kind:'R29_V19_LOSS_REENTRY_SHADOW_COMPARISON',
  policy_frozen_at_utc:policyFrozenAtUtc,as_of_utc:asOfUtc,
  loss_model_receipt_id:lossReceipt.id,modeled_loss_test_usdc:lossReceipt.realized_pnl_test_usdc,
  accepted_asof_samples:valid.length,rejected_samples:rejected.length,
  recovery_panel_valid:panel,
  observed_price_recovery_pct:trend,observed_liquidity_change_pct:liq,
  baseline_cooldown_minutes:baselineCooldownMinutes,
  conservative_comparison_cooldown_minutes:comparisonCooldownMinutes,
  baseline_cooldown_elapsed:baseline,
  experimental_reentry_watch:comparison?'RECOVERY_WATCH_ONLY':'NO_CONFIRMED_RECOVERY',
  eligible_to_instruct_gpt_buy:false,
  comparative_future_pnl_test_usdc:null,
  false_reentries_prevented:null,missed_rebounds:null,
  authentic_dot3_risk_verified:false,
  model_position_or_cash_mutated:false,orders_authorized:0};
}
