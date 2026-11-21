// R29 V1.5: October 12 2026 market-vs-market+media research replay.
// The public media recorder started Nov 21; October archive pages found today
// are NOT evidence of source accessibility by an Oct 12 historical Dot scan.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
import {replayFirstScanMemory} from '../src/first-scan-memory-replay.mjs';
import {canonicalChain,tokenValid,poolValid} from '../src/market-evidence.mjs';
const day='2026-10-12',s=Date.parse(day+'T00:00:00Z'),hour=3600000;
const dataDir='research/training/2026-10-12/frozen-v11/';
const metadata=JSON.parse(await readFile(dataDir+'oct12-training-summary.json','utf8'));
const fixed=JSON.parse(await readFile('research/backtests/2026-10-12/iterations/09-v12-risk-guarded-frozen.json','utf8'));
const candidates=new Map(metadata.source_candidates.map(x=>[x.chain+':'+x.pool,x]));
const filenames=(await readdir(dataDir)).filter(x=>/^oct12-candles-\d+\.json$/.test(x)).sort();
const pools=[];
for(const file of filenames){
 const d=JSON.parse(await readFile(dataDir+file,'utf8'));
 const id=d.chain+':'+d.pool,meta=candidates.get(id);
 if(!meta?.pool_created_at_utc||!Array.isArray(d.tape?.candles)||!d.tape.candles.length)throw Error('BAD_FROZEN_TAPE '+file);
 pools.push({id,chain:d.chain,pool:d.pool,
   contract:null, // the frozen pool tape does not authenticate an exact TOKEN contract.
   symbol:d.symbol,pool_created_at_utc:meta.pool_created_at_utc,candles:d.tape.candles});
}
if(pools.length!==6)throw Error('NEED_SIX_FROZEN_IDENTICAL_POOLS');
const allMedia=JSON.parse(await readFile('research/media/state/memory.json','utf8'));
const knownMedia=Object.values(allMedia.events||{});
const archives=[
 {source:'MEMEFEE_2026_10_11_WEEKLY',url:'https://memefee.com/articles/meme-coin-weekly-news-review-oct-5-11-2026.html',
  reported_publication_date:'2026-10-11',document_kind:'WEEKLY_REVIEW',independently_captured_in_october:false,
  exact_utc_publication_proven:false,associated_verified_token_contracts:[]},
 {source:'MEMECOIN_GURU_TOOLS_OCT12',url:'https://memecoin.guru/news/memecoin-tools-weekly-2026-10-12',
  reported_publication_date:'2026-10-12',document_kind:'DATED_NEWS_ARTICLE',independently_captured_in_october:false,
  exact_utc_publication_proven:false,associated_verified_token_contracts:[]},
 {source:'CRYPTOTICKER_OCTOBER_ARCHIVE',url:'https://cryptoticker.io/en/crypto-news/archiv/2026/10/',
  reported_publication_date:'2026-10-12',document_kind:'MONTH_ARCHIVE_WITH_DAY_ENTRIES',independently_captured_in_october:false,
  exact_utc_publication_proven:false,associated_verified_token_contracts:[]},
 {source:'PRESIDENCY_PROJECT_TRUTH_SOCIAL_OCT12',url:'https://www.presidency.ucsb.edu/documents/truth-social-posts-october-12-2026',
  reported_publication_date:'2026-10-12',document_kind:'LATER_COMPILED_PUBLIC_POST_ARCHIVE',independently_captured_in_october:false,
  exact_utc_publication_proven:false,associated_verified_token_contracts:[]}
];
const pastStart='2026-10-13T00:00:00Z';
const capturedBackThen=knownMedia.filter(e=>e.first_captured_at_utc&&e.first_captured_at_utc<pastStart);
if(capturedBackThen.length)throw Error('UNEXPECTED_VERIFIED_OCTOBER_MEDIA_CAPTURE_CHECK_DATA');
const strictMedia=knownMedia.filter(e=>{
 const pub=Date.parse(e.published_at_utc),cap=Date.parse(e.first_captured_at_utc);
 if(!Number.isFinite(pub)||!Number.isFinite(cap)||pub>s+24*hour||cap>s+24*hour)return false;
 return e.independent_origin_verified===true&&typeof e.contract==='string'&&tokenValid(e.chain,e.contract)
    &&poolValid(e.chain,e.pool)&&typeof e.source_origin==='string';
});
const A=runResearchPaperLab({date:day,pools,preset:'guarded_reentry',startBalance:5000,amountPerCoin:50});
const B=runResearchPaperLab({date:day,pools,preset:'guarded_reentry',startBalance:5000,amountPerCoin:50,
 mediaEvidence:strictMedia});
const equal=JSON.stringify(A.events)===JSON.stringify(B.events)
 &&JSON.stringify(A.scans)===JSON.stringify(B.scans)
 &&A.realized_hypothetical_pnl_test_usdc===B.realized_hypothetical_pnl_test_usdc;
if(Math.abs(A.realized_hypothetical_pnl_test_usdc-fixed.new.realized_model_pnl_test_usdc)>1e-8
 ||A.counts.buys!==fixed.new.buys||A.counts.sells!==fixed.new.sells)
 throw Error('BASELINE_V12_FROZEN_NOT_IDENTICAL');
if(strictMedia.length===0&&!equal)throw Error('LEAKED_LATER_MEDIA_INTO_HISTORICAL_REPLAY');
const replay=replayFirstScanMemory({date:day,pools});
const roleStatus={
 dot1:'HISTORICAL_ADAPTIVE_GPT_CADENCE_NOT_EVIDENCED; 24 forced model scans only',
 dot2:'Six frozen sources retrospectively selected; no October original Dot2 discovery or full candidate denominator',
 dot3:'No matching historical two-source prices or tax/honeypot/sellability verification; 0 original ELIGIBLE',
 dot4:'guarded_reentry model A/B only; model orders are not valid GitHub order messages',
 dot5:'No time-travel or unproved media capture; 0 historical Client PAPER_FILLED receipts'
};
const timeline=A.scans.map((v,i)=>{
 const t=v.at_utc;
 const af=A.events.filter(e=>e.at_utc===t),bf=B.events.filter(e=>e.at_utc===t);
 const matched=strictMedia.filter(e=>Date.parse(e.first_captured_at_utc)<=Date.parse(t)
   &&Date.parse(e.published_at_utc)<=Date.parse(t));
 return {scan:i+1,at_utc:t,mesz:new Date(Date.parse(t)+2*hour).toISOString().slice(11,16),
  model_known_pools:replay.steps[i].retained_pool_count,
  known_closed_candles:replay.steps[i].total_known_prior_closed_candles,
  market_only_decisions:v.decisions,
  market_plus_media_decisions:B.scans[i].decisions,
  usable_historic_media_items:matched.length,
  archived_news_found_after_day:archives.length,
  model_A_buy:af.filter(e=>e.action==='BUY_EXPERIMENT').length,
  model_A_sell:af.filter(e=>e.action==='SELL_EXPERIMENT').length,
  model_B_buy:bf.filter(e=>e.action==='BUY_EXPERIMENT').length,
  model_B_sell:bf.filter(e=>e.action==='SELL_EXPERIMENT').length,
  model_A_realized_pnl:af.reduce((p,e)=>p+(e.modelled_pnl_test_usdc||0),0),
  model_B_realized_pnl:bf.reduce((p,e)=>p+(e.modelled_pnl_test_usdc||0),0),
  risk_buy_eligible_verified:0,paper_orders_published:0,client_fills:0,
  dot_roles:roleStatus};
});
const report={schema:1,kind:'R29_V15_OCT12_HISTORICAL_MEDIA_PAIRED_BACKTEST',
 generated_at_utc:new Date().toISOString(),day_utc:day,
 utc_window:['2026-10-12T00:00:00Z','2026-10-13T00:00:00Z'],
 german_window_mesz:['2026-10-12T02:00:00+02:00','2026-10-13T02:00:00+02:00'],
 frozen_identical_six_pools:true,frozen_pool_count:pools.length,
 scans:24,backwards_market_history_available:true,
 baseline_preset:'guarded_reentry',
 archive_research_sources:archives,
 retrieved_retroactively_not_historical_capture:true,
 october_2026_original_media_capture_count:capturedBackThen.length,
 october_2026_strict_contract_and_risk_qualified_media_count:strictMedia.length,
 november_2026_media_events_in_source_memory:knownMedia.length,
 media_unknown_not_false_zero:true,
 five_dot_role_requirements:roleStatus,
 market_only:{buys:A.counts.buys,sells:A.counts.sells,
  wins:A.events.filter(e=>e.action==='SELL_EXPERIMENT'&&e.modelled_pnl_test_usdc>0).length,
  losses:A.events.filter(e=>e.action==='SELL_EXPERIMENT'&&e.modelled_pnl_test_usdc<0).length,
  open_positions:A.open_positions.length,realized_model_pnl_test_usdc:A.realized_hypothetical_pnl_test_usdc,
  cash_remaining_test_usdc:A.remaining_cash_test_usdc},
 market_plus_media:{buys:B.counts.buys,sells:B.counts.sells,
  wins:B.events.filter(e=>e.action==='SELL_EXPERIMENT'&&e.modelled_pnl_test_usdc>0).length,
  losses:B.events.filter(e=>e.action==='SELL_EXPERIMENT'&&e.modelled_pnl_test_usdc<0).length,
  open_positions:B.open_positions.length,realized_model_pnl_test_usdc:B.realized_hypothetical_pnl_test_usdc,
  cash_remaining_test_usdc:B.remaining_cash_test_usdc},
 differences:{buy_count:B.counts.buys-A.counts.buys,sell_count:B.counts.sells-A.counts.sells,
  realized_model_pnl_test_usdc:B.realized_hypothetical_pnl_test_usdc-A.realized_hypothetical_pnl_test_usdc,
  decision_changes:timeline.reduce((n,x)=>n+x.market_only_decisions.filter((d,i)=>
   JSON.stringify(d)!==JSON.stringify(x.market_plus_media_decisions[i])).length,0),
  is_zero_delta_due_to_missing_historically_captured_media:strictMedia.length===0,
  profitability_benefit_of_media_demonstrated:false,
  claim_of_zero_real_world_media_effect_allowed:false},
 actual_historical_dot_trades_verified:0,
 real_git_orders_verified:0,real_client_fills_verified:0,
 non_winner_control_population_available:false,
 independent_blind_recall_pct:null,independent_media_alpha_pct:null,
 prior_known_list_65_used_in_decisions:false,
 timeline,
 limitations:[
  'The media archive was created Nov 21, not at the actual Oct 12 observation time.',
  'Articles with an Oct 12 publication date are NOT timestamped October Dot captures.',
  'No six frozen tapes contain independently verified, explicit contract-linked original October news from two sources.',
  'An unknown Oct 12 social-media history is MISSING_DATA, not zero news or a proven zero media effect.',
  'Market universe six retrospective winner-pools only, no unbiased losing candidate population.',
  '24 hourly model scans do not simulate 24 actual historical autonomous GPT dot sessions.',
  'Paper trades are single-provider model fills, not sellability-verified real paper orders.'
 ]};
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/r29-v15-oct12-market-vs-media.json',JSON.stringify(report,null,2)+'\n','utf8');
const columns=['scan','MESZ','known_pools','known_candles','eligible_news','A_BUY','A_SELL','B_BUY','B_SELL','A_realized_pnl','B_realized_pnl','A_B_differ'];
const csv=[columns.join(',')];
for(const x of timeline)csv.push([x.scan,x.mesz,x.model_known_pools,x.known_closed_candles,
 x.usable_historic_media_items,x.model_A_buy,x.model_A_sell,x.model_B_buy,x.model_B_sell,
 x.model_A_realized_pnl,x.model_B_realized_pnl,
 JSON.stringify(x.market_only_decisions)!==JSON.stringify(x.market_plus_media_decisions)].join(','));
await writeFile('probe-artifacts/r29-v15-oct12-market-vs-media.csv',csv.join('\n')+'\n','utf8');
console.log('R29_V15_HISTORICAL_PAIRED_RESULT',JSON.stringify({
 scans:24,frozen_pools:pools.length,media_from_october_captures:capturedBackThen.length,
 retrospective_news_archives_found:archives.length,media_model_ready:strictMedia.length,
 baseline:A.counts,media:B.counts,pnl_A:A.realized_hypothetical_pnl_test_usdc,
 pnl_B:B.realized_hypothetical_pnl_test_usdc,delta:report.differences.realized_model_pnl_test_usdc,
 decisions_changed:report.differences.decision_changes,
 media_edge:report.differences.profitability_benefit_of_media_demonstrated,
 honest_claim:'Media improvement NOT EVALUABLE because Oct12 as-of news capture was unavailable'}));
