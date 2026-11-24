import test from 'node:test';import assert from 'node:assert/strict';import {evaluateRetrospectiveEntry,evaluateRetrospectiveExit,applyRetrospectiveEntry,applyRetrospectiveExit,emptyRetrospectiveLedger,latestObservedCurve,settleRetrospectivePending} from '../src/r29-retrospective-execution.mjs';
const tickUtc='2026-10-12T01:00:00Z',mint='fixture-mint',pool='fixture-pool';
const p={virtual_sol:'33000000000',virtual_token:'960000000000000',real_sol:'3000000000',real_token:'680000000000000'};
const earlier={receipt_id:1,slot:1,mint,pool,signature:'sell',block_time_utc:'2026-10-12T00:55:00Z',source_sha256:'a'.repeat(64),post:{...p,virtual_sol:'30000000000',virtual_token:'1000000000000000'},side:'SELL',event_flow_verified:true};
const later={receipt_id:2,slot:2,mint,pool,signature:'buy',block_time_utc:'2026-10-12T00:58:00Z',source_sha256:'b'.repeat(64),post:p,side:'BUY',event_flow_verified:true};
const pair={mint,pool,earlier:1,later:2,source_time:later.block_time_utc,source_signature:'buy',source_sha256:later.source_sha256,asof_event_state:p,fee_observation:{protocol_bps:'95',creator_bps:'30'}};
const fx={pair:'SOL-USDC',modeled_available_at_utc:'2026-10-12T00:59:00Z',close_usdc_per_sol:111,high_micro_usdc_per_sol:'111000000',low_micro_usdc_per_sol:'111000000',source_sha256:'c'.repeat(64)};
const rows=[{mint,signature:'init',block_time_utc:'2026-10-12T00:53:00Z',controls:[{type:'initializeMint2',info:{mint,decimals:6,mintAuthority:'auth'}},{type:'setAuthority',info:{mint,authority:'auth',authorityType:'mintTokens',newAuthority:null}}],unknown:[]},... [earlier,later].map(s=>({mint,signature:s.signature,block_time_utc:s.block_time_utc,controls:[],unknown:[]}))];
const input={pair,states:[earlier,later],fx,tickUtc,riskInput:{rows,expectedSignatures:['init','sell','buy'],archiveExhausted:true}};
const review=x=>({mint,tick_utc:tickUtc,action:'BUY',reason:'Synthetic regression fixture only',input_sha256:evaluateRetrospectiveEntry(x).input_sha256});
test('signal waits for later observation, then model BUY and SELL settle at distinct subsequent observations',()=>{
 const x={...input,gptReview:review(input)},a=applyRetrospectiveEntry(emptyRetrospectiveLedger(),x);
 assert.equal(a.evaluation.model_signal_eligible,true);assert.equal(a.evaluation.model_fill_eligible,false);
 assert.equal(a.ledger.cash_micro,'5000000000');assert.equal(a.ledger.events[0].execution,'PENDING_NEXT_VERIFIED_MODEL_OBSERVATION');
 const buyState={...later,signature:'later-buy',block_time_utc:'2026-10-12T01:01:00Z',fees:pair.fee_observation};
 const laterRows=[...rows,{mint,signature:buyState.signature,block_time_utc:buyState.block_time_utc,controls:[],unknown:[]}];
 const b=settleRetrospectivePending(a.ledger,{mint,tickUtc:'2026-10-12T01:03:00Z',observations:[earlier,later,buyState],fx,riskInput:{rows:laterRows,expectedSignatures:['init','sell','buy','later-buy'],archiveExhausted:true}});
 assert.equal(b.event.execution,'RETROSPECTIVE_MODEL_FILL');assert.ok(b.ledger.positions[mint]);
 const sellState={...later,block_time_utc:'2026-10-12T01:58:00Z',post:{...p,virtual_sol:'50000000000',virtual_token:'700000000000000',real_sol:'20000000000'},fees:pair.fee_observation};
 const fx2={...fx,modeled_available_at_utc:'2026-10-12T01:59:00Z'};
 const c=applyRetrospectiveExit(b.ledger,{mint,tickUtc:'2026-10-12T02:00:00Z',state:sellState,fx:fx2});
 assert.equal(c.ledger.events.at(-1).execution,'PENDING_NEXT_VERIFIED_MODEL_OBSERVATION');assert.ok(c.ledger.positions[mint]);
 const d=settleRetrospectivePending(c.ledger,{mint,tickUtc:'2026-10-12T02:03:00Z',observations:[{...sellState,signature:'later-sell',block_time_utc:'2026-10-12T02:01:00Z'}],fx:fx2});
 assert.equal(d.event.execution,'RETROSPECTIVE_MODEL_FILL');assert.ok(BigInt(d.ledger.realized_pnl_micro)>0n);assert.deepEqual(d.ledger.positions,{});assert.equal(d.ledger.orders,0);
});
test('pre-signal quote cannot fill a pending BUY',()=>{const a=applyRetrospectiveEntry(emptyRetrospectiveLedger(),{...input,gptReview:review(input)});const b=settleRetrospectivePending(a.ledger,{mint,tickUtc:'2026-10-12T01:02:00Z',observations:[earlier,later],fx,riskInput:input.riskInput});assert.equal(b.event.reason,'NO_POST_SIGNAL_OBSERVATION');assert.equal(b.ledger.cash_micro,'5000000000');});
test('unknown risk, absent or changed review blocks entry, without fixed false on valid input',()=>{assert.equal(evaluateRetrospectiveEntry(input).model_signal_eligible,false);const x={...input,riskInput:{...input.riskInput,archiveExhausted:false}};assert.equal(evaluateRetrospectiveEntry({...x,gptReview:review(x)}).model_signal_eligible,false);assert.equal(evaluateRetrospectiveEntry({...input,gptReview:{...review(input),input_sha256:'0'.repeat(64)}}).model_signal_eligible,false);});
test('future control and unsupported mint instruction fail closed',()=>{for(const rs of [[...rows.slice(0,2),{...rows[2],block_time_utc:tickUtc}],[{...rows[0],controls:[...rows[0].controls,{type:'initializeTransferHook',info:{mint}}]},...rows.slice(1)]]){const x={...input,riskInput:{...input.riskInput,rows:rs}};assert.equal(evaluateRetrospectiveEntry({...x,gptReview:review(x)}).model_signal_eligible,false);}});

test('near-empty independent real liquidity cannot be replaced by hypothetical own buy',()=>{
 const p2={...p,real_sol:'29'},x={...input,pair:{...pair,asof_event_state:p2},states:[earlier,{...later,post:p2}]};
 const e=evaluateRetrospectiveEntry({...x,gptReview:review(x)});
 assert.equal(e.model_signal_eligible,false);assert.ok(e.reasons.includes('INSUFFICIENT_PRE_ENTRY_REAL_SOL_EXIT_LIQUIDITY'));
});
test('same-second terminal selection needs exact linked vault/reserve transitions',()=>{
 const v={token_offset:'1',sol_offset:'1'},a={...earlier,slot:5,block_time_utc:later.block_time_utc,pre:p,post:{...p,real_sol:'100'},vault:{...v,token_pre:'4',token_post:'3',sol_pre:'4',sol_post:'3'}},b={...later,slot:5,pre:a.post,post:{...p,real_sol:'29'},vault:{...v,token_pre:'3',token_post:'2',sol_pre:'3',sol_post:'2'}};
 assert.equal(latestObservedCurve([b,a]).signature,b.signature);assert.equal(latestObservedCurve([a,{...b,pre:p}]),null);
});

// The legacy rules are an explicit comparator, not mandatory strategy in GPT mode.
test('GPT research BUY can disagree with fixed momentum, while risk remains mandatory',()=>{
 const slow={...earlier,post:{...p,virtual_sol:'32900000000'}},x={...input,states:[slow,later],strategyPolicy:'GPT_RESEARCH_V1'};
 const review={mint,pool,tick_utc:tickUtc,action:'BUY',reason:'Fixture catalyst',counterargument:'Fixture downside',invalidation:'Fixture failed thesis',review_id:'fixture-gpt',input_sha256:evaluateRetrospectiveEntry(x).input_sha256};
 const e=evaluateRetrospectiveEntry({...x,gptReview:review});assert.equal(e.diagnostic_signal.action,'WATCH');assert.equal(e.model_signal_eligible,true);
 const bad={...x,riskInput:{...x.riskInput,archiveExhausted:false}};assert.equal(evaluateRetrospectiveEntry({...bad,gptReview:{...review,input_sha256:evaluateRetrospectiveEntry(bad).input_sha256}}).model_signal_eligible,false);
});
test('GPT research exit may sell inside old threshold, missing review cannot sell',()=>{
 const pos={mint,pool,entered_at_utc:'2026-10-12T00:50:00Z',token_raw:'1000000000000',entry_price_usdc:0.0000000035,cost_micro:'50000000'};
 const state={...later,fees:pair.fee_observation};const x={position:pos,state,fx,tickUtc,strategyPolicy:'GPT_RESEARCH_V1'};
 const no=evaluateRetrospectiveExit(x);assert.equal(no.signal.action,'DATA_GAP');
 const r={mint,pool,tick_utc:tickUtc,action:'SELL',reason:'Fixture invalidated',counterargument:'Possible recovery',invalidation:'Thesis failed',review_id:'fixture-sell',input_sha256:no.input_sha256};
 const ledger={...emptyRetrospectiveLedger(),positions:{[mint]:pos}};
 assert.equal(applyRetrospectiveExit(ledger,{mint,state,fx,tickUtc,strategyPolicy:'GPT_RESEARCH_V1',gptReview:r}).ledger.pending[mint].action,'SELL');
});
