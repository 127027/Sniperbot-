// Single Dot4 recommendation entrypoint for LIVE-PAPER and time-travel replay.
// The exact same adapter/decision kernel is invoked from either time context.
// Usage: node scripts/v18-dot4-decision.mjs --input <read-only snapshot.json>
// Output is STDOUT only; no GitHub writes, orders, wallet, account or receipt effects.
import {readFile} from 'node:fs/promises';
import {assessDot4PaperDecision} from '../src/v18-dot4-live-decision.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--input'||!args[1].endsWith('.json'))
 throw Error('USAGE: node scripts/v18-dot4-decision.mjs --input <snapshot.json>');
const data=JSON.parse(await readFile(args[1],'utf8'));
if(data?.schema!==1||data.kind!=='R29_V18_DOT4_DECISION_INPUT'
  ||!['LIVE_PAPER','HISTORICAL_ASOF'].includes(data.time_mode))
 throw Error('INVALID_DOT4_DECISION_INPUT');
const result=assessDot4PaperDecision({
 snapshot:data.snapshot,asOfUtc:data.as_of_utc,
 evaluationMode:data.time_mode,
 priorObservation:data.prior_observation||null,position:data.position||null,
 lastLossAtUtc:data.last_loss_at_utc||null,
 fullReviewDue:data.full_review_due===true,
 // Synthetic inputs never pass this CLI as LIVE; historical regression is
 // handled by node:test, not by a deployable Dot4 decision file.
 allowSyntheticForRegression:false
});
console.log(JSON.stringify({schema:1,kind:'R29_V18_DOT4_READONLY_RESULT',time_mode:data.time_mode,
 as_of_utc:data.as_of_utc,kernel_invocation_mode:data.time_mode,decision:result,
 issuer_verified:false,trade_authorized:false,orders_written:0},null,2));
