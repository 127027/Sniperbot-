// D4-02: as-of market regime FEATURES for independent experiments only.
// No signal rule is changed, no position or order is opened.
// A future-known winner label or a post-decision quote is NEVER usable.
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const oracle=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||'post_event_rank' in x||x.source_class==='POST_EVENT_ORACLE');
const eq=(a,b)=>a===b;
export function measureAsOfMarketRegime({chain,pool,contract,
 observations=[],asOfUtc,policyFrozenAtUtc}={}){
 const at=ms(asOfUtc),frozen=ms(policyFrozenAtUtc);
 if(at===null||frozen===null||frozen>at||!chain||!pool||!contract
   ||!Array.isArray(observations)||observations.length>10000)
  throw Error('INVALID_SHADOW_MARKET_REGIME');
 const accepted=[],rejected=[];
 for(const [index,o] of observations.entries()){
  const t=ms(o?.observed_at_utc),available=ms(o?.available_at_utc);
  if(oracle(o)||!['ORIGINAL_CAPTURE','SYNTHETIC_TEST'].includes(o?.source_class)
   ||!eq(o.chain,chain)||!eq(o.pool,pool)||!eq(o.contract,contract)
   ||t===null||available===null||available<t||t>at||available>at
   ||!positive(o.price_usdc)||!positive(o.volume_24h_usd)
   ||!positive(o.liquidity_usd)||typeof o.source_path!=='string'
   ||!o.source_path.startsWith('research/')){
   rejected.push({index,reason:'NOT_ASOF_VERIFIED_OR_ORACLE'});continue;
  }
  accepted.push(o);
 }
 accepted.sort((a,b)=>ms(a.observed_at_utc)-ms(b.observed_at_utc));
 // Three DISTINCT, properly sequenced observations: no single last quote
 // can be interpreted as momentum, acceleration or a coherent trend.
 const distinct=accepted.filter((o,i,rows)=>i===0
   ||o.observed_at_utc!==rows[i-1].observed_at_utc);
 const last=distinct.at(-1),prev=distinct.at(-2),first=distinct.at(-3);
 const ready=!!first&&at-ms(last.observed_at_utc)<=10*60000
  &&ms(prev.observed_at_utc)-ms(first.observed_at_utc)>=15*60000
  &&ms(last.observed_at_utc)-ms(prev.observed_at_utc)>=15*60000
  &&ms(last.observed_at_utc)-ms(first.observed_at_utc)<=3*3600000;
 const base={schema:1,kind:'R29_V19_D4_REGIME_ASOF_SHADOW',
  as_of_utc:asOfUtc,policy_frozen_at_utc:policyFrozenAtUtc,
  source_count:accepted.length,rejected_count:rejected.length,
  oracle_input_counted:0,not_a_risk_gate:true,
  actual_gpt_reviews:0,entry_signal_authorized:false,orders_authorized:0};
 if(!ready)return {...base,status:'INSUFFICIENT_ASOF_REGIME_PANEL',
   regime:null,acceleration_pct_points:null,volume_change_pct:null,
   liquidity_change_pct:null,downside_reversal_risk:null};
 const previousReturn=100*(prev.price_usdc/first.price_usdc-1);
 const latestReturn=100*(last.price_usdc/prev.price_usdc-1);
 const acceleration=latestReturn-previousReturn;
 const volumeChange=100*(last.volume_24h_usd/prev.volume_24h_usd-1);
 const liquidityChange=100*(last.liquidity_usd/prev.liquidity_usd-1);
 const risk=liquidityChange< -20||latestReturn< -10;
 const regime=risk?'DOWNSIDE_RISK_SHADOW':
  latestReturn>=5&&acceleration>0&&volumeChange>=0?'ACCELERATING_SHADOW':
  latestReturn>0?'RISING_UNCONFIRMED_SHADOW':'FLAT_OR_FADING_SHADOW';
 return {...base,status:'SHADOW_REGIME_MEASURED',
  earliest_used_at_utc:first.observed_at_utc,
  latest_used_at_utc:last.observed_at_utc,
  prior_return_pct:previousReturn,recent_return_pct:latestReturn,
  acceleration_pct_points:acceleration,volume_change_pct:volumeChange,
  liquidity_change_pct:liquidityChange,downside_reversal_risk:risk,
  regime,source_class:distinct.some(x=>x.source_class==='SYNTHETIC_TEST')
   ?'SYNTHETIC_RESEARCH_ONLY':'PROVISIONAL_ORIGINAL_NO_ISSUER_AUTHENTICITY',
  not_a_paper_quote:true,live_decision_rules_unchanged:true};
}
