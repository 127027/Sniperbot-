// Forensic probe on GitHub Actions, NOT the trading bot. NO automated BUY.
// Dates: fixed previously de-blinded training day; hand-picked winner and loser.
// This deliberately cannot be counted as an unbiased blind backtest.
import {mkdir,writeFile} from 'node:fs/promises';
import {normalizeHistoricalCandles,closeAsOf} from '../src/historical-candles.mjs';
const date='2026-11-15',end=Math.floor(Date.parse('2026-11-16T00:00:00Z')/1000);
const tokens=[
 {symbol:'DOPE',chain:'bsc',contract:'0xd0a8827e6b5cfc0044fd4cc0b2f4965819f6db19',group:'RETROSPECTIVE_GAINER_BIASED'},
 {symbol:'BLG_Champion',chain:'bsc',contract:'0xdfb03956407b2281a9d6203848fc0349bb47015f',group:'RETROSPECTIVE_LOSER_BIASED'}
];
const result={schema:1,purpose:'AVAILABILITY_PROBE_ONLY_NOT_TRADING_BACKTEST',date,
  run_captured_at_utc:new Date().toISOString(),selection_bias:'TWO_KNOWN_POST_DAY_POSITIVE_AND_NEGATIVE_EXAMPLES',
  automated_paper_orders:0,synthetic_fills:0,results:[]};
async function json(url){
 const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'R29-forensic-research-only'},
   signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('HTTP_'+r.status);
 return r.json();
}
for(const token of tokens){
 const out={symbol:token.symbol,chain:token.chain,contract:token.contract,selection_bias:token.group};
 try{
   const poolApi='https://api.geckoterminal.com/api/v2/networks/'+token.chain+'/tokens/'+token.contract+'/pools';
   const p=await json(poolApi);
   const pools=Array.isArray(p?.data)?p.data:[];
   out.discovered_pool_count=pools.length;
   if(pools.length===0)throw Error('NO_TOKEN_POOL_RESULTS');
   const timeStart=Date.parse(date+'T00:00:00Z');
   const timeEnd=Date.parse('2026-11-16T00:00:00Z');
   const inWindow=pools.filter(z=>{const created=Date.parse(z?.attributes?.pool_created_at);return Number.isFinite(created)&&created>=timeStart&&created<timeEnd&&typeof z?.attributes?.address==='string';});
   const beforeWindow=pools.filter(z=>{const created=Date.parse(z?.attributes?.pool_created_at);return Number.isFinite(created)&&created<timeStart&&typeof z?.attributes?.address==='string';});
   out.pools_opened_in_window=inWindow.length;
   const best=inWindow[0]||beforeWindow[0];
   if(!best)throw Error('NO_POOL_EXISTED_BY_WINDOW_END');
   const pool=best?.attributes?.address;
   if(typeof pool!=='string')throw Error('MISSING_EXACT_POOL_ADDRESS');
   out.pool=pool;
   out.pool_created_at=best?.attributes?.pool_created_at||null;
   const url='https://api.geckoterminal.com/api/v2/networks/'+token.chain+'/pools/'+encodeURIComponent(pool)
    +'/ohlcv/minute?aggregate=5&before_timestamp='+(end+1)+'&limit=1000&currency=usd';
   const tape=normalizeHistoricalCandles({apiResponse:await json(url),day:date,aggregateMinutes:5,source_url:url});
   out.candle_count=tape.candle_count;
   out.first_closed_candle_utc=tape.candles[0]?.known_no_earlier_than_utc||null;
   out.last_closed_candle_utc=tape.candles.at(-1)?.known_no_earlier_than_utc||null;
   out.asof_observations=[...['00:35','08:35','15:35','23:35']].map(s=>({
     at_utc:date+'T'+s+':00Z',
     last_completed_candle_close_usd:closeAsOf(tape,date+'T'+s+':00Z')?.close_usd??null
   }));
   out.data_class=tape.reconstruction_type;
   out.trade_eligible=false;
 }catch(error){out.error=String(error?.message||error).slice(0,250);out.trade_eligible=false;}
 result.results.push(out);
 console.log('FORENSIC_RESEARCH_RESULT',JSON.stringify(out));
}
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/2026-11-15-gecko-reconstruction-probe.json',JSON.stringify(result,null,2)+'\n');
console.log('PROBE_SUMMARY',JSON.stringify({count:result.results.length,successful_candles:result.results.filter(x=>x.candle_count>0).length,claim_of_live_trade:false}));
