import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHistoricalPreflight,REQUIRED_PROOFS} from './historical-evidence-gate.mjs';
const now='2026-10-15T00:01:00Z',mint='4yssA3q3qSDvFPFb1EJQopg3xfQtyLNXG9saNEvfRoot';
const base={asof_utc:now,chain:'solana',token_address:mint};
const single=type=>({type,source_uri:'https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample',
 source_sha256:'abe5a208232facf9f1df2a03e781a7408c0656c067f355fdec66bc449232b42f',
 proof_id:'sample-2026-10-15',token_address:mint,chain:'solana',
 event_at_utc:'2026-10-15T00:00:00Z',evidence_available_at_utc:now,
 independent_asof_proof:true,tradable_from_historical_pool:true});
test('real third-party sample without independent chain proof is never a BUY',()=>{
 const sample=single('NEUTRAL_CANDIDATE_IDENTITY');
 sample.independent_asof_proof=false;
 const x=assessHistoricalPreflight({...base,evidence:[sample]});
 assert.equal(x.permission,'NO_ORDER_EVIDENCE_GAP');
 assert.equal(x.source_proofs_accepted,0);
 assert.deepEqual(x.missing_required_proofs,REQUIRED_PROOFS);
 assert.equal(x.gpt_buy_decision,null);
 assert.equal(x.actual_historical_buy_or_sell_fill,false);
});
test('future reports at virtual T never qualify, irrespective of genuine prices',()=>{
 const nowPlus='2026-10-15T00:03:00Z';
 const future=single('ASOF_POOL_AND_RESERVES');
 future.event_at_utc=nowPlus;
 future.evidence_available_at_utc=nowPlus;
 const x=assessHistoricalPreflight({...base,evidence:[future]});
 assert.equal(x.permission,'NO_ORDER_EVIDENCE_GAP');
 assert.equal(x.source_proofs_accepted,0);
 assert.equal(x.source_proofs_rejected.length,1);
});
test('even complete, independently verified fixture proofs only permit GPT review, not auto-BUY',()=>{
 const all=REQUIRED_PROOFS.map(single);
 const x=assessHistoricalPreflight({...base,evidence:all});
 assert.equal(x.permission,'REVIEWABLE_BY_GPT_PAPER_ONLY');
 assert.equal(x.missing_required_proofs.length,0);
 assert.equal(x.model_decision_generated,false);
 assert.equal(x.gpt_buy_decision,null);
 assert.equal(x.actual_historical_buy_or_sell_fill,false);
});
test('missing historical bidirectional swapability blocks orders even if momentum looks real',()=>{
 const proofs=REQUIRED_PROOFS.filter(t=>t!=='ASOF_BIDIRECTIONAL_SWAPABILITY').map(single);
 const x=assessHistoricalPreflight({...base,evidence:proofs});
 assert.deepEqual(x.missing_required_proofs,['ASOF_BIDIRECTIONAL_SWAPABILITY']);
 assert.equal(x.permission,'NO_ORDER_EVIDENCE_GAP');
});
test('stale liquidity, mismatched token and fake future proof are all separately rejected',()=>{
 const a=single('ASOF_POOL_AND_RESERVES');
 a.event_at_utc='2026-10-14T22:00:00Z';
 a.evidence_available_at_utc='2026-10-14T22:00:01Z';
 const b=single('ASOF_CONTRACT_OR_MINT_SECURITY');
 b.token_address='7'.repeat(43);
 const c=single('ASOF_EXECUTABLE_COSTED_QUOTE');
 c.evidence_available_at_utc='2026-10-15T00:04:00Z';
 const x=assessHistoricalPreflight({...base,evidence:[a,b,c]});
 assert.equal(x.source_proofs_accepted,0);
 assert.equal(x.source_proofs_rejected.length,3);
 assert.equal(x.missing_required_proofs.length,6);
});
