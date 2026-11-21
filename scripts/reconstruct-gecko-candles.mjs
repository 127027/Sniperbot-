// Standalone FREE public-data forensic collector, NOT imported by the trading bot.
// Usage: node scripts/reconstruct-gecko-candles.mjs <YYYY-MM-DD> <gecko-chain> <pool-address>
// No auth, wallet, private key, signal publishing, current-price trading or provider subscriptions.
// Result is post-event OHLCV with candle-end evidence, NOT original source quote snapshots.
import {normalizeHistoricalCandles} from '../src/historical-candles.mjs';
import {parsePoolUrl} from '../src/market-evidence.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const [day,network,pool]=process.argv.slice(2);
if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))throw Error('Usage: YYYY-MM-DD gecko-network exact-pool-address');
if(!/^[a-z0-9_-]{2,30}$/.test(network||''))throw Error('INVALID_NETWORK');
if(!/^[a-zA-Z0-9]{32,66}$/.test(pool||''))throw Error('INVALID_POOL');
const end=Math.floor(Date.parse(day+'T00:00:00Z')/1000)+86400;
if(!Number.isFinite(end))throw Error('INVALID_DATE');
const url='https://api.geckoterminal.com/api/v2/networks/'+network+'/pools/'+pool+'/ohlcv/minute'
 + '?aggregate=5&before_timestamp='+encodeURIComponent(end+1)+'&limit=1000&currency=usd';
const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('RESEARCH_FEED_HTTP_'+response.status);
const json=await response.json();
const tape=normalizeHistoricalCandles({day,aggregateMinutes:5,apiResponse:json,source_url:url});
const directory='research/reconstructions/'+day;
await mkdir(directory,{recursive:true});
const filename=directory+'/'+network+'-'+pool+'.json';
await writeFile(filename,JSON.stringify({...tape,network,pool},null,2)+'\n','utf8');
console.log(JSON.stringify({filename,candle_count:tape.candle_count,trade_eligible:tape.trade_eligible,
  caveat:'Single post-event OHLCV source; requires unbiased candidate universe, pool identity, independent liquidity and quote checks.'}));
