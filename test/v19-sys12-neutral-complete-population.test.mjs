import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {makeNeutralEvaluationPopulation,evaluateLabeledPopulation}
 from '../src/v19-neutral-evaluation-population.mjs';
const at='2026-11-22T20:00:00Z',obs='2026-11-22T17:00:00Z';
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
function fixture(count=4){
 let mem=emptyMarketMemory();
 for(let i=0;i<count;i++){
  mem=mergeMemory(mem,{candidates:[{chain:'base',pool:addr(i+1),contract:addr(i+101),
   observed_at_utc:obs,symbol:'SAME',pool_created_at_utc:'2026-11-21T00:00:00Z'}],
   chain:'base',page:i+1,provider:'GECKOTERMINAL',fetchStatus:'OK',
   sourcePath:'research/feeds/2026-11-22/TEST'+i+'.json',
   sourceCapturedAtUtc:obs,sourceSha256:'a'.repeat(64)}).memory;
 }
 return mem;
}
test('SYS-12: growing real pool memory is included without a winner-only denominator',async()=>{
 const real=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
 const pop=makeNeutralEvaluationPopulation({memory:real,asOfUtc:new Date().toISOString()});
 const sourcePoolCount=Object.keys(real.pools).length;
 assert.ok(sourcePoolCount>=409,'historical baseline lost');
 assert.equal(pop.population_size,sourcePoolCount);
 assert.equal(pop.outcomes_not_evaluated,sourcePoolCount);
 assert.equal(pop.evaluable_outcomes_with_independent_labels,0);
 assert.equal(pop.false_positive_rate,null);
 assert.equal(pop.recall,null);
 assert.equal(pop.precision,null);
 assert.equal(pop.coverage_proven_complete,undefined);
 assert.equal(pop.discovered_pool_universe_complete,false);
 assert.equal(pop.winners_list_used_for_discovery,false);
 assert.equal(Object.values(pop.by_chain).reduce((a,b)=>a+b,0),sourcePoolCount);
 const source=await readFile('research/state/market-memory.json','utf8');
 assert.equal(JSON.stringify(real),JSON.stringify(JSON.parse(source)));
 assert.ok(pop.entries.some(x=>x.pool_kind==='UNISWAP_V4_POOL_ID'));
 assert.ok(pop.entries.every(x=>x.outcome_label==='NOT_EVALUATED'
  &&x.paper_order_receipt===null));
});
test('SYS-12: 65 post-event winner references cannot contaminate the input and are not decision labels',async()=>{
 const register=JSON.parse(await readFile(
  'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json','utf8'));
 assert.equal(register.entries.length,65);
 const memory=fixture();
 const population=makeNeutralEvaluationPopulation({memory,asOfUtc:at});
 assert.equal(population.population_size,4);
 assert.equal(population.confirmed_positive_outcomes,0);
 assert.equal(population.outcomes_not_evaluated,4);
 assert.throws(()=>evaluateLabeledPopulation({population,asOfUtc:at,
   labels:[{legacy_pool_key:population.entries[0].legacy_pool_key,
    label:'POSITIVE',source_class:'POST_EVENT_ORACLE',
    evidence_authenticated:true,label_available_at_utc:at,
    evidence_path:'research/evaluation/2026-10-12/winner.json'}]}),
 /UNVERIFIED_OR_DUPLICATE_OUTCOME_LABEL/);
});
test('SYS-12: unresolved identity remains in population, not a fake market loser',()=>{
 let mem=emptyMarketMemory();
 mem=mergeMemory(mem,{sourcePath:'research/feeds/no-contract.json',sourceCapturedAtUtc:obs,
   candidates:[{chain:'base',pool:addr(1001),contract:null,observed_at_utc:obs}]}).memory;
 const p=makeNeutralEvaluationPopulation({memory:mem,asOfUtc:at});
 assert.equal(p.population_size,1);
 assert.equal(p.not_eligible_due_to_identity,1);
 assert.equal(p.entries[0].failure_reason,'NO_CONTRACT');
 assert.equal(p.entries[0].confirmed_negative_outcome,null);
 assert.equal(p.entries[0].outcome_label,'NOT_EVALUATED');
});
test('SYS-12: future source reference and future arrival never influence prior as-of denominator',()=>{
 const mem=fixture(2);
 const pop=makeNeutralEvaluationPopulation({memory:mem,asOfUtc:'2026-11-22T16:00:00Z'});
 assert.equal(pop.population_size,0);
 assert.equal(pop.asof_future_refs_excluded,2);
 assert.equal(pop.recall,null);
});
test('SYS-12: recall and false-positive rate stay null until ALL independent outcomes and decisions confirmed',()=>{
 const p=makeNeutralEvaluationPopulation({memory:fixture(),asOfUtc:at});
 const keys=p.entries.map(x=>x.legacy_pool_key);
 const decisions=keys.map((legacy_pool_key,i)=>({legacy_pool_key,
   signal:i%2?'NO_SIGNAL':'POSITIVE_SIGNAL',decision_verified:true,
   available_at_utc:'2026-11-22T18:00:00Z',
   source_path:'research/decisions/verified-'+i+'.json'}));
 const outcomes=['POSITIVE','NEGATIVE','NEGATIVE','POSITIVE'];
 const labels=keys.map((legacy_pool_key,i)=>({legacy_pool_key,label:outcomes[i],
   label_available_at_utc:'2026-11-22T19:00:00Z',evidence_authenticated:true,
   evidence_path:'research/verified-outcomes/'+i+'.json'}));
 const incomplete=evaluateLabeledPopulation({population:p,
   labels:labels.slice(0,3),decisions,asOfUtc:at});
 assert.equal(incomplete.not_evaluated_count,1);
 assert.equal(incomplete.recall,null);
 assert.equal(incomplete.false_positive_rate,null);
 assert.equal(incomplete.confusion.TP,1);
 assert.equal(incomplete.confusion.FP,1);
 assert.equal(incomplete.confusion.TN,1);
 const complete=evaluateLabeledPopulation({population:p,labels,decisions,asOfUtc:at});
 assert.equal(complete.metrics_are_population_complete,true);
 assert.deepEqual(complete.confusion,{TP:1,FP:1,TN:1,FN:1});
 assert.equal(complete.recall,0.5);
 assert.equal(complete.false_positive_rate,0.5);
 assert.equal(complete.precision,0.5);
 assert.equal(complete.not_evaluated_count,0);
 assert.equal(complete.orders_authorized,0);
});
test('SYS-12: never accept post-event decisions or unverified/duplicated labels as contemporaneous',()=>{
 const pop=makeNeutralEvaluationPopulation({memory:fixture(1),asOfUtc:at});
 const id=pop.entries[0].legacy_pool_key;
 const label={legacy_pool_key:id,label:'POSITIVE',
   label_available_at_utc:'2026-11-22T18:00:00Z',
   evidence_authenticated:true,evidence_path:'research/outcomes/real.json'};
 const decision={legacy_pool_key:id,signal:'POSITIVE_SIGNAL',decision_verified:true,
   available_at_utc:'2026-11-22T19:00:00Z',
   source_path:'research/decisions/after-the-fact.json'};
 assert.throws(()=>evaluateLabeledPopulation({population:pop,
   labels:[label],decisions:[decision],asOfUtc:at}),
 /LOOKAHEAD_DECISION_AFTER_OUTCOME_LABEL/);
 assert.throws(()=>evaluateLabeledPopulation({population:pop,
   labels:[label,label],decisions:[],asOfUtc:at}),
 /UNVERIFIED_OR_DUPLICATE_OUTCOME_LABEL/);
 assert.throws(()=>evaluateLabeledPopulation({population:pop,
   labels:[{...label,evidence_authenticated:false}],decisions:[],asOfUtc:at}),
 /UNVERIFIED_OR_DUPLICATE_OUTCOME_LABEL/);
});
test('SYS-12: production runner only builds neutral population from existing memory and cannot publish orders',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/makeNeutralEvaluationPopulation\(\{/);
 assert.match(runner,/memory,asOfUtc:now\(\)/);
 assert.match(runner,/neutral-evaluation-population\.json/);
 assert.match(runner,/neutral_population_pool_count:neutralPopulation\.population_size/);
 assert.doesNotMatch(runner,/writeFile\('signals\/orders/);
});
