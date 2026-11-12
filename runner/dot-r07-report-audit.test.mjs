import test from 'node:test';
import assert from 'node:assert/strict';
import {validR07CandidateId,auditR07Role,summarizeR07Reports,R07_ROLES} from './dot-r07-report-audit.mjs';
const base=role=>({schema:'research_historical_r07_role.v1',role,state:'PENDING',
 period:{start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-11-09T23:59:59Z',days:61},
 paper_only:true,actionable:false,daily_findings:[],first_discovers:[],qualified_paper_buy_advisories:[]});
const evm='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40),pair='base:'+evm+':'+pool;
test('live-safe five placeholders are PENDING, never a proved historical result',()=>{
 const report=Object.fromEntries(R07_ROLES.map(role=>[role,base(role)]));
 const r=summarizeR07Reports(report);assert.equal(r.roles.length,5);
 assert(r.roles.every(x=>x.schema_valid));
 assert.equal(r.all_five_completed,false);
 assert.equal(r.certified_historical_predictive_performance,false);
 assert.equal(r.executed_paper_buys,0);
});
test('candidate identification requires canonical exact chain/token/pool, not symbol',()=>{
 assert.equal(validR07CandidateId(pair),true);
 assert.equal(validR07CandidateId('base:GOAT:MOODENG'),false);
 assert.equal(validR07CandidateId(pair.toUpperCase()),false);
 assert.equal(validR07CandidateId('solana:'+('3'.repeat(40))+':'+('4'.repeat(40))),true);
});
test('later captured sources cannot be presented as earlier day evidence',()=>{
 const x=base('news_discovery');x.state='COMPLETED';
 x.daily_findings=[{virtual_day_utc:'2024-10-10',
 source_urls_with_capture_timestamps:[{url:'https://example.com/news',capture_at_utc:'2024-10-11T01:00:00Z'}]}];
 const a=auditR07Role(x,'news_discovery');
 assert(a.errors.includes('AFTER_DAY_OR_UNKNOWN_SOURCE_CAPTURE'));
 assert.equal(a.completed_and_schema_valid,false);
});
test('future virtual dates, duplicate days and unsafe claims fail closed',()=>{
 const x=base('opportunity_qa');x.state='COMPLETED';
 x.daily_findings=[{virtual_day_utc:'2024-10-10'},{virtual_day_utc:'2024-10-10'},{virtual_day_utc:'2024-11-10'}];
 x.qualified_paper_buy_advisories=[{candidate_id:pair,virtual_day_utc:'2024-10-17',signed_order:true}];
 const a=auditR07Role(x,'opportunity_qa');
 for(const reason of ['DUPLICATE_VIRTUAL_DAY','OUTSIDE_VIRTUAL_WINDOW','RESEARCH_MUST_NOT_EXECUTE'])
   assert(a.errors.includes(reason));
});
test('research with a candidate never automatically becomes a buy or signed order',()=>{
 const reports=Object.fromEntries(R07_ROLES.map(role=>[role,{...base(role),state:'COMPLETED',
  first_discovers:[{candidate_id:pair,first_valid_day_utc:'2024-10-17'}]}]));
 const x=summarizeR07Reports(reports);
 assert.equal(x.all_five_completed,true);
 assert.equal(x.distinct_identified_research_candidates,1);
 assert.equal(x.certified_historical_predictive_performance,false);
 assert.equal(x.executed_paper_buys,0);
});
