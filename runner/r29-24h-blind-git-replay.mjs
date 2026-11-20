// R29 V6.10: offline, chronological, AS-OF Git market history replay.
// It uses only the already-committed GitHub repository history (git log/show).
// No provider API, network request, GPT-model invocation, order or wallet access.
// No hindsight winner list is passed into the forward decision pass.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MARKET='research/market/latest.json';
const REVIEWS='research/r29/channel/gpt-forward-review-status.json';
const DECISION='research/r29/channel/gpt-paper-decision.json';
const RECEIPT='research/r29/channel/gpt-paper-receipt.json';
const DAY=86400000;
const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const round=n=>Math.round(n*100)/100;
const pos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;

export function asofReplay24h({snapshots,reviews=[],decisions=[],receipts=[],
 startUtc,endUtc,stake=50,budget=5000}={}){
 const start=time(startUtc),end=time(endUtc);
 if(start===null||end===null||end<=start||end-start!==DAY||
    !Array.isArray(snapshots)||snapshots.length>1000||
    !Array.isArray(reviews)||!Array.isArray(decisions)||!Array.isArray(receipts)||
    !pos(stake)||!pos(budget)||stake>budget)
  throw Error('R29_24H_REPLAY_INPUT_INVALID');
 const seen=new Map(),chronicle=[],rejects=new Map(),sourceProblems=new Map();
 let rawRows=0,validRows=0,rateLimitedSamples=0,omitted=0,crossVerifiedRows=0;
 const inc=(m,k)=>m.set(k,(m.get(k)||0)+1);
 // Phase one is purely prospective: only observations with a real Git commit
 // timestamp have become available. No outcomes, list of winners or models.
 for(const item of snapshots.slice().sort((a,b)=>
   (time(a.committed_at_utc)||0)-(time(b.committed_at_utc)||0)||
   String(a.commit_sha).localeCompare(String(b.commit_sha)))){
  const commitAt=time(item?.committed_at_utc),d=item?.snapshot;
  const published=time(d?.published_at_utc);
  if(!/^[a-f0-9]{40}$/.test(item?.commit_sha||'')||commitAt===null||
     commitAt<start||commitAt>end||published===null||
     published>commitAt+30000||published<start-600000||
     d?.schema!=='research_market_snapshot.v1'||d.paper_only!==true||
     d.actionable!==false||!Array.isArray(d.candidates)||d.candidates.length>120){
    inc(rejects,'INVALID_OR_OUT_OF_WINDOW_SNAPSHOT');continue;
  }
  rawRows+=d.candidates.length;
  const candidates=[];
  for(const c of d.candidates){
   if(!c||!['solana','base','eth','bsc'].includes(c.chain)||
      ![c.chain,c.token_address,c.pool_address].every(x=>typeof x==='string'&&x.length>0)||
      c.candidate_id!==[c.chain,c.token_address,c.pool_address].join(':')||
      (time(c.observed_at_utc)!==null&&time(c.observed_at_utc)>commitAt+30000)||
      !pos(c.price_usd)||!pos(c.liquidity_usd)){
     inc(rejects,'INVALID_IDENTITY_OR_PRICE');continue;
   }
   validRows++;
   if(c.verification==='CROSS_PROVIDER_IDENTITY')crossVerifiedRows++;
   const id=c.candidate_id;
   // First observation and its publication time are frozen here.
   if(!seen.has(id))seen.set(id,{
    candidate_id:id,chain:c.chain,token_address:c.token_address,
    pool_address:c.pool_address,first_seen_commit_utc:item.committed_at_utc,
    first_seen_source_utc:d.published_at_utc,first_price_usd:c.price_usd,
    first_liquidity_usd:c.liquidity_usd,first_verification:c.verification,
    first_source:c.source,observations:0,max_price_after_first_usd:c.price_usd,
    max_price_at_utc:item.committed_at_utc,
    last_price_usd:c.price_usd,last_observed_at_utc:item.committed_at_utc,
    source_independent_at_first:c.verification==='CROSS_PROVIDER_IDENTITY',
    first_contract_safety_verified:false,first_sellability_verified:false,
    prior_low_price:c.price_usd,max_forward_price_ratio:1,
    forward_low_price_usd:c.price_usd,forward_high_price_usd:c.price_usd,
    forward_low_at_utc:item.committed_at_utc,forward_high_at_utc:item.committed_at_utc
   });
   const p=seen.get(id);
   p.observations++;
   p.last_price_usd=c.price_usd;p.last_observed_at_utc=item.committed_at_utc;
   if(c.price_usd>p.max_price_after_first_usd){
    p.max_price_after_first_usd=c.price_usd;
    p.max_price_at_utc=item.committed_at_utc;
   }
   if(c.price_usd/p.prior_low_price>p.max_forward_price_ratio){
    p.max_forward_price_ratio=c.price_usd/p.prior_low_price;
    p.forward_low_price_usd=p.prior_low_price;
    p.forward_high_price_usd=c.price_usd;
    p.forward_high_at_utc=item.committed_at_utc;
   }
   if(c.price_usd<p.prior_low_price){
    p.prior_low_price=c.price_usd;
    p.forward_low_at_utc=item.committed_at_utc;
   }
   candidates.push(id);
  }
  const limited=(d.coverage||[]).filter(x=>/429|RATE_LIMIT/.test(String(x?.status||'')));
  rateLimitedSamples+=limited.length;
  for(const x of limited)inc(sourceProblems,String(x.chain||'UNKNOWN')+':'+String(x.source||'UNKNOWN'));
  omitted+=Math.max(0,Number(d.summary?.omitted_by_per_chain_cap)||0);
  chronicle.push({commit_sha:item.commit_sha,available_at_utc:item.committed_at_utc,
    source_published_at_utc:d.published_at_utc,valid_pool_quotes:candidates.length,
    provider_429_statuses:limited.length,candidate_ids:candidates});
 }
 // Phase two, after the frozen candidate pass, computes observed hindsight
 // ranges. This is NOT an executable entry/exit quote or a paper fill.
 const pools=[...seen.values()].map(p=>{
  const multiple=p.max_price_after_first_usd/p.first_price_usd;
  const forward=p.max_forward_price_ratio;
  const {prior_low_price,max_forward_price_ratio,...safe}=p;
  return {...safe,first_to_later_peak_pct:round((multiple-1)*100),
    best_seen_low_to_later_high_pct:round((forward-1)*100),
    theoretical_50_first_to_peak_end:round(stake*multiple),
    theoretical_50_best_low_to_peak_end:round(stake*forward),
    theoretical_profit_without_costs:round(stake*(multiple-1)),
    actual_entry_verified:false,actual_exit_verified:false,
    source_only_not_executable:true};
 });
 const repeat=pools.filter(x=>x.observations>=2);
 const doubleFromFirst=repeat.filter(x=>x.first_to_later_peak_pct>=100)
  .sort((a,b)=>b.first_to_later_peak_pct-a.first_to_later_peak_pct||
    a.candidate_id.localeCompare(b.candidate_id));
 const doubledAtAnyPoint=repeat.filter(x=>x.best_seen_low_to_later_high_pct>=100)
  .sort((a,b)=>b.best_seen_low_to_later_high_pct-a.best_seen_low_to_later_high_pct);
 // Research-quality filter is deliberately NOT a safety/tradability approval.
 // Spotty two-sample and >100x changes remain in the RAW appendix, not in
 // the primary research shortlist. Repeated quotes and initial independent
 // pool identity merely reduce obvious price-scale and sampling anomalies.
 const reviewableDoublers=doubleFromFirst.filter(x=>
  x.observations>=3&&x.first_liquidity_usd>=10000&&
  x.first_verification==='CROSS_PROVIDER_IDENTITY'&&
  x.first_to_later_peak_pct<=9900);
 const extremeUnverified=doubleFromFirst.filter(x=>
  x.first_to_later_peak_pct>9900);
 const onlyTwoSamples=doubleFromFirst.filter(x=>x.observations===2);
 const validEvent=(ev,key)=>{
  const at=time(ev?.published_commit_at_utc);
  return at!==null&&at>=start&&at<=end&&ev?.[key];
 };
 const archivedReviews=reviews.filter(x=>validEvent(x,'review_id')&&
    time(x.completed_at_utc)!==null&&
    time(x.completed_at_utc)<=time(x.published_commit_at_utc)&&
    ['BUY','WATCH','HOLD','SELL','NO_ACTION'].includes(x.action))
  .sort((a,b)=>Date.parse(a.published_commit_at_utc)-Date.parse(b.published_commit_at_utc));
 // Post-hoc evaluation only. These future labels MUST NEVER enter a
 // prospective GPT review or be counted as actually reviewed contracts.
 const reviewOpportunityDiagnostics=archivedReviews.map(r=>{
  const at=time(r.published_commit_at_utc);
  const last=chronicle.filter(s=>time(s.available_at_utc)<=at).at(-1);
  const available=new Set(last?.candidate_ids||[]);
  const eventuallyDoubled=doubleFromFirst.filter(x=>
    available.has(x.candidate_id)&&time(x.max_price_at_utc)>at).length;
  return {review_id:r.review_id,review_completed_at_utc:r.completed_at_utc,
   review_published_at_utc:r.published_commit_at_utc,
   nearest_archived_market_snapshot_utc:last?.available_at_utc||null,
   market_rows_available_at_latest_snapshot:available.size,
   snapshot_contains_pool_with_later_observed_100pct_excursion:eventuallyDoubled,
   model_actually_reviewed_these_future_movers:'NOT_VERIFIED',
   classifier_past_tense_only:true};
 });
 const actualDecisions=decisions.filter(x=>validEvent(x,'decision_id'));
 const actualReceipts=receipts.filter(x=>validEvent(x,'decision_id'));
 const buys=actualDecisions.filter(x=>x.action==='BUY');
 const filled=actualReceipts.filter(x=>x.status==='PAPER_FILLED');
 // Strict: without both prior GPT BUY and verified execution/sellability
 // evidence, zero trades. This replay never mutates any ledger or wallet.
 const verifiedNewBuys=buys.filter(x=>filled.some(r=>r.decision_id===x.decision_id&&
     r.action==='BUY'&&Date.parse(r.published_commit_at_utc)>=Date.parse(x.published_commit_at_utc)));
 return {schema:'r29_24h_asof_git_replay.v1',mode:'OFFLINE_GITHUB_HISTORY_ONLY',
  period:{start_utc:startUtc,end_utc:endUtc},paper_only:true,
  virtual_stake_test_usdc:stake,virtual_budget_test_usdc:budget,
  user_paper_account_changed:false,network_requests:0,model_inference_calls:0,
  asof_replay:true,prospective_strategy_reinference_performed:false,
  snapshot_commits_loaded:chronicle.length,
  snapshots_rejected:Object.fromEntries(rejects),
  candidate_rows_total:rawRows,candidate_rows_with_identity_and_price:validRows,
  independent_identity_rows:crossVerifiedRows,unique_chain_token_pools:pools.length,
  pools_with_multiple_price_samples:repeat.length,
  provider_429_status_count:rateLimitedSamples,
  provider_429_by_chain_and_source:Object.fromEntries(sourceProblems),
  omitted_by_provider_caps_across_snapshots:omitted,
  first_to_peak_observed_over_100_pct:doubleFromFirst.length,
  any_low_to_later_high_observed_over_100_pct:doubledAtAnyPoint.length,
  research_quality_shortlist_doublers:reviewableDoublers.length,
  extreme_over_100x_unverified_price_jumps:extremeUnverified.length,
  doubled_with_two_samples_only:onlyTwoSamples.length,
  gpt_full_reviews_observed:archivedReviews.length,
  gpt_actions:archivedReviews.reduce((o,r)=>(o[r.action]=(o[r.action]||0)+1,o),{}),
  signed_buy_decisions_published:buys.length,
  public_paper_filled_receipts:filled.length,
  archived_buy_and_filled_pairs:verifiedNewBuys.length,
  strict_replay_virtual_buy_count:0,strict_replay_virtual_sell_count:0,
  theoretical_hindsight_paper_only:true,
  strict_execution_blockers:[
    'NO_EXECUTABLE_HISTORICAL_INDEPENDENT_QUOTES_OR_SELLABILITY',
    ...(buys.length===0?['NO_ARCHIVED_GPT_BUY_DECISION']:[]),
    'NO_NEW_GPT_INFERENCE_PER_HISTORIC_TIME_STEP',
    'NO_LOCAL_PRIVATE_PAPER_FILL_REPLAY_INPUT'
  ],
  coverage_limitation:'Only committed GitHub candidate samples; missing prices, 429, per-chain caps, rapidly disappeared coins and unobserved chains excluded',
  market_observations:chronicle.map(({candidate_ids,...a})=>a),
  actual_gpt_reviews:archivedReviews,
  review_opportunity_diagnostics:reviewOpportunityDiagnostics,
  published_trade_decisions:actualDecisions,
  paper_receipts:actualReceipts,
  top_first_to_peak_movers:doubleFromFirst.slice(0,30),
  top_research_quality_shortlist:reviewableDoublers.slice(0,30),
  top_low_to_later_high_movers:doubledAtAnyPoint.slice(0,30),
  all_first_to_peak_doublers:doubleFromFirst,
  all_low_to_later_high_doublers:doubledAtAnyPoint,
  interpretation:'Price excursions are hindsight upper bounds, NOT proof of tradable buy/sell or model signal. No fabricated trades.'
 };
}

function git(args,{maxBuffer=40*1024*1024}={}){
 return execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer,timeout:30000});
}
export function loadGitPathHistory(file,startUtc,endUtc,{maxEntries=500}={}){
 if(![MARKET,REVIEWS,DECISION,RECEIPT].includes(file))
  throw Error('UNTRUSTED_GIT_HISTORY_PATH');
 const lines=git(['log','--no-merges','--format=%H%x09%cI',
   '--since='+startUtc,'--until='+endUtc,'HEAD','--',file])
  .split(/\r?\n/).filter(Boolean);
 if(lines.length>maxEntries)throw Error('GIT_REPLAY_HISTORY_COUNT_TOO_LARGE');
 const rows=[];
 for(const line of lines){
  const [commit_sha,committed_at_utc]=line.split('\t');
  if(!/^[a-f0-9]{40}$/.test(commit_sha)||time(committed_at_utc)===null)
   throw Error('GIT_REPLAY_INVALID_COMMIT_METADATA');
  const raw=git(['show',commit_sha+':'+file],{maxBuffer:3*1024*1024});
  if(Buffer.byteLength(raw,'utf8')>2*1024*1024)
   throw Error('GIT_REPLAY_SNAPSHOT_TOO_LARGE');
  rows.push({commit_sha,committed_at_utc,snapshot:JSON.parse(raw)});
 }
 return rows;
}
function archivedReviewsFromGit(rows){
 const earliest=new Map();
 for(const row of rows.sort((a,b)=>Date.parse(a.committed_at_utc)-Date.parse(b.committed_at_utc))){
  for(const r of row.snapshot?.reviews||[]){
   // The actual 20 November archive contains a corrected malformed review ID.
   // Count unique actual review events, not the old and fixed identifier
   // as two separate model calls.
   if(!/^gptreview_[a-f0-9]{32}$/.test(r.review_id||''))continue;
   if(time(r.completed_at_utc)===null||typeof r.artifact_path!=='string')continue;
   const eventKey=r.completed_at_utc+'|'+r.artifact_path;
   if(!earliest.has(eventKey))earliest.set(eventKey,{
    review_id:r.review_id,completed_at_utc:r.completed_at_utc,
    published_commit_at_utc:row.committed_at_utc,action:r.action,
    candidates_seen:r.candidates_seen,candidates_reviewed:r.candidates_reviewed});
  }
 }
 return [...earliest.values()];
}
function archiveActions(rows,kind){
 return rows.map(x=>({
  decision_id:x.snapshot?.decision_id||null,
  action:kind==='receipt'?x.snapshot?.action||null:
    x.snapshot?.action||'POINTER_ONLY',
  status:kind==='receipt'?x.snapshot?.status||null:null,
  published_commit_at_utc:x.committed_at_utc,
  commit_sha:x.commit_sha
 }));
}
export function renderMarkdown(r){
 const lines=[
  '# R29 – 24h-AS-OF-Replay aus GitHub-Historie',
  '',
  '**Zeitraum (UTC):** '+r.period.start_utc+' bis '+r.period.end_utc,
  '',
  '**KEINE Live-Trades. Kein Echtgeld. Kein externer API-Zugriff. Kein Eingriff in das lokale Paper-Konto.**',
  '',
  '| Nachweis | Wert |','|---|---:|',
  '| Zeitgerecht eingelesene Git-Snapshots | '+r.snapshot_commits_loaded+' |',
  '| Pool-Kursbeobachtungen | '+r.candidate_rows_with_identity_and_price+' |',
  '| Verschiedene exakte Chain/Token/Pool-IDs | '+r.unique_chain_token_pools+' |',
  '| Pools mit mindestens 2 Preisbeobachtungen | '+r.pools_with_multiple_price_samples+' |',
  '| Erstbeobachtung → späterer Peak über 100% | '+r.first_to_peak_observed_over_100_pct+' |',
  '| Historisches Tief → späteres Hoch über 100% | '+r.any_low_to_later_high_observed_over_100_pct+' |',
  '| Research-Qualitäts-Shortlist (keine Handelsfreigabe) | '+r.research_quality_shortlist_doublers+' |',
  '| Extrembewegungen >100x, nicht unabhängig validiert | '+r.extreme_over_100x_unverified_price_jumps+' |',
  '| Verdoppler mit nur 2 historischen Kursbeobachtungen | '+r.doubled_with_two_samples_only+' |',
  '| Quellstatus 429 (Snapshots, nicht einmalige Fehlversuche) | '+r.provider_429_status_count+' |',
  '| Archivierte GPT-Vollreviews | '+r.gpt_full_reviews_observed+' |',
  '| Archivierte GPT-BUYs | '+r.signed_buy_decisions_published+' |',
  '| Archivierte öffentliche PAPER_FILLED-Receipts | '+r.public_paper_filled_receipts+' |',
  '| Streng belegte Replay-Käufe | '+r.strict_replay_virtual_buy_count+' |',
  '',
  '## Für die Forschung priorisierte Kursbewegungen (NICHT handelbar bestätigt)',
  '',
  'Berechnung: erster archivierter Kurs eines Pools bis zu dessen späterem archiviertem Höchstkurs; keine Ausführbarkeitszusage.',
  '',
  '| Chain / Contract / Pool | Erstsichtung | Beobachtungen | Kursbewegung | 50 TEST-USDC theoretischer Peakwert |',
  '|---|---|---:|---:|---:|'
 ];
 for(const x of r.top_research_quality_shortlist.slice(0,25)){
  lines.push('| '+x.chain+' / '+x.token_address+' / '+x.pool_address+
   ' | '+x.first_seen_commit_utc+' | '+x.observations+
   ' | +'+x.first_to_later_peak_pct+'% | '+x.theoretical_50_first_to_peak_end+' |');
 }
 if(!r.top_research_quality_shortlist.length)lines.push('| Keine Bewegung mit den zusätzlichen Qualitätsmerkmalen belegt | – | – | – | – |');
 lines.push('','Der vollständige Rohdaten-Anhang in der JSON-Datei enthält auch extreme und schlecht belegte Werte. Diese sind nicht als realisierbare Gewinne zu bewerten.');
 lines.push('', '## Was GPT tatsächlich dokumentierte', '',
  'GPT-Aktionen: '+JSON.stringify(r.gpt_actions)+'.',
  'Es wurde kein GPT-Modell bei jedem historischen Zeitpunkt erneut ausgeführt. Das Archiv rekonstruiert nur tatsächlich bekannte Entscheidungen.',
  '',
  '### Welche späteren Verdoppler waren in den letzten veröffentlichten Snapshots vor den GPT-Reviews enthalten?',
  '',
  '| Review veröffentlicht UTC | Pools im neuesten verfügbaren Snapshot | Pools daraus mit späterem beobachtetem >100%-Anstieg |',
  '|---|---:|---:|',
  ...r.review_opportunity_diagnostics.map(x=>'| '+x.review_published_at_utc+' | '+x.market_rows_available_at_latest_snapshot+' | '+x.snapshot_contains_pool_with_later_observed_100pct_excursion+' |'),
  '',
  'Die letzte Spalte ist eine NACHTRÄGLICHE Auswertung, kein Nachweis, dass GPT diese Coins geprüft oder rechtzeitig als BUY erkannt hat.',
  '',
  '## Warum der strenge Replay keine Käufe ausführt', '');
 for(const x of r.strict_execution_blockers)lines.push('- '+x);
 lines.push('',
  'Historische Marktpreise sind **indikative Beobachtungen**, keine nachgewiesenen ausführbaren Kauf- und Verkaufsangebote.',
  'Der größte anschließend sichtbare Kursanstieg ist reiner Rückblick und kein damals bekanntes Kaufsignal.',
  'Ein einzelner Datensatz mit hoher Steigerung beweist weder erfolgversprechende Strategie noch Kauf-/Verkaufsfähigkeit.',
  'Die nur teilweise Quellenabdeckung und API-Ratenlimit-Einträge aus alten Snapshots sind historische Daten, keine heutigen API-Aufrufe.',
  '',
  '## Nächste technische Abnahme',
  '',
  'Für echte isolierte BUY/SELL-Replay-Fills werden archivalisch prüfbare historische Security-, LP-, ausführbare Zweiweg-Quote- und signierte GPT-Entscheidungsdaten benötigt. Diese fehlen aktuell; keine Gate-Umgehung.',
  '');
 return lines.join('\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const startUtc=process.argv[2]||'2026-11-19T20:48:09.000Z';
 const endUtc=process.argv[3]||'2026-11-20T20:48:09.000Z';
 const out=process.argv[4]||path.join(root,'.local','r29-24h-replay');
 const histories={
  market:loadGitPathHistory(MARKET,startUtc,endUtc),
  reviews:loadGitPathHistory(REVIEWS,startUtc,endUtc),
  decisions:loadGitPathHistory(DECISION,startUtc,endUtc),
  receipts:loadGitPathHistory(RECEIPT,startUtc,endUtc)
 };
 const r=asofReplay24h({
  startUtc,endUtc,snapshots:histories.market,
  reviews:archivedReviewsFromGit(histories.reviews),
  decisions:archiveActions(histories.decisions,'decision'),
  receipts:archiveActions(histories.receipts,'receipt'),
  stake:50,budget:5000});
 mkdirSync(out,{recursive:true});
 writeFileSync(path.join(out,'R29_24H_ASOF_REPLAY.json'),JSON.stringify(r,null,2)+'\n');
 writeFileSync(path.join(out,'R29_24H_ASOF_REPLAY.md'),renderMarkdown(r));
 console.log('R29_24H_ASOF_REPLAY_RESULT='+JSON.stringify({
  snapshots:r.snapshot_commits_loaded,
  poolObservations:r.candidate_rows_with_identity_and_price,
  pools:r.unique_chain_token_pools,
  repeatPools:r.pools_with_multiple_price_samples,
  doublerFirstToPeak:r.first_to_peak_observed_over_100_pct,
  doublerLowToPeak:r.any_low_to_later_high_observed_over_100_pct,
  gptReviews:r.gpt_full_reviews_observed,
  gptBuys:r.signed_buy_decisions_published,
  publicFills:r.public_paper_filled_receipts,
  strictBuys:r.strict_replay_virtual_buy_count,
  provider429:r.provider_429_status_count,
  researchShortlist:r.research_quality_shortlist_doublers,
  extremeUnverified:r.extreme_over_100x_unverified_price_jumps,
  onlyTwoPriceSamples:r.doubled_with_two_samples_only,
  reviewOpportunityCounts:r.review_opportunity_diagnostics.map(x=>x.snapshot_contains_pool_with_later_observed_100pct_excursion),
  top:r.top_research_quality_shortlist.slice(0,8).map(x=>({
    id:x.candidate_id,pct:x.first_to_later_peak_pct,
    first:x.first_seen_commit_utc,peak:x.max_price_at_utc,
    n:x.observations,beginPrice:x.first_price_usd,peakPrice:x.max_price_after_first_usd
  }))
 }));
}
