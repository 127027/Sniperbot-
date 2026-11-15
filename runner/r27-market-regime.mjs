// R27 read-only BTC/ETH market regime. Inaccessible/stale data MUST block
// new AI paper BUYs, never an existing SELL, and must not touch wallets.
const ENDPOINT='https://data-api.binance.vision/api/v3/klines';
const SYMBOLS=['BTCUSDT','ETHUSDT'];
const ONE_HOUR=3600000;
function parse(rows,now){
 if(!Array.isArray(rows)||rows.length<50||rows.length>100)return null;
 const complete=rows.filter(x=>Array.isArray(x)&&x.length>=6&&
  Number(x[6])<now-1000&&Number(x[0])<now-ONE_HOUR);
 if(complete.length<49)return null;
 const last=complete.at(-1),previous24=complete.at(-25),previous48=complete.at(-49);
 const values=[last[4],previous24[4],previous48[4]].map(Number);
 if(values.some(p=>!Number.isFinite(p)||p<=0)||!Number.isFinite(Number(last[6]))||
   now-Number(last[6])>3*ONE_HOUR)return null;
 return {return_24h_pct:(values[0]/values[1]-1)*100,
  return_48h_pct:(values[0]/values[2]-1)*100,
  last_closed_at_utc:new Date(Number(last[6])).toISOString()};
}
export async function collectR27MarketRegime({fetcher=fetch,now=Date.now()}={}){
 if(!Number.isFinite(now))throw Error('R27_REGIME_CLOCK_INVALID');
 const observations={},errors=[];
 for(const symbol of SYMBOLS){
  const url=ENDPOINT+'?symbol='+symbol+'&interval=1h&limit=72';
  try{
   const res=await fetcher(url,{headers:{accept:'application/json'},
    redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!res?.ok)throw Error('HTTP_'+(res?.status||'ERROR'));
   const rows=await res.json();const p=parse(rows,now);
   if(!p)throw Error('STALE_OR_INCOMPLETE_KLINES');
   observations[symbol]=p;
  }catch(e){errors.push({symbol,reason:String(e.message).slice(0,70)})}
 }
 const btc=observations.BTCUSDT,eth=observations.ETHUSDT;
 if(!btc||!eth)return {schema:'r27_market_regime.v1',status:'UNKNOWN',
  buys_allowed:false,observed_at_utc:new Date(now).toISOString(),
  data_source:'BINANCE_PUBLIC_SPOT_KLINES',
  evidence:observations,errors,reason:'BENCHMARK_DATA_MISSING'};
 const riskOff=btc.return_24h_pct<=-4||eth.return_24h_pct<=-6||
  (btc.return_24h_pct<=-2&&eth.return_24h_pct<=-3)||
  (btc.return_48h_pct<=-8&&eth.return_48h_pct<=-10);
 return {schema:'r27_market_regime.v1',status:riskOff?'RISK_OFF':'NEUTRAL_OR_BETTER',
  buys_allowed:!riskOff,observed_at_utc:new Date(now).toISOString(),
  evidence:observations,errors:[],data_source:'BINANCE_PUBLIC_SPOT_KLINES',
  reason:riskOff?'BROAD_MARKET_DOWNTREND':'BENCHMARK_DOWNSIDE_FILTER_NOT_TRIGGERED',
  warning:'A coarse risk filter, not prediction, financial advice or DEX token security evidence.'};
}
