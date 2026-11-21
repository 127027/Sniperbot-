// Retrospective SINGLE-SOURCE paper research. Not the cloud dots, not GitHub orders,
// not a trade execution simulator with proven liquidity. Deliberately shows losses too.
const ms=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const at=t=>new Date(t).toISOString();
export const PAPER_LAB_PRESETS=Object.freeze({
  exploratory:{momentumMinPct:5,momentumMaxPct:100,takeProfitPct:20,stopLossPct:10,minVolumeUsd:0},
  conservative:{momentumMinPct:10,momentumMaxPct:60,takeProfitPct:25,stopLossPct:12,minVolumeUsd:500},
  volatility_guard:{momentumMinPct:5,momentumMaxPct:100,takeProfitPct:20,stopLossPct:10,minVolumeUsd:100,maxRecentCloseRangeRatio:2.5}
});
export function runResearchPaperLab({date,pools=[],preset='exploratory',startBalance=5000,amountPerCoin=50}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date+'T00:00:00Z')))throw Error('INVALID_DAY');
 if(!Array.isArray(pools)||!PAPER_LAB_PRESETS[preset])throw Error('INVALID_EXPERIMENT');
 const rules=PAPER_LAB_PRESETS[preset],start=Date.parse(date+'T00:00:00Z'),minute=60000;
 let cash=startBalance;const open=new Map(),events=[],scans=[],counts={buys:0,sells:0,watches:0,dataGaps:0,blockedEntries:0};
 let realized=0;
 const inputs=pools.map((p,i)=>({id:p.id||String(i),symbol:p.symbol||null,chain:p.chain||null,pool_created_at_utc:p.pool_created_at_utc,
   pool_at:ms(p.pool_created_at_utc),candles:Array.isArray(p.candles)?p.candles:[]}));
 for(let hour=0;hour<24;hour++){
  const tick=start+hour*3600000+35*minute,dot2=tick-20*minute;
  const scan={number:hour+1,at_utc:at(tick),considered:inputs.length,decisions:[]};
  for(const coin of inputs){
   let action='DATA_GAP',reason='NO_ELIGIBLE_CLOSED_CANDLE',price=null;
   if(coin.pool_at===null||coin.pool_at>dot2){reason='NOT_DISCOVERABLE_BY_DOT2_AT_15';}
   else {
    const available=coin.candles.filter(c=>{
      const close=ms(c.known_no_earlier_than_utc);
      return close!==null&&close+minute<=tick&&close>=coin.pool_at&&tick-close<=15*minute
       &&typeof c.close_usd==='number'&&c.close_usd>0;
    }).sort((a,b)=>a.known_no_earlier_than_utc.localeCompare(b.known_no_earlier_than_utc));
    const last=available.at(-1);if(last){
      price=last.close_usd;
      const position=open.get(coin.id);
      if(position){
        const pnlPct=(price/position.entry_price_usd-1)*100;
        if(pnlPct>=rules.takeProfitPct||pnlPct<=-rules.stopLossPct){
          action='SELL_EXPERIMENT';reason=pnlPct>=rules.takeProfitPct?'TAKE_PROFIT':'STOP_LOSS';
          // 75bp virtual fee + 40bp spread + 50bp model impact on each side.
          const gross=position.units*price*(1-.004-.005);
          const net=gross*(1-.0075);
          const tradePnl=net-position.spent;
          cash+=net;realized+=tradePnl;open.delete(coin.id);counts.sells++;
          events.push({at_utc:at(tick),symbol:coin.symbol,chain:coin.chain,action,reason,
            price_usd:price,gross_change_pct:pnlPct,modelled_cash_return_test_usdc:net,
            modelled_pnl_test_usdc:tradePnl,entry_at_utc:position.at_utc,
            evidence_class:'SINGLE_PROVIDER_HINDSIGHT_CANDLE_MODEL_NOT_EXECUTABLE'});
        } else{action='HOLD_EXPERIMENT';reason='IN_POSITION_WITHOUT_EXIT_TRIGGER';}
      }else{
        // Search ALL already closed historical candles, including earlier days.
        // The newest candle is still required to be fresh (<=15m), so older
        // reference context is NOT mistaken for an executable spot quote.
        const base=coin.candles.filter(c=>{
          const t=ms(c.known_no_earlier_than_utc);
          return t!==null&&t+minute<=tick&&t>=coin.pool_at
           &&t<=ms(last.known_no_earlier_than_utc)-10*minute
 
           &&typeof c.close_usd==='number'&&c.close_usd>0;
        }).sort((a,b)=>b.known_no_earlier_than_utc.localeCompare(a.known_no_earlier_than_utc))[0];
        if(!base){action='WATCH_EXPERIMENT';reason='NOT_ENOUGH_PAST_CANDLES';}
        else{
          const rise=(price/base.close_usd-1)*100,volume=last.volume_usd??0;
          const availableHistory=coin.candles.filter(c=>{
            const ct=ms(c.known_no_earlier_than_utc);
            return ct!==null&&ct+minute<=tick&&ct>=coin.pool_at&&typeof c.close_usd==='number'&&c.close_usd>0;
          });
          const historyOldest=availableHistory.reduce((acc,c)=>{
            const ct=ms(c.known_no_earlier_than_utc);
            return acc===null||ct<acc?ct:acc;
          },null);
          scan.history_depth_by_coin??=[];
          scan.history_depth_by_coin.push({
            symbol:coin.symbol,available_prior_candles:availableHistory.length,
            oldest_known_candle_at_utc:historyOldest===null?null:at(historyOldest),
            elapsed_minutes_from_selected_momentum_base:(ms(last.known_no_earlier_than_utc)-ms(base.known_no_earlier_than_utc))/minute,
            history_policy:'NO_120_MINUTE_DATA_ACCESS_CUTOFF',
            close_price_is_fresh:true});

          // Conservative guard against unusually wide recent range using ONLY past closed candles.
          const earlier=coin.candles.filter(c=>{
            const t=ms(c.known_no_earlier_than_utc);
            return t!==null&&t+minute<=tick&&t>=tick-120*minute
             &&t<=ms(last.known_no_earlier_than_utc)&&typeof c.close_usd==='number'&&c.close_usd>0;
          }).map(c=>c.close_usd);
          const range=earlier.length>=3?Math.max(...earlier)/Math.min(...earlier):null;
          const volatilityTooHigh=rules.maxRecentCloseRangeRatio!==undefined
           &&range!==null&&range>rules.maxRecentCloseRangeRatio;
          if(!volatilityTooHigh&&rise>=rules.momentumMinPct&&rise<=rules.momentumMaxPct&&volume>=rules.minVolumeUsd&&cash>=amountPerCoin){
            action='BUY_EXPERIMENT';reason='RECENT_CLOSED_CANDLE_MOMENTUM';
            const spend=amountPerCoin,filledPrice=price*(1+.004+.005),
             units=(spend*(1-.0075))/filledPrice;
            open.set(coin.id,{spent:spend,units,entry_price_usd:price,at_utc:at(tick)});
            cash-=spend;counts.buys++;
            events.push({at_utc:at(tick),symbol:coin.symbol,chain:coin.chain,action,reason,
              price_usd:price,observed_momentum_pct:rise,modelled_spend_test_usdc:spend,
              evidence_class:'SINGLE_PROVIDER_HINDSIGHT_CANDLE_MODEL_NOT_EXECUTABLE'});
          }else{
            action='WATCH_EXPERIMENT';counts.blockedEntries++;
            reason=volatilityTooHigh?'HIGH_RECENT_CLOSE_RANGE':rise>rules.momentumMaxPct?'TOO_EXTREME_MOMENTUM':
             rise<rules.momentumMinPct?'NO_MOMENTUM':
             volume<rules.minVolumeUsd?'VOLUME_TOO_LOW':'NO_CASH';
          }
        }
      }
    }
   }
   if(action==='DATA_GAP')counts.dataGaps++;
   if(action==='WATCH_EXPERIMENT')counts.watches++;
   scan.decisions.push({symbol:coin.symbol,chain:coin.chain,action,reason,observed_price_usd:price});
  }
  scans.push(scan);
 }
 // Open positions have unknown final realizable cash; do NOT fake final sale.
 const notionalOpen=[...open.entries()].map(([id,pos])=>({
  id,entry_at_utc:pos.at_utc,entry_price_usd:pos.entry_price_usd,
  spent_test_usdc:pos.spent,units_modelled:pos.units,
  realized:false,market_value_test_usdc:null}));
 return {schema:1,kind:'SINGLE_SOURCE_RETROSPECTIVE_RESEARCH_EXPERIMENT',
  date,preset,entry_amount_test_usdc:amountPerCoin,
  initial_cash_test_usdc:startBalance,remaining_cash_test_usdc:cash,
  realized_hypothetical_pnl_test_usdc:realized,open_positions:notionalOpen,
  counts,events,scans,
  verified_historical_paper_orders:0,verified_client_fills:0,
  verified_real_profit_test_usdc:null,
  warnings:['Known post-hoc example pools; not unbiased discovery.','Prices are retrospectively reconstructed single-source OHLCV, not proven actual available fill quotes.','Fees, spread, impact and virtual fills are assumptions; actual slippage, liquidity and sellability not proven.','Experiment output must NEVER be written to signals/orders/ or treated as real Dot4 trade receipts.']};
}
