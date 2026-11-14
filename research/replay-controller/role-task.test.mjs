import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,initialPortfolio,frame} from './engine.mjs';
import {ephemeralRoleTask} from './role-task.mjs';
function validFrame(){
 return frame({schema:'isolated_replay.v1',data_class:'HISTORICAL',
  ticks:['2023-03-14T23:59:59Z'],events:[]},0,initialPortfolio());
}
test('five roles receive exactly the identical current public frame',()=>{
 const f=validFrame();
 for(const role of ROLES){
  const t=ephemeralRoleTask(role,f);
  assert.equal(t.role,role);
  assert.deepEqual(t.frame,f);
  assert.equal(t.output_contract.input_hash,f.input_hash);
  assert.equal(t.isolation_attested,false);
  assert.equal(t.does_not_execute_a_trade,true);
  assert.ok(!t.instructions.includes('PEPE'));
 }
});
test('only QA is invited to propose hypothetical order actions',()=>{
 const f=validFrame();
 for(const role of ROLES){
  const t=ephemeralRoleTask(role,f);
  if(role==='qa')assert.ok(t.output_contract.orders.includes('array'));
  else assert.equal(t.output_contract.orders,'[] ONLY');
 }
});
test('role tasks refuse frames with mutated input or later source visibility',()=>{
 const f=validFrame();
 f.portfolio.cash=999999;
 assert.throws(()=>ephemeralRoleTask('scout',f),/PUBLIC_FRAME_TAMPERED/);
 const original=validFrame();
 const injected=structuredClone(original);
 injected.events=[{available_at:'2023-03-15T23:59:59Z'}];
 // The same canonical frame hash should fail if a future event is manually inserted.
 assert.throws(()=>ephemeralRoleTask('social',injected),/PUBLIC_FRAME_TAMPERED/);
});
test('no invented role and no claim that prompting alone erases context',()=>{
 const f=validFrame();
 assert.throws(()=>ephemeralRoleTask('external-agent',f),/UNKNOWN_ROLE/);
 assert.equal(ephemeralRoleTask('qa',f).context_requirement,
  'NEW_EMPTY_MEMORYLESS_PROCESS_NOT_A_PROMPT_ONLY_GUARANTEE');
});
