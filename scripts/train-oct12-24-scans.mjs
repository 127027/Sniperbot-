// A 24-hour forensic TRAINING replay for 2026-10-12. 8 explicitly-linked
// hindsight archive references, never autonomous discovery or a blind holdout.
// No wallet, API keys or paid APIs. Copies no symbols to the live strategy.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {normalizeHistoricalCandles} from '../src/historical-candles.mjs';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
import {build24TrainingTimeline,auditCurrentDotRoles} from '../src/dot-duty-audit.mjs';
const day='2026-10-12',end=Math.floor(Date.parse('2026-10-13T00:00:00Z')/1000);
const manifest=JSON.parse(await readFile('research/training/2026-10-12/reference-manifest.json','utf8'));
const statuses=[],pools=[];
async function get(url){
 const result=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!result.ok)throw Error('HTTP_'+result.status);
 return result.json();
}
let providerBackoff=false;
for(const reference of manifest.reference_pool_links){
 const row={symbol:reference.symbol,chain:reference.chain,pool:reference.pool,
 retrospective_source_url:reference.original_pool_url,stage:'POST_EVENT_REFERENCE',
 buy_authorized:false};
 if(providerBackoff){row.status='DEFERRED_RATE_LIMIT';statuses.push(row);continue;}
 const network=reference.chain==='ethereum'?'eth':reference.chain;
 try{
  const url='https://api.geckoterminal.com/api/v2/networks/'+network+'/pools/'+encodeURIComponent(reference.pool)+'?include=base_token';
  const detail=await get(url);
  const attr=detail?.data?.attributes;
  row.pool_created_at_utc=attr?.pool_created_at??null;
  row.api_pool_address=attr?.address??null;
  const exact=typeof row.api_pool_address==='string'&&row.api_pool_address.toLowerCase()===reference.pool.toLowerCase();
  if(!exact)throw Error('API_POOL_ID_MISMATCH');
  if(!row.pool_created_at_utc)throw Error('MISSING_POOL_CREATION_TIME');
  if(Date.parse(row.pool_created_at_utc)>=Date.parse('2026-10-13T00:00:00Z')){
   row.status='POOL_CREATED_AFTER_DAY';statuses.push(row);continue;
  }
  // Two URL-based sources are NOT considered independent historical trade quotes.
  const candleUrl='https://api.geckoterminal.com/api/v2/networks/'+network+'/pools/'+encodeURIComponent(reference.pool)
     +'/ohlcv/minute?aggregate=5&before_timestamp='+(end+1)+'&limit=1000&currency=usd';
  const tape=normalizeHistoricalCandles({day,aggregateMinutes:5,source_url:candleUrl,apiResponse:await get(candleUrl)});
  row.candle_count=tape.candle_count;
  row.first_candle_closed_at_utc=tape.candles[0]?.known_no_earlier_than_utc??null;
  row.last_candle_closed_at_utc=tape.candles.at(-1)?.known_no_earlier_than_utc??null;
  if(tape.candle_count>0){
   pools.push({id:reference.chain+':'+reference.pool,symbol:reference.symbol,chain:reference.chain,
      pool_created_at_utc:row.pool_created_at_utc,candles:tape.candles});
   row.status='RETROSPECTIVE_CANDLES_AVAILABLE_NOT_VERIFIED_DOT2_DISCOVERY';
  }else row.status='NO_OCT12_CANDLES';
  await mkdir('probe-artifacts',{recursive:true});
  await writeFile('probe-artifacts/oct12-candles-'+statuses.length+'.json',JSON.stringify({
   symbol:reference.symbol,chain:reference.chain,pool:reference.pool,
   source:'GECKOTERMINAL_RECONSTRUCTED_AFTER_DAY_NOT_CONTEMPORANEOUS',tape},null,2)+'\n');
 }catch(error){
  row.status='SOURCE_ERROR';row.error=String(error.message||error).slice(0,140);
  if(row.error==='HTTP_429'){row.status='RATE_LIMIT_429';providerBackoff=true;}
 }
 statuses.push(row);
 console.log('OCT12_REFERENCE_PROBE',JSON.stringify(row));
}
const load=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}};
const [dot1,dot2,dot3,dot4,dot5,signalIndex]=await Promise.all([
'1','2','3','4','5'].map(i=>load('research/latest/dot-'+i+'.json')).concat([load('signals/index.json')]));
const roles=auditCurrentDotRoles({dot1,dot2,dot3,dot4,dot5,signalIndex});
const experiments={};
for(const preset of ['exploratory','conservative','volatility_guard']){
 const result=runResearchPaperLab({date:day,pools,preset});
 experiments[preset]={counts:result.counts,hypothetical_realized_test_usdc:result.realized_hypothetical_pnl_test_usdc,
  open_positions:result.open_positions.length,events:result.events};
 console.log('OCT12_EXPERIMENT_SUMMARY',JSON.stringify({preset,pools:pools.length,counts:result.counts,
  model_pnl:result.realized_hypothetical_pnl_test_usdc,open_positions:result.open_positions.length,verified_orders:0}));
 if(preset==='volatility_guard'){
  const timeline=build24TrainingTimeline({day,sourceCandidates:manifest.reference_pool_links,
    researchScans:result.scans,roleAudit:roles});
  await mkdir('probe-artifacts',{recursive:true});
  await writeFile('probe-artifacts/oct12-24-scans-audit.json',JSON.stringify(timeline,null,2)+'\n');
  const headers=['Scan','Uhrzeit MESZ','Dot1 Tempo','Dot2 Discovery','Dot3 Risk','Dot4 Strategy','Dot5 QA',
    'Experiment BUY','Experiment SELL','WATCH','HOLD','Echte Orders','Client Fills'];
  const lines=[headers.join(',')];
  for(const s of timeline.scans){
   const cols=[s.scan,s.germany_mesz_at,s.dot1,s.dot2,s.dot3,s.dot4,s.dot5,
    s.research_buy,s.research_sell,s.research_watch,s.research_hold,0,0];
   lines.push(cols.map(x=>JSON.stringify(x)).join(','));
  }
  await writeFile('probe-artifacts/oct12-24-scans-audit.csv',lines.join('\n')+'\n');
 }
}
const summary={schema:1,kind:'OCT12_TRAINING_RESTART_24_SCANS_WITH_DOT_AUDIT',
 research_date_utc:day,scenario:'HISTORICAL_POST_HOC_DIAGNOSTIC_NOT_BLIND_VALIDATION',
 test_window_utc:['2026-10-12T00:00:00Z','2026-10-13T00:00:00Z'],scans:24,
 spreadsheet_reference_count:manifest.total_reported_gainers,
 exact_pool_links_in_uploaded_sheet:manifest.with_pool_links,
 source_eligible_pool_tapes:pools.length,
 source_candidates:statuses,
 model_experiments:experiments,
 actual_current_dot_audit:roles,
 actually_published_paper_orders:0,actually_verified_fills:0,
 warning:'Archive winners are a post-day reference; no original Dot2 intraday discovery or independent historic risk quotes have been established. Experiment BUY/SELL are not actual Dot orders.'};
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/oct12-training-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('OCT12_TRAINING_FINISH',JSON.stringify({scans:24,post_hoc_references:65,linked:8,
 historical_pool_tapes:pools.length,rate_limit_stop:providerBackoff,
 actual_paper_orders:0,role_audit_complete:roles.all_roles_complete}));
