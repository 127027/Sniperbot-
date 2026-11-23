// R29: POST-RUN ONLY neutral historical Solana research appendix.
// The upstream artifact is a THIRD-PARTY RETROSPECTIVE archive generated in
// November 2026, not a provider response proven delivered on October 12.
// Importing this module into Dot2/Dot3/Dot4 execution is forbidden by design.
// Never return features, prices, safety gates, or positive trade instructions.
import {asOfMillis} from './v19-asof-evidence.mjs';

// Original SHA-256 digests of *uncompressed* days pinned to archived artifact.
export const R29_PINNED_NEUTRAL_OCT_SOURCE=Object.freeze({
 actions_run_id:44048309420,
 artifact_id:14312891173,
 full_artifact_zip_sha256:'71665923352ed392e6314cad9afcf9219354cc46390b050019f6426c026b96b1',
 day_11_sha256:'7b4e917ec5904ab089452029564baf09fa99bbda9c11e91db8d54a79cd49097c',
 day_12_sha256:'8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7d3ab'
});
const SCHEMA='r29_real_43day_fresh_5minute_asof_frames_v2';
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const iso=millis=>new Date(millis).toISOString();

function validateDay(day,date){
 if(day?.schema!==SCHEMA||day.day!==date
   ||day.source_capture_released_after_historical_events!==true
   ||day.no_future_labels!==true
   ||day.model_calls!==0||day.paper_fills!==0
   ||!Array.isArray(day.frames)||day.frames.length!==24
   ||!Array.isArray(day.source_forbidden_outcome_columns_excluded)
   ||!['rugged','graduated','peak_rs','outcome_status'].every(
       key=>day.source_forbidden_outcome_columns_excluded.includes(key)))
  throw Error('INVALID_OR_UNSAFE_RETROSPECTIVE_ARCHIVE_DAY_'+date);
}
const asMinute=(date,hour)=>date+'T'+String(hour).padStart(2,'0')+':00:00.000Z';

export function auditRetrospectiveNeutral24HourlySource({
 priorDay,tradingDay,artifactDownloadedAtUtc,
 sourceArtifactId=14312891173,sourceRunId=44048309420
}={}){
 validateDay(priorDay,'2026-10-11');
 validateDay(tradingDay,'2026-10-12');
 const downloaded=asOfMillis(artifactDownloadedAtUtc);
 const testStart=asOfMillis('2026-10-12T00:00:00.000Z');
 const testEnd=asOfMillis('2026-10-13T00:00:00.000Z');
 if(downloaded===null||downloaded<=testEnd
   ||sourceArtifactId!==14312891173||sourceRunId!==44048309420)
  throw Error('RETRO_ARCHIVE_NOT_POST_EVENT_OR_WRONG_ARTIFACT');
 if(priorDay.source_raw_parquet_sha256===tradingDay.source_raw_parquet_sha256
   ||![priorDay.source_raw_parquet_sha256,tradingDay.source_raw_parquet_sha256]
      .every(x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x)))
  throw Error('RETRO_ARCHIVE_RAW_SOURCE_DIGESTS_INVALID');
 // The last 11 October hourly frame ends at 12 October 00:00.
 // The first 23 12 October frames end at 01:00,...,23:00.
 // The 12 October 24th frame ends at 13 October 00:00 and is EXCLUDED.
 const candidates=[priorDay.frames[23],...tradingDay.frames.slice(0,23)];
 const byMint=new Set(),rows=[];
 let count=0,features=0,ageMismatch=0;
 for(let h=0;h<24;h++){
   const frame=candidates[h],expected=asMinute('2026-10-12',h);
   const at=asOfMillis(frame?.at_utc);
   if(at!==asOfMillis(expected)
     ||!Number.isInteger(frame.neutral_fresh_mints_within_5min)
     ||frame.neutral_fresh_mints_within_5min<0
     ||!Number.isInteger(frame.feature_rows_last_5min)
     ||frame.feature_rows_last_5min<0
     ||!Array.isArray(frame.last_eight_fresh_neutral_mints)
     ||frame.last_eight_fresh_neutral_mints.length!==8
     ||frame.no_future_outcomes!==true||frame.gpt_model_calls!==0
     ||frame.independent_sellable_buy_sell_quotes!==false
     ||frame.paper_trades!==null
     ||frame.neutral_fresh_mints_within_5min<8)
     throw Error('INVALID_RETRO_NEUTRAL_FRAME_'+h);
   const samples=[];
   for(const entry of frame.last_eight_fresh_neutral_mints){
     const mint=entry?.asof_features?.mint,observed=asOfMillis(entry?.observed_at_utc);
     if(!MINT.test(mint??'')||observed===null
       ||observed>at||at-observed>5*60*1000
       ||entry.asof_features.quote_evidence!==null
         &&entry.asof_features.quote_evidence!==undefined)
       throw Error('INVALID_RETRO_MINT_SAMPLE_OR_TIME_'+h);
     const age=(at-observed)/1000;
     if(Number.isFinite(entry.age_at_scan_s)
       &&Math.abs(entry.age_at_scan_s-age)>1)ageMismatch++;
     byMint.add(mint);
     // No source feature flags, source-modeled quote/price, age_s,
     // reputation, rug, ATH, seller, or outcome fields can cross here.
     samples.push({chain:'solana',mint,
       source_observed_at_utc:iso(observed),seconds_before_scan:age,
       exact_pool:null,tradable_usdc_quote_verified:false,
       sellability_original_verified:false,source_provider_delivered_asof_verified:false,
       provenance:'POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'});
   }
   count+=frame.neutral_fresh_mints_within_5min;
   features+=frame.feature_rows_last_5min;
   rows.push({scan:h+1,at_utc:expected,
     retrospective_last_5min_mint_occurrences:frame.neutral_fresh_mints_within_5min,
     retrospective_last_5min_feature_rows:frame.feature_rows_last_5min,
     postrun_neutral_mint_sample:samples,
     quote_and_sellability_status:'NOT_VERIFIED_NOT_A_TRADE_DECISION'});
 }
 return {schema:1,kind:'R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS',
  date:'2026-10-12',source_chain_scope:'SOLANA_ONLY',
  source_revision:'9b9a04e7e3e85775d614d16105daad2e69ce8544',
  source_artifact_id:sourceArtifactId,source_actions_run_id:sourceRunId,
  artifact_downloaded_at_utc:artifactDownloadedAtUtc,
  archive_released_after_historical_test:true,
  original_provider_delivered_during_october_independently_verified:false,
  provider_quote_age_verified:false,original_bidirectional_usdc_quotes_verified:0,
  independently_verified_sellable_coins:0,
  prior_day_raw_source_sha256:priorDay.source_raw_parquet_sha256,
  trading_day_raw_source_sha256:tradingDay.source_raw_parquet_sha256,
  hourly_scans:rows.length,
  retrospective_mint_occurrences_in_24_last5min_windows:count,
  retrospective_feature_rows_in_24_last5min_windows:features,
  distinct_sample_mints:byMint.size,
  sampled_mint_occurrences:rows.reduce((sum,x)=>sum+x.postrun_neutral_mint_sample.length,0),
  claimed_age_field_disagrees_with_recomputed_observation_age_count:ageMismatch,
  age_field_not_trusted_for_asof_decisions:true,
  all_100pct_winners_in_market:'UNKNOWN_NOT_MEASURED',
  per_hour:rows,
  never_eligible_to_seed_historical_discovery:true,
  never_eligible_for_entry_or_exit_quotes:true,
  provider_event_time_not_provider_delivery_time:true,
  no_future_oracle_consumed_for_decisions:true};
}
