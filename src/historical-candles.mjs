// OHLCV reconstruction for forensic research, NOT original contemporaneous quotes.
// The historical candle is usable only after the 5-minute interval has closed.
// Close is a past-observed feature; high/low are never future prediction inputs.
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const ms=s=>typeof s==='string'&&ISO.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const iso=t=>new Date(t).toISOString();
export function normalizeHistoricalCandles({apiResponse,day,aggregateMinutes=5,source_url}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))throw Error('INVALID_DAY');
 if(![1,5,15].includes(aggregateMinutes))throw Error('INVALID_AGGREGATE');
 const start=Date.parse(day+'T00:00:00Z'),end=start+86400000;
 const rows=apiResponse?.data?.attributes?.ohlcv_list;
 if(!Array.isArray(rows))throw Error('NO_PROVIDER_CANDLES');
 const output=new Map(),issues=[];
 for(let i=0;i<rows.length;i++){
  const c=rows[i];
  if(!Array.isArray(c)||c.length<6){issues.push({row:i,reason:'MALFORMED_CANDLE'});continue;}
  const [sec,open,high,low,close,volume]=c;
  const opened=sec*1000,closed=opened+aggregateMinutes*60000;
  if(!Number.isInteger(sec)||sec<=0||opened<start||closed>end)continue;
  if(![open,high,low,close,volume].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)||open<=0||low<=0||close<=0||high<Math.max(open,close,low)||low>Math.min(open,close)){
   issues.push({row:i,reason:'INVALID_OHLCV'});continue;
  }
  output.set(sec,{candle_start_utc:iso(opened),candle_end_utc:iso(closed),
   known_no_earlier_than_utc:iso(closed),open_usd:open,high_usd:high,low_usd:low,close_usd:close,volume_usd:volume});
 }
 const candles=[...output.values()].sort((a,b)=>a.candle_start_utc.localeCompare(b.candle_start_utc));
 return {schema:1,day,provider:'GECKOTERMINAL_RECONSTRUCTED',source_url:source_url||null,
  reconstruction_type:'POST_EVENT_HISTORICAL_CANDLES_NOT_ORIGINAL_INTRADAY_PAGE_CAPTURE',
  candle_interval_minutes:aggregateMinutes,candle_count:candles.length,candles,issues,
  independent_provider_confirmed:false,historical_liquidity_confirmed:false,trade_eligible:false};
}
export function closeAsOf(tape,decisionTimeIso,{maxAgeMinutes=15}={}){
 const t=ms(decisionTimeIso);
 if(t===null)throw Error('INVALID_DECISION_TIME');
 const known=(tape?.candles||[]).filter(c=>{
  const close=ms(c?.known_no_earlier_than_utc);
  return close!==null&&close<=t&&t-close<=maxAgeMinutes*60000;
 });
 return known.length?known.at(-1):null;
}
