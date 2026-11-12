import test from 'node:test';
import assert from 'node:assert/strict';
import {marketFeedFreshness,classifyResearchLead,planResearchRound} from './research-triage.mjs';
const now='2026-11-12T20:00:00Z';
const mint='2FprjEk4MTSY9CxpKuENbGDdy69R15GHhtHpG5Durdbq';
const token=id=>({kind:'TOKEN',chain:'solana',token_address:mint,pool_address:id,
 observed_at_utc:'2026-11-12T19:50:00Z',source_urls:['https://example.org/'+id],pool_identity_verified:true});
const narrative=id=>({kind:'NARRATIVE',event_id:id,observed_at_utc:'2026-11-12T19:55:00Z',
 source_urls:['https://example.org/original/'+id],original_event_verified:true});
test('stale 40h old collector is not a fresh observation',()=>{
 const s=marketFeedFreshness('2026-11-11T02:44:43Z',now);
 assert.equal(s.fresh,false);assert.equal(s.reason,'STALE');
 assert.equal(marketFeedFreshness('2026-11-12T19:40:00Z',now).fresh,true);
 assert.equal(marketFeedFreshness('2026-11-12T20:00:01Z',now).reason,'FUTURE_TIMESTAMP');
});
test('new narratives survive missing mint or pool; older watchlist is recheck only',()=>{
 const old=Array.from({length:100},(_,i)=>({candidate_id:'old'+i,priority:'NORMAL',next_check_not_before_utc:'2026-11-11T00:00:00Z'}));
 const r=planResearchRound({newLeads:[narrative('meme-early'),token('pool-A')],dueWatchlist:old,
  marketSnapshotPublishedAt:'2026-11-11T02:44:43Z',now});
 assert.equal(r.feed.fresh,false);assert.equal(r.new_candidates.length,2);
 assert(r.new_candidates.some(c=>c.key==='n:meme-early'&&c.stage==='NARRATIVE_WATCH'));
 assert(r.new_candidates.some(c=>c.kind==='TOKEN'&&c.stage==='TOKEN_IDENTIFIED'));
 assert.equal(r.old_watchlist_rechecks.length,5);
 assert(r.old_watchlist_rechecks.every(c=>c.reason==='DUE_RECHECK_NOT_A_FRESH_SIGNAL'));
 assert(r.new_candidates.every(c=>c.actionable===false));
});
test('narrative allocation stays visible even under many tokens',()=>{
 const v=[narrative('one'),narrative('two'),...Array.from({length:20},(_,i)=>token('pool'+i))];
 const r=planResearchRound({newLeads:v,now});
 assert.equal(r.new_candidates.length,5);
 assert.equal(r.new_candidates.filter(c=>c.kind==='NARRATIVE').length,2);
 assert.equal(r.new_candidates.filter(c=>c.kind==='TOKEN').length,3);
 assert.equal(r.dropped_fresh_leads_due_to_limit,17);
});
test('duplicate old and fresh leads cannot crowd the queue',()=>{
 const v=[narrative('a'),{...narrative('a'),observed_at_utc:'2026-11-12T19:59:00Z'},narrative('b')];
 const r=planResearchRound({newLeads:v,now});
 assert.equal(r.new_candidates.length,2);
 assert.equal(r.new_candidates.find(x=>x.key==='n:a').observed_at_utc,'2026-11-12T19:55:00Z');
});
test('historically stale or future leads are rejected with a reason',()=>{
 const v=[{...narrative('past'),observed_at_utc:'2026-11-10T19:00:00Z'},
 {...narrative('future'),observed_at_utc:'2026-11-12T20:01:00Z'},
 {...narrative('no-url'),source_urls:[]}];
 const r=planResearchRound({newLeads:v,now});
 assert.equal(r.new_candidates.length,0);assert.equal(r.source_rejection_count,3);
});
test('risk gates and 90-second sell quote never infer an executable order',()=>{
 const x={pool_identity_verified:true,security_verified:true,sell_quote_verified:true};
 assert.equal(classifyResearchLead({...x,quote_observed_at_utc:'2026-11-12T19:57:00Z'},now),'RISK_REVIEW');
 assert.equal(classifyResearchLead({...x,quote_observed_at_utc:'2026-11-12T19:59:30Z'},now),'BOT_REVIEW_CANDIDATE_RESEARCH_ONLY');
 assert.equal(classifyResearchLead({...x,quote_observed_at_utc:'2026-11-12T20:01:00Z'},now),'RISK_REVIEW');
 assert.equal(classifyResearchLead({original_event_verified:true},now),'NARRATIVE_WATCH');
 assert.equal(classifyResearchLead({pool_identity_verified:true},now),'TOKEN_IDENTIFIED');
});
test('unknown candidate keys fail closed without contaminating existing statuses',()=>{
 const r=planResearchRound({newLeads:[{kind:'TOKEN',token_address:'fake',observed_at_utc:now,
   source_urls:['https://example.org/ok']}],now,maxNew:5});
 assert.equal(r.new_candidates.length,0);assert.equal(r.source_rejection_count,1);
 assert.throws(()=>planResearchRound({newLeads:[],now,maxNew:-1}),/INVALID_RESEARCH_ROUND/);
});
