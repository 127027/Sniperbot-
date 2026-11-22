// Explicitly retrospective TRAINING-ONLY audit; never imports into Dot2 discovery.
// This frozen 12 Oct six-pool set was chosen AFTER the event and cannot measure blind recall.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runResearchPaperLab} from './research-paper-lab.mjs';
const folder='research/training/2026-10-12/frozen-v11/';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
export async function auditFrozenOctoberTraining({date='2026-10-12'}={}){
 if(date!=='2026-10-12')throw Error('FROZEN_REFERENCE_ONLY_2026_10_12');
 const raw=await readFile(folder+'oct12-training-summary.json','utf8'),summary=JSON.parse(raw);
 if(summary.scenario!=='HISTORICAL_POST_HOC_DIAGNOSTIC_NOT_BLIND_VALIDATION'
  ||summary.source_eligible_pool_tapes!==6||summary.exact_pool_links_in_uploaded_sheet!==8)
  throw Error('RETROSPECTIVE_SOURCE_CLASSIFICATION_MISMATCH');
 const byPool=new Map(summary.source_candidates.filter(x=>x?.pool&&x?.chain)
  .map(x=>[x.chain+':'+x.pool.toLowerCase(),x]));
 const files=(await readdir(folder)).filter(x=>/^oct12-candles-\d+\.json$/.test(x)).sort();
 const pools=[],sources=[];
 for(const f of files){
  const text=await readFile(folder+f,'utf8'),tape=JSON.parse(text);
  const id=tape.chain+':'+tape.pool.toLowerCase(),meta=byPool.get(id);
  if(!meta?.pool_created_at_utc||!Array.isArray(tape.tape?.candles)||!tape.tape.candles.length)
    throw Error('INCOMPLETE_ARCHIVED_POOL_'+f);
  pools.push({id,chain:tape.chain,pool:tape.pool,symbol:tape.symbol,
    pool_created_at_utc:meta.pool_created_at_utc,candles:tape.tape.candles});
  sources.push({file:folder+f,sha256:sha(text),candles:tape.tape.candles.length});
 }
 if(pools.length!==6)throw Error('EXPECTED_SIX_SELECTED_MODEL_POOLS');
 const models={};
 for(const preset of ['exploratory','conservative','volatility_guard','guarded_reentry']){
  const p=runResearchPaperLab({date,pools,preset,startBalance:5000,amountPerCoin:50});
  models[preset]={buys:p.counts.buys,sells:p.counts.sells,
    open_positions:p.open_positions.length,realized_model_pnl_test_usdc:p.realized_hypothetical_pnl_test_usdc,
    reentry_guard_blocks:p.counts.reentryGuardBlocks,
    trade_events:p.events.map(e=>({action:e.action,coin:e.symbol,chain:e.chain,
      at_utc:e.at_utc,entry_at_utc:e.entry_at_utc||null,
      price_usd:e.price_usd,realized_model_pnl_test_usdc:e.modelled_pnl_test_usdc??null}))};
 }
 return {schema:1,kind:'R29_V18_POSTHOC_SIX_POOL_TRAINING_ONLY',
  date,mode:'RETROSPECTIVE_CANDLE_RESEARCH_NOT_ASOF_DOT_DISCOVERY',
  pool_count:pools.length,spreadsheet_winner_references:summary.spreadsheet_reference_count,
  original_pool_link_hints:summary.exact_pool_links_in_uploaded_sheet,
  sources,models,original_october_dot_discovery_verified:false,
  original_october_sellability_verified:false,real_paper_fills:0,
  model_input_selection_uses_hindsight:true,
  training_not_independent_holdout:true,
  caution:'Train-time closed candles are time filtered, but the six-pool universe was selected after the day. Never present trades as GPT Dot decisions or verified executable PnL.'};
}
