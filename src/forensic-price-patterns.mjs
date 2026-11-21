// Diagnostic on historically reconstructed OHLCV data only.
// NEVER generate GitHub order or claim risk eligibility from one venue.
const ms=v=>Number.isFinite(Date.parse(v))?Date.parse(v):null;
const stamp=t=>new Date(t).toISOString();
export function evaluateHourlyPricePatterns({date,tape,pool_created_at_utc,entryMomentumPct=5,
takeProfitPct=20,stopLossPct=10}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('INVALID_DATE');
 if(!tape||!Array.isArray(tape.candles))throw Error('MISSING_CANDLES');
 const poolAt=ms(pool_created_at_utc);
 if(poolAt===null)throw Error('MISSING_POOL_OPEN_TIME');
 const start=Date.parse(date+'T00:00:00Z'),minute=60000;
 const scan_results=[],patterns=[];
 let paperHypothesis=null;
 for(let h=0;h<24;h++){
  const tick=start+h*3600000+35*minute,dot2=tick-20*minute;
  const now=tape.candles.filter(c=>{
    const closed=ms(c.known_no_earlier_than_utc);
    return closed!==null&&closed<=tick&&tick-closed<=15*minute;
  }).at(-1);
  let status='NO_RECENT_CLOSED_CANDLE',reason=null,changePct=null;
  if(poolAt>dot2){status='NOT_IN_PREVIOUS_DOT2_SCAN';}
  else if(now){
   const nowAt=ms(now.known_no_earlier_than_utc);
   const baseline=tape.candles.filter(c=>{
    const closed=ms(c.known_no_earlier_than_utc);
    return closed!==null&&closed<=nowAt-10*minute&&closed>=nowAt-120*minute
      &&closed>=poolAt;
   })[0];
   if(paperHypothesis){
    const change=(now.close_usd/paperHypothesis.price-1)*100;
    if(change>=takeProfitPct||change<=-stopLossPct){
      status='EXIT_PRICE_PATTERN_ONLY';reason=change>=takeProfitPct?'TAKE_PROFIT_PATTERN':'STOP_LOSS_PATTERN';
      changePct=change;
      patterns.push({at_utc:stamp(tick),type:status,reason,price_usd:now.close_usd,
        change_from_hypothetical_entry_pct:change});
      paperHypothesis=null;
    }else{status='HOLD_PRICE_PATTERN_ONLY';changePct=change;}
   }else if(baseline){
     const rise=(now.close_usd/baseline.close_usd-1)*100;
     changePct=rise;
     if(rise>=entryMomentumPct){
       status='ENTRY_PRICE_PATTERN_ONLY';reason='TWO_CLOSED_CANDLE_MOMENTUM';
       paperHypothesis={price:now.close_usd,at_utc:stamp(tick)};
       patterns.push({at_utc:stamp(tick),type:status,reason,price_usd:now.close_usd,
         momentum_pct:rise,reference_candle_closed_at_utc:baseline.known_no_earlier_than_utc});
     }else{status='WATCH_WEAK_MOMENTUM';}
   }else status='INSUFFICIENT_TWO_CLOSED_CANDLES';
  }
  scan_results.push({scan_number:h+1,at_utc:stamp(tick),
    price_source:'POST_EVENT_SINGLE_PROVIDER_CANDLES',
    status,reason,momentum_or_position_change_pct:changePct,
    scanned_candle_closed_at_utc:now?.known_no_earlier_than_utc??null});
 }
 return {schema:1,mode:'FORENSIC_PRICE_PATTERN_ONLY_NOT_PAPER_TRADES',date,
   historic_candles:tape.candle_count,pool_created_at_utc,
   scans:24,patterns,scan_results,
   hypothetical_open_pattern_position:paperHypothesis!==null,
   verified_buys:0,verified_sells:0,verified_paper_fills:0,
   warnings:['The candidate tokens were picked AFTER outcome was known.','One reconstructed OHLCV provider is not a second independent quote.','No proven historical liquidity, contract safety or Dot2 discovery at each tick.','Price patterns are not actionable BUY/SELL orders or realized PnL.']};
}
