// R29 V4.5 – prevent reintroducing previously refuted startup instructions,
// stale market verdicts and fabricated ChatGPT/real Paper trading claims.
// Test uses repository files only. No secrets, balances, network or user machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const text=relative=>readFileSync(path.join(root,relative),'utf8');
const target='research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md';
const auditPath='research/r29/operations/R29_V4_5_DOKUMENTATIONS_AUDIT_20261118.json';
const guide=text(target);
const audit=JSON.parse(text(auditPath));
const currentFiles=[
 'AGENTS.md','README.md','ERSTER_START.txt','SNIPERBOT_R29_START_HERE.md',
 'docs/ARCHITECTURE.md','docs/KNOWN_ISSUES.md','docs/ROADMAP.md',
 'docs/CODEX_TASKS.md','docs/REQUIREMENTS.md',
 'docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md'
];
test('all current entry docs identify same canonical GitHub-only project knowledge',()=>{
 for(const f of currentFiles){
  const t=text(f);
  assert.match(t.slice(0,3000),/R29 V4\.5|V4\.5|R29-V4\.5/,f+' missing current date/version');
  assert(t.includes('R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md'),
   f+' has no canonical source-of-truth link');
 }
 assert.match(guide,/nicht erneut|NICHT WIEDERHOLEN/i);
 assert.match(guide,/ChatGPT/);
 assert.match(guide,/GitHub/);
 assert.match(guide,/PAPER_ONLY/);
 assert.match(guide,/positionsgebunden|positionsgebundene/);
});
test('current docs never require the retired Windows starter or paid local API',()=>{
 const active=[
  'README.md','AGENTS.md','ERSTER_START.txt',
  'docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md','docs/CODEX_TASKS.md',
  'docs/REQUIREMENTS.md'
 ];
 for(const f of active){
  const all=text(f);
  assert.doesNotMatch(all,/\bWindows_Starten\.bat\b/,f+' points to deleted starter');
 }
 for(const f of ['README.md','AGENTS.md','ERSTER_START.txt']){
  assert.match(text(f).slice(0,6500),/Sniperbot_Starten\.bat/,f);
 }
 assert.doesNotMatch(text('runner/windows-supervisor.ps1'),/WithCentralAI|ResetAiKey|Read-AiKey/);
 assert.doesNotMatch(text('runner/server.mjs'),/startCentralAiCoordinator|SNIPER_CENTRAL_AI_ENABLED==='1'/);
 assert.match(text('runner/windows-supervisor.ps1'),/SNIPER_R29_GPT_SOURCE'\]='GITHUB_CHATGPT_COURIER'/);
});
test('historical local paid-API instructions preserved but unmistakably archived',()=>{
 const old=['docs/V021_ZENTRALE_KI_START.md',
  'docs/archive/R28_VERBINDUNGSTEST_LEGACY_LOKAL_API_20261115.md'];
 for(const f of old){
  assert.match(text(f).slice(0,1300),/ARCHIV/i,f+' must be archival');
  assert.match(text(f).slice(0,1300),/NICHT|nicht/i);
 }
 assert.doesNotMatch(text('docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md'),
  /Wenn .*CENTRAL_AI_NOT_ACTIVE.*(?:Key|Kosten)|-ResetAiKey/);
});
test('audit and source document cannot turn simulated or NO_TRADE evidence into real GPT fills',()=>{
 assert.equal(audit.governing_policy.additional_local_paid_openai_api_required,false);
 assert.equal(audit.governing_policy.live_trading_allowed,false);
 assert.equal(audit.governing_policy.new_autonomous_paper_buy_allowed,false);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.local_capture_1.observed_pools,64);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.local_capture_1.canonical_public_research_alerts,24);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.historical_paging_verified.validated_asof_candidate_time_pairs,310540);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.historical_paging_verified.missing_pages,0);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.historical_paging_verified.actual_historical_gpt_trade_fills_verified,0);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.gpt_courier_user_report.replay_decision_count,8);
 assert.equal(audit.proven_evidence_at_specific_utc_instants.gpt_courier_user_report.latest_public_receipt_action,'NO_TRADE');
 assert.equal(audit.proven_evidence_at_specific_utc_instants.gpt_courier_user_report.origin_model_signature_verified,false);
 assert.match(guide,/8 empfangene Entscheidungen = 8 Käufe|8.*Entscheidungs-IDs/i);
 assert.match(guide,/NICHT.*acht Aufträge|keine.*acht/i);
 assert.match(guide,/origin_model_signature_verified:false/);
 assert.match(guide,/241\.649/);
 assert.match(guide,/separat|separate/i);
});
test('status diagnostic describes generic agent publisher separately from GitHub GPT bridge',()=>{
 const d=text('runner/r28-connection-diagnostic.mjs');
 assert.match(d,/LOCAL_PAID_API_DISABLED_BY_DESIGN_GITHUB_ONLY/);
 assert.match(d,/publisher_connected_scope:'SEPARATE_GENERIC_SIGNED_AGENT_PUBLISHER'/);
 assert.match(d,/github_gpt_bridge_ready:gptReady/);
 assert.match(d,/BOT_AND_GITHUB_GPT_RECEIVER_READY_NO_ORDER_PROOF/);
 assert.doesNotMatch(d,/coordinator receipt; no dummy trade is counted/);
});
test('existing GPT strategist roles and local customer data boundaries stay clear',()=>{
 assert.equal(audit.current_automations_metadata_observed.length,2);
 assert.equal(audit.current_automations_metadata_observed[0].role,'PROSPECTIVE_GPT_PAPER_RESEARCH');
 assert.equal(audit.current_automations_metadata_observed[1].role,'HISTORICAL_BLIND_BACKTEST_ONLY');
 assert.equal(audit.governing_policy.new_bots_or_tasks_to_create,false);
 assert.equal(audit.governing_policy.existing_private_credentials_to_remove,false);
 assert.match(guide,/\.local/);
 assert.match(guide,/MemeSniperPaper/);
});
