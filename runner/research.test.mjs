import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,action,applyExits,autoBuyCandidate} from './core.mjs';
import {ROLES,simulate,evaluate,assess,ingest,identity} from './research.mjs';
const funded=()=>({...freshState(),cashUsdc:200,entriesEnabled:true,automaticPaperBuys:true});
const pending=()=>simulate({...funded(),entriesEnabled:false});
test('five simulated roles + independent fixture buy 50 once; multiple new coins',()=>{
 let s=simulate(funded());assert.equal(s.positions.length,1);assert.equal(s.positions[0].amountUsdc,50);assert.equal(s.cashUsdc,150);
 s=evaluate(s);assert.equal(s.positions.length,1);s=simulate(s);assert.equal(s.positions.length,2);assert.equal(s.cashUsdc,100);
 s=action(s,{type:'SELL',id:s.positions[0].id});s=evaluate(s);assert.equal(s.positions.length,1,'closed proposal never rebuys');
});
for(const vote of ['NO','VETO','ABSTAIN'])test(`${vote} blocks despite other YES votes`,()=>{
 let s=pending();s.research.candidates[0].votes[4].vote=vote;s.entriesEnabled=true;s=evaluate(s);assert.equal(s.positions.length,0);
});
for(const scenario of ['missing','stale','future','duplicate-source','missing-risk','failed-sell','counterevidence','risk-flag','external'])test(`${scenario} fails closed`,()=>{
 let s=pending(),c=s.research.candidates[0];
 if(scenario==='missing')c.votes.pop();
 if(scenario==='stale')c.votes[0].expires_at_utc=new Date(0).toISOString();
 if(scenario==='future')c.votes[0].observed_at_utc=new Date(Date.now()+60000).toISOString();
 if(scenario==='duplicate-source')c.evidence.forEach(e=>e.source_host='same.example');
 if(scenario==='missing-risk')c.risk=null;
 if(scenario==='failed-sell')c.risk.sellability='FAIL';
 if(scenario==='counterevidence')c.votes[0].counterevidence_ids=[c.evidence[1].evidence_id];
 if(scenario==='risk-flag')c.votes[0].risk_flags=['UNKNOWN'];
 if(scenario==='external')c.isDemo=false;
 s.entriesEnabled=true;s=evaluate(s);assert.equal(s.positions.length,0);
});
test('bot OFF and AUTO off block; limited budget cannot overspend',()=>{
 assert.equal(simulate({...funded(),entriesEnabled:false}).positions.length,0);
 assert.equal(simulate({...funded(),automaticPaperBuys:false}).positions.length,0);
 assert.equal(simulate({...funded(),cashUsdc:49}).positions.length,0);
 assert.equal(simulate({...funded(),maxExposure:49}).positions.length,0);
 assert.equal(simulate({...funded(),perPositionCap:49}).positions.length,0);
 let s=simulate({...funded(),maxPositions:1});s=simulate(s);assert.equal(s.positions.length,1);
});
test('trailing holds above +15%, persists high water and exits while bot OFF',()=>{
 let s=simulate({...funded(),defaultExitMode:'TRAILING'});s.entriesEnabled=false;
 let p=s.positions[0];p.priceUsd=p.entryPriceUsd*1.2;p.markAt=new Date().toISOString();s=applyExits(s);assert.equal(s.positions.length,1);
 s.positions[0].priceUsd*=3;s=applyExits(s);assert.equal(s.positions.length,1);
 s=JSON.parse(JSON.stringify(s));s.positions[0].priceUsd*=.7;s=applyExits(s);assert.equal(s.positions.length,0);assert(s.cashUsdc>200);
});
test('stale or invalid exit quote never fabricates sale; fresh recovery works',()=>{
 let s=simulate({...funded(),defaultExitMode:'TRAILING'});s.positions[0].priceUsd*=.1;s.positions[0].markAt='invalid';s=applyExits(s);assert.equal(s.positions.length,1);
 assert.match(s.positions[0].quoteStatus,/STALE/);assert.equal(action(s,{type:'SELL',id:s.positions[0].id}),s);
 s.positions[0].markAt=new Date().toISOString();s=applyExits(s);assert.equal(s.positions.length,0);
});
test('real token trailing requires executable quote; heuristics cannot auto-buy',()=>{
 let s=simulate({...funded(),defaultExitMode:'TRAILING'});s.positions[0].isDemo=false;s.positions[0].priceUsd*=.1;s=applyExits(s);assert.equal(s.positions.length,1);assert.match(s.positions[0].quoteStatus,/EXIT_UNAVAILABLE/);
 assert.equal(autoBuyCandidate(s),s);
});
test('strict event identity, role, replay, independent risk principal',()=>{
 const principal={id:'news',role:ROLES[0]},token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
 const e={schema:'candidate.v1',event_id:'e1',agent_id:'news',candidate_id:identity('base',token,pool),chain:'base',token_address:token,pool_address:pool,symbol:'X',paper_only:true,observed_at_utc:new Date().toISOString(),expires_at_utc:new Date(Date.now()+240000).toISOString()};
 let s=ingest(funded(),e,principal);assert.equal(ingest(s,e,principal),s);
 assert.throws(()=>ingest(s,{...e,symbol:'Y'},principal),/Konflikt/);
 assert.throws(()=>ingest(s,{...e,event_id:'e2',extra:true},principal),/Feld/);
 assert.throws(()=>ingest(s,{...e,event_id:'e2'}, {...principal,id:'other'}),/Absender/);
 assert.throws(()=>ingest(s,{schema:'risk_assessment.v1',event_id:'r',agent_id:'news',candidate_id:e.candidate_id,paper_only:true,observed_at_utc:e.observed_at_utc,expires_at_utc:e.expires_at_utc,contract:'PASS',liquidity:'PASS',sellability:'PASS',max_amount_usdc:50,reason:'Claim'},principal),/Risiko/);
});
