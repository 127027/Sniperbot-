import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReceiver,receiveNotice,readRemote,validateMessage,PROBE_URL} from './research-inbox.mjs';
const now=Date.parse('2026-11-07T20:00:00Z');
const notice=(extra={})=>({schema:'research_notice.v1',event_id:'scout-test-0001',producer:'Meme Scout – Forschungsradar',published_at_utc:new Date(now).toISOString(),expires_at_utc:new Date(now+3600000).toISOString(),paper_only:true,actionable:false,kind:'STATUS',summary:'Kein geprüfter Kandidat',...extra});
const initial=()=>({cashEur:50,positions:[],botOn:false});
const probe=JSON.parse(readFileSync(new URL('../research/connectivity/meme-scout-scheduled-probe-20261107.json',import.meta.url),'utf8'));
test('isolated recipients store same message without portfolio action',()=>{
 const a=initial(),b={...initial(),cashEur:200},c={...initial(),cashEur:0};
 const results=[a,b,c].map(s=>receiveNotice(s,notice(),{now}));
 assert.deepEqual(results.map(s=>s.cashEur),[50,200,0]);
 for(const s of results){assert.equal(s.positions.length,0);assert.equal(s.botOn,false);assert.equal(s.researchInbox.receipts[0].event_id,'scout-test-0001');}
 results[0].researchInbox.receipts.push({});assert.equal(results[1].researchInbox.receipts.length,1);
});
test('duplicate across persisted restart is idempotent; changed payload conflicts',()=>{
 const saved=JSON.parse(JSON.stringify(receiveNotice(initial(),notice(),{now})));
 assert.equal(receiveNotice(saved,notice(),{now}),saved);
 assert.throws(()=>receiveNotice(saved,notice({summary:'changed'}),{now}),/anderem Inhalt/);
});
test('invalid, expired, actionable, extra fields and future notices rejected',()=>{
 for(const bad of [notice({actionable:true}),notice({paper_only:false}),notice({order:'BUY'}),notice({producer:'other'}),notice({expires_at_utc:new Date(now).toISOString()}),notice({published_at_utc:new Date(now+60000).toISOString()}),notice({expires_at_utc:new Date(now+7200001).toISOString()}),notice({summary:'x'.repeat(2001)})])assert.throws(()=>validateMessage(bad,now));
 const s=receiveNotice(initial(),notice(),{now});
 assert.throws(()=>receiveNotice(s,notice({event_id:'other-event-id'}),{now}),/Reihenfolge/);
});
test('historical probe is explicitly labelled and pinned, not fresh signal',()=>{
 const s=receiveNotice(initial(),probe,{now,probe:true});
 assert.equal(s.researchInbox.receipts[0].historical_probe,true);
 assert.equal(s.researchInbox.receipts[0].source_url,PROBE_URL);
 assert.equal(s.cashEur,50);assert.throws(()=>receiveNotice(initial(),{...probe,message:'BUY'},{now,probe:true}));
});
test('remote reader rejects oversized, HTTP failure and malformed JSON',async()=>{
 await assert.rejects(readRemote(PROBE_URL,async()=>new Response('x'.repeat(16385))),/groß/);
 await assert.rejects(readRemote(PROBE_URL,async()=>new Response('',{status:403})),/403/);
 await assert.rejects(readRemote(PROBE_URL,async()=>new Response('bad')));
});
test('poll failure preserves receipts and portfolio; recovery receives feed',async()=>{
 let state=initial(),offline=true;
 const poll=createReceiver({getState:()=>state,commit:s=>{state=s},now:()=>now,fetcher:async url=>{if(offline)throw Error('offline');return new Response(JSON.stringify(url===PROBE_URL?probe:notice()));}});
 await poll();assert.equal(state.cashEur,50);assert.equal(state.researchInbox.lastError,'offline');
 offline=false;await poll();assert.equal(state.researchInbox.receipts.length,2);assert.equal(state.researchInbox.lastError,null);
 offline=true;await poll();assert.equal(state.researchInbox.receipts.length,2);assert.equal(state.positions.length,0);
});
