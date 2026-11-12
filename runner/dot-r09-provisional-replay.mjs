// R09 historical candidate-extraction diagnostic. Not a real five-agent backtest.
// Curated 2026 sample; separate STRICT historical source proof from provisional
// platform-date-only clues. No BUY/SELL orders and no historical PnL.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const DAY=86400000;
const isDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validMint=s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export function runR09SourceReplay(corpus){
 if(corpus?.schema!=='sniper_r09_hist_source_corpus.v1'||!Array.isArray(corpus.sources))
  throw Error('CORPUS_INVALID');
 const first=Date.parse(corpus.period?.start_utc),last=Date.parse(corpus.period?.end_utc);
 if(!Number.isFinite(first)||!Number.isFinite(last)||last<first||
    last-first>65*DAY||corpus.sources.length>2000)throw Error('WINDOW_INVALID');
 const seenSources=new Set();
 for(const e of corpus.sources){
  if(typeof e.id!=='string'||seenSources.has(e.id)||!isDay(e.day_utc)||
     e.day_utc<corpus.period.start_utc.slice(0,10)||e.day_utc>corpus.period.end_utc.slice(0,10)||
     e.platform!=='reddit'||!/^https:\/\/www\.reddit\.com\/r\//.test(e.url)||
     !Array.isArray(e.mentioned_symbols)||!Array.isArray(e.token_addresses)||
     e.text_historically_archived!==false)
   throw Error('SOURCE_INVALID_OR_RETROACTIVE');
  seenSources.add(e.id);
  for(const a of e.token_addresses)if(!validMint(a.token)||a.chain!=='solana')
    throw Error('INVALID_TOKEN_ADDRESS');
 }
 const days=[],provisional=new Map(),identities=new Map();
 const startDay=Math.floor(first/DAY)*DAY,endDay=Math.floor(last/DAY)*DAY;
 for(let ts=startDay;ts<=endDay;ts+=DAY){
  const day=new Date(ts).toISOString().slice(0,10);
  const visible=corpus.sources.filter(s=>s.day_utc<=day);
  for(const src of visible){
   for(const symbol of src.mentioned_symbols)
    if(!provisional.has(symbol))provisional.set(symbol,{first_platform_day_utc:src.day_utc,source_url:src.url,provenance:'PLATFORM_DATE_ONLY_MUTABILITY_UNCHECKED'});
   for(const adr of src.token_addresses){
    const id=adr.chain+':'+adr.token;
    if(!identities.has(id))identities.set(id,{first_platform_day_utc:src.day_utc,source_url:src.url,
      candidate_id:id,provenance:'PLATFORM_DATE_ONLY_CONTRACT_NOT_ONCHAIN_VERIFIED'});
   }
  }
  const todays=corpus.sources.filter(s=>s.day_utc===day);
  days.push({day_utc:day,original_platform_clues_added:todays.length,
   platform_clues_cumulative:visible.length,
   original_byte_verified_sources:0,
   provisional_symbols_visible:[...provisional.keys()].sort(),
   provisional_token_identifiers_visible:[...identities.keys()].sort(),
   historically_verified_early_trades:0,qualified_paper_buy_advisories:0});
 }
 return {schema:'sniper_r09_source_grade_replay_result.v1',
  days:days.length,period:corpus.period,source_count:corpus.sources.length,
  source_grade:'PLATFORM_DATE_ONLY_MUTABILITY_UNCHECKED',
  individual_five_cloud_dots_executed_in_replay:false,
  actually_autonomously_discovered:false,
  original_historical_byte_verified_sources:0,
  provisional_distinct_symbols:[...provisional.entries()].map(([symbol,v])=>({symbol,...v})),
  provisional_distinct_token_mints:[...identities.values()],
  qualified_historical_buy_advisories:0,
  calibrated_probability_available:false,
  finding:'TESTS_DATED_SOURCE_EXTRACTION_NOT_HISTORICAL_PREDICTIVE_QUALITY',
  daily:days};
}
export function readR09SourceCorpus(){
 return JSON.parse(readFileSync(new URL('../research/historical/R09/source_corpus.json',import.meta.url),'utf8'));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 process.stdout.write(JSON.stringify(runR09SourceReplay(readR09SourceCorpus()),null,2)+'\n');
}
