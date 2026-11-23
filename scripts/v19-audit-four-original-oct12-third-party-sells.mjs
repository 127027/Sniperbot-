// R29: 4 exact SHApinned original October 2026 Solana v1 transactions.
// Offline read-only classification of REAL third-party SellV2/V3 evidence.
// No outside APIs, no order, no trading, no fake 50 TEST-USDC quotes.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins}
 from '../src/v19-oct12-verified-pool-token-account-deltas.mjs';
import {auditPinnedOriginalThirdPartySellInstruction}
 from '../src/v19-oct12-original-sell-instruction-audit.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const sha=x=>createHash('sha256').update(x).digest('hex');
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch||!/^[a-f0-9]{40}$/.test(commit??'')
 ||!/^[0-9]{1,20}$/.test(run??''))
 throw Error('R29_ONLY_EXPLICIT_OFFLINE_ORIGINAL_SELL_AUDIT');
const changed=execFileSync('git',
 ['diff-tree','--no-commit-id','--name-only','-r',commit],{encoding:'utf8'})
 .trim().split(/\r?\n/);
const selected=changed.filter(x=>
 /^research\/oct12-sell-original-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||selected.length!==1)
 throw Error('EXACT_ONE_USER_APPROVED_OFFLINE_SELL_SOURCE_REQUEST_REQUIRED');
const requestRaw=await readFile(selected[0]),request=JSON.parse(requestRaw);
if(request.schema!==1||request.kind!=='R29_V19_FOUR_ORIGINAL_OCT12_SELL_INSTRUCTION_RESEARCH'
 ||request.original_transaction_run_id!=='45135625789'
 ||request.original_artifact_id!==14798694515
 ||request.expected_original_transactions!==4
 ||request.offline_only!==true||request.no_market_apis!==true
 ||request.no_retroactive_quote_promotions!==true
 ||request.no_orders_or_ledger_mutation!==true)
 throw Error('ORIGINAL_SOURCE_ONLY_SELL_RESEARCH_REQUEST_INVALID');
const protectedPaths=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedPaths);
const base='probe-artifacts/old-solana-v1-four-tx/r29-oct12-tx-v1-45135625789/';
const rows=[];
for(let i=0;i<4;i++){
 const raw=await readFile(base+pins[i].file,'utf8');
 rows.push(auditPinnedOriginalThirdPartySellInstruction({
  sourceRaw:raw,index:i}));
}
if(rows.length!==4||rows.some(x=>
 !x.actual_original_third_party_sell_transaction_correlated
 ||x.original_D3_05_issuer_and_sellability_acceptance_pass!==false
 ||x.original_QA04_release_authorized!==false
 ||x.orders_published!==0)
 ||rows.filter(x=>x.observed_sell_instruction_types.includes('SellV2')).length!==1
 ||rows.filter(x=>x.observed_sell_instruction_types.includes('SellV3')).length!==3)
 throw Error('SOURCES_NO_LONGER_MATCH_EXACT_FOUR_VERIFIED_SELL_INSTRUCTIONS');
const aggregate=Object.fromEntries(['TANK','ARIANA'].map(coin=>{
 const subset=rows.filter(x=>x.coin===coin);
 return [coin,{original_third_party_sell_instructions:subset.length,
  token_transfer_programs:[...new Set(subset.map(x=>x.original_token_program))],
  original_sell_instruction_types:[...new Set(subset.flatMap(x=>x.observed_sell_instruction_types))],
  token_mint_raw_amount_in:subset.reduce((n,x)=>
   n+BigInt(x.raw_mint_token_units_in),0n).toString(),
  observed_native_pool_sol_out_lamports:subset.reduce((n,x)=>
   n+BigInt(x.pool_native_sol_decreased_lamports),0n).toString(),
  two_sided_bid_ask_from_historical_provider_proven:false,
  quoted_50_test_usdc_buy_and_sell_proven:false,
  historical_sellability_gate_can_be_released:false}];
}));
const report={schema:1,kind:'R29_V19_REAL_OCT12_THIRD_PARTY_ORIGINAL_SELLV2_V3_INSTRUCTIONS',
 run_id:run,source_commit:commit,
 source_request_path:selected[0],source_request_sha256:sha(requestRaw),
 historical_window:'2026-10-12T00:00:00Z..2026-10-13T00:00:00Z_EXCLUSIVE',
 original_source_run:'45135625789',original_source_artifact_id:14798694515,
 sha_pinned_tx_count:rows.length,real_individual_sale_pattern_evidence_count:4,
 original_sell_instruction_labels_verified:true,
 token2022_program_used_by_all_four:true,
 actual_market_participant_sell_routes_existed_on_october_chain:true,
 exact_50usdc_trade_route_at_hourly_scanner_timestamp_proven:false,
 historical_original_provider_delivery_time_proven:false,
 historical_mint_authority_fee_blacklist_freeze_rules_authenticated:false,
 independent_actual_client_paper_fills_proven:false,
 original_dot3_sellability_acceptance_pass:false,
 original_qa04_five_gpt_dot_backtest_ready:false,
 no_original_winner_oracle_read:true,
 no_orders_or_local_state_modified:true,
 observations:rows,by_coin:aggregate};
const out='probe-artifacts/r29-oct12-original-third-party-sells-'+run;
await mkdir(out,{recursive:true});
await writeFile(out+'/sell-instructions.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const lines=['# R29 – Vier echte historische Solana-Verkaufsinstruktionen (Research-Only)',
 '',
 'Nachträglicher Original-Blockchain-Nachweis aus genau vier SHA256-verifizierten',
 'Originaltransaktionen, NICHT vier Bot-Orders oder 50-USDC-Routen.',
 '',
 '| Coin | Blockzeit UTC | Original-Instruktion | Token-2022 Mint-Eingang (Rohmenge) | SOL-Kontoabfluss (Lamports) |',
 '|---|---|---|---:|---:|',
 ...rows.map(x=>'| '+x.coin+' | '+x.block_time_utc+
  ' | '+x.observed_sell_instruction_types.join(', ')+' | '+
  x.raw_mint_token_units_in+' | '+
  x.pool_native_sol_decreased_lamports+' |'),
 '',
 '## Schlussfolgerung',
 'Vier signierte erfolgreiche Fremd-Sell-Instruktionen haben Token in',
 'das jeweilige Pooltokenkonto transferiert und den nativen SOL-Kontostand',
 'des Pools reduziert. D3-05 erhält einen konkreten historischen',
 'Verkaufsaktivitätsbeleg, aber **KEINE ORIGINAL-FREIGABE**:',
 '',
 '- Original-Provider-Zeit, gültige BUY- und EXIT-Quote bei 02:00/18:00: NICHT BELEGT',
 '- 50 TEST-USDC einschließlich SOL/USDC, Slippage, Liquidität, Gebühren: NICHT BELEGT',
 '- Token-2022 Mint-/Freeze-/Transfer-Hook-/Tax- und Blacklist-Zustand: NICHT BELEGT',
 '- Ursprüngliche fünf GPT-Journale und Windows-Paper-Receipt: NICHT BELEGT',
 '- **Kein** ursprünglicher Backtest-PASS oder erstellter BUY/SELL.'
];
await writeFile(out+'/sell-instructions-de.md',lines.join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedPaths));
console.log('R29_ORIGINAL_OCT12_SELLV2V3_SAFETY_RESEARCH_COMPLETED',
 JSON.stringify({run_id:run,real_original_third_party_sell_tx:4,
  TANK:aggregate.TANK,ARIANA:aggregate.ARIANA,
  verified_bidirectional_50usdc_execution_quotes:0,
  D3_05_original_release:false,QA04_original_release:false,
  new_gpt_trading_executions:0,paper_orders:0}));
