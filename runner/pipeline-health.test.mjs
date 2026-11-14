import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePaperPipeline} from './pipeline-health.mjs';
const now=Date.parse('2026-11-11T15:20:00Z');
const report=role=>({role,status:'NO_VERIFIED_CANDIDATE',
 published_at_utc:new Date(now-50000).toISOString(),
 stale:false,candidate_count:0});
const research={checked_at_utc:new Date(now).toISOString(),
 roles:['news_discovery','social_acceleration','onchain_liquidity',
  'contract_security','opportunity_qa'].map(report)};
test('five real research snapshots prove actual published data but never imply signed orders',()=>{
 const x=summarizePaperPipeline({research,readEnabled:true,now});
 assert.equal(x.stages.dot_research.fresh_roles,5);
 assert.equal(x.stages.dot_research.status,'RESEARCH_DATA_RECEIVED');
 assert.equal(x.stages.signed_order_publisher.status,'NO_TRUSTED_SIGNING_KEY');
 assert.equal(x.stages.paper_execution.executed_paper_orders,0);
 assert.equal(x.real_dot_research_to_order_execution_proven,false);
 assert.equal(x.verified_dot_publisher_connected,false);
 assert(x.stages.dot_research.roles.every(r=>!r.order_authorized));
});
test('signed local CI orders show as local and never masquerade as real Dot fills',()=>{
 const x=summarizePaperPipeline({research,readEnabled:true,now,
 publishers:[{scope:'agent_execution',public_key_pem:'PUBLIC_TEST'}],
 receipts:[{status:'PAPER_FILLED',command_source:'SIGNED_LOCAL_ADAPTER',
   received_at_utc:new Date(now).toISOString()}],
 positions:[{id:'pos1'}],topology:'MASTER'});
 assert.equal(x.stages.signed_order_publisher.status,'SIGNED_COMMANDS_RECEIVED');
 assert.equal(x.stages.paper_execution.signed_local_receipts,1);
 assert.equal(x.stages.paper_execution.signed_github_courier_receipts,0);
 assert.equal(x.stages.paper_execution.open_paper_positions,1);
 assert.equal(x.real_dot_research_to_order_execution_proven,false);
});
test('public courier signed orders are real Paper transport proofs, NOT proof of a Cloud Dot identity',()=>{
 const x=summarizePaperPipeline({research,readEnabled:true,now,
 courier:{status:'FETCHED_SIGNED_COURIER',checked_at_utc:new Date(now).toISOString(),received_last:1},
 publishers:[{scope:'agent_execution',public_key_pem:'PUBLIC_TEST'}],
 receipts:[{status:'PAPER_FILLED',command_source:'GITHUB_SIGNED_COURIER'}]});
 assert.equal(x.stages.public_github_courier.status,'FETCHED_SIGNED_COURIER');
 assert.equal(x.stages.paper_execution.signed_github_courier_receipts,1);
 assert.equal(x.github_signed_courier_message_received,true);
 assert.equal(x.real_dot_research_to_order_execution_proven,false);
});
test('offline, stale, missing and unavailable Dot snapshots do not appear online',()=>{
 const old={...research,roles:research.roles.map(r=>({...r,published_at_utc:new Date(now-8*3600000).toISOString()}))};
 const stale=summarizePaperPipeline({research:old,readEnabled:true,now});
 assert.equal(stale.stages.dot_research.fresh_roles,0);
 assert(stale.stages.dot_research.roles.every(r=>r.status==='STALE'));
 const offline=summarizePaperPipeline({research,readEnabled:true,offline:true,now});
 assert.equal(offline.stages.dot_research.status,'DISABLED');
 const disabled=summarizePaperPipeline({research,readEnabled:false,now});
 assert.equal(disabled.stages.dot_research.fresh_roles,0);
 const unavailable=summarizePaperPipeline({research:{roles:[{...report('news_discovery'),status:'UNAVAILABLE'}]},
  readEnabled:true,now});
 assert.equal(unavailable.stages.dot_research.roles[0].status,'SOURCE_UNAVAILABLE');
});
