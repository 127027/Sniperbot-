// R29 retrospective early-winner audit, NEVER passed to historical GPT.
// Run only after its actual responses and the source evaluation window are frozen.
// A technical scanner hit is NOT a proven GPT discovery or a paper fill.
const ms=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s))?
 Date.parse(s):null;
const n=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const addr=x=>typeof x==='string'&&x.length>=10&&x.length<=150;
const GAP='UNVERIFIED';
const ratio=(a,b)=>n(a)&&n(b)?a/b:null;
export function auditUnknownWinnerAfterFreeze(c,{freeze_at_utc}={}){
 const freeze=ms(freeze_at_utc),source=ms(c?.source_first_available_at_utc);
 if(freeze===null||source===null||freeze<source||
  !addr(c?.chain_contract_id)||!Array.isArray(c?.decisions)||c.decisions.length>1000||
  !Array.isArray(c?.price_observations)||c.price_observations.length>20000)
  throw Error('R29_POSTFREEZE_EVALUATION_INPUT_INVALID');
 const prices=c.price_observations.map(x=>({
  at:ms(x.observed_at_utc),price:x.price_usd,
  independently_verified:x.independently_verified===true,
  bidirectional_executable_quote_verified:x.bidirectional_executable_quote_verified===true
 }));
 if(prices.some(x=>x.at===null||!n(x.price)||x.at<source))
  throw Error('R29_OUTCOME_PRICE_EVIDENCE_INVALID');
 const allowed=prices.filter(x=>x.independently_verified).sort((a,b)=>a.at-b.at);
 const first=allowed.find(x=>x.at>=source);
 const decisions=c.decisions.map(x=>({
  action:x.action,at:ms(x.at_utc),asof:ms(x.source_asof_utc),
  response_id:x.model_response_id,
  actual_gpt_call_externally_attested:x.actual_gpt_call_externally_attested===true,
  independent_paper_fill_evidence_verified:x.independent_paper_fill_evidence_verified===true,
  paper_buy_fill_usdc:x.paper_buy_fill_usdc,
  paper_sell_proceeds_usdc:x.paper_sell_proceeds_usdc,
  total_fees_usdc:x.total_fees_usdc
 }));
 if(decisions.some(x=>!['BUY','HOLD','SELL','WATCH','NO_TRADE'].includes(x.action)||
  x.at===null||x.asof===null||x.asof>x.at||x.at<source||
  typeof x.response_id!=='string'||!/^resp_[a-zA-Z0-9_-]{8,}$/.test(x.response_id)))
  throw Error('R29_UNTRUSTED_GPT_TIMELINE');
 const dated=decisions.sort((a,b)=>a.at-b.at);
 const early=dated.find(x=>['BUY','WATCH'].includes(x.action)&&
  x.actual_gpt_call_externally_attested);
 const buy=dated.find(x=>x.action==='BUY'&&x.actual_gpt_call_externally_attested);
 const sell=dated.find(x=>x.action==='SELL'&&x.actual_gpt_call_externally_attested&&
  buy&&x.at>=buy.at);
 const priceAt=t=>allowed.filter(p=>p.at<=t).slice(-1)[0]||null;
 const onBuy=buy?priceAt(buy.at):null;
 const afterBuy=buy?allowed.filter(x=>x.at>buy.at):[];
 const peak=afterBuy.reduce((x,y)=>!x||y.price>x.price?y:x,null);
 const buySellable=buy?prices.find(p=>p.at===buy.at&&p.bidirectional_executable_quote_verified):null;
 const sellSellable=sell?prices.find(p=>p.at===sell.at&&p.bidirectional_executable_quote_verified):null;
 const truePaperFill=!!(buy&&sell&&buySellable&&sellSellable&&
  buy.independent_paper_fill_evidence_verified&&
  sell.independent_paper_fill_evidence_verified&&
  n(buy.paper_buy_fill_usdc)&&n(sell.paper_sell_proceeds_usdc)&&
  typeof sell.total_fees_usdc==='number'&&sell.total_fees_usdc>=0);
 return {
  schema:'r29_postfreeze_early_winner_evaluation.v1',
  chain_contract_id:c.chain_contract_id,
  technical_scanner_observed:c.technical_scanner_observed===true,
  actual_GPT_early_signal:!!early,
  first_verified_GPT_signal_at_utc:early?new Date(early.at).toISOString():null,
  source_to_GPT_signal_minutes:early?+( (early.at-source)/60000 ).toFixed(3):null,
  actual_GPT_BUY:!!buy,
  actual_GPT_SELL:!!sell,
  price_at_initial_source:first?.price??null,
  price_at_first_GPT_buy:onBuy?.price??null,
  price_rise_already_seen_before_buy_multiplier:ratio(onBuy?.price,first?.price),
  remaining_observed_peak_after_buy_multiplier:ratio(peak?.price,onBuy?.price),
  observed_peak_at_utc:peak?new Date(peak.at).toISOString():null,
  actual_verified_two_way_buy_and_sell_quotes:!!(buySellable&&sellSellable),
  realized_net_pnl_test_usdc:truePaperFill?
    sell.paper_sell_proceeds_usdc-buy.paper_buy_fill_usdc-sell.total_fees_usdc:null,
  pnl_status:truePaperFill?'FILL_EVIDENCE_DECLARED_VERIFY_EXTERNAL_RECEIPTS':'UNVERIFIED_NO_INDEPENDENT_BIDIRECTIONAL_FILLS',
  score_as_trading_success:false,
  note:'Postfreeze only. Outcomes and benchmark winners never supplied to historic GPT input; undeclared claims cannot be converted into actual PnL.'
 };
}
