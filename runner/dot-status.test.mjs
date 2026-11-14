import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {buildDotStatus,DOT_ROLES} from './dot-status.mjs';

const now=Date.parse('2026-11-08T12:00:00Z');
const iso=ms=>new Date(ms).toISOString();
const scout=(received=now-60000,extra={})=>({
  event_id:'test-scout-001',received_at_utc:iso(received),
  actionable:false,historical_probe:false,delivery:'GITHUB_PULL',
  message:{schema:'research_notice.v1',producer:'Meme Scout – Forschungsradar',
    published_at_utc:iso(received-10000),expires_at_utc:iso(received+3600000),
    event_id:'test-scout-001',paper_only:true,actionable:false,
    kind:'STATUS',summary:'Kein geprüfter Kandidat'},...extra
});

test('five defined roles are shown; newest confirmed regular receipt uses local receive time',()=>{
  const r=scout();
  const state={researchInbox:{receipts:[r]},cashUsdc:1000,positions:[]};
  const before=JSON.stringify(state);
  const model=buildDotStatus(state.researchInbox,{enabled:true,now});
  assert.equal(model.status,'received');
  assert.equal(model.latest.role,'news_discovery');
  assert.equal(model.latest.received_at_utc,r.received_at_utc);
  assert.equal(model.latest.published_at_utc,r.message.published_at_utc);
  assert.equal(model.roles.length,5);
  assert.equal(model.roles.filter(x=>x.last_received_at!==null).length,1);
  assert.equal(model.roles.find(x=>x.id==='social_acceleration').last_received_at,null);
  assert.equal(JSON.stringify(state),before,'read-only view must not mutate portfolio or receipts');
});

test('most recently received role wins, even if its publication was older',()=>{
  const social={...scout(now-15000),message:{...scout().message,
    producer:'Sniper Social Research',schema:'research_role_snapshot.v1',
    published_at_utc:iso(now-25000),snapshot_id:'social-role-001'}};
  const inbox={receipts:[social,scout(now-35000)]};
  const model=buildDotStatus(inbox,{enabled:true,now});
  assert.equal(model.latest.role,'social_acceleration');
  assert.equal(model.latest.received_at_utc,social.received_at_utc);
  assert.equal(model.roles.find(r=>r.id==='social_acceleration').event_id,'social-role-001');
});

test('historical probe is not a regular Dot message',()=>{
  const historical={received_at_utc:iso(now-12000),historical_probe:true,actionable:false,
    message:{schema:'research_transport_probe.v1',producer:'Meme Scout – Forschungsradar'}};
  const model=buildDotStatus({receipts:[historical]},{enabled:true,now});
  assert.equal(model.status,'historical_only');
  assert.equal(model.latest,null);
  assert.equal(model.historical_received_at_utc,historical.received_at_utc);
  assert.ok(model.roles.every(r=>r.last_received_at===null));
});

test('expired or more than two hours old regular notices are displayed as stale',()=>{
  const expired=scout(now-60000);
  expired.message.expires_at_utc=iso(now-1000);
  assert.equal(buildDotStatus({receipts:[expired]},{enabled:true,now}).status,'stale');
  const old=scout(now-7200001);
  old.message.expires_at_utc=iso(now+1000);
  assert.equal(buildDotStatus({receipts:[old]},{enabled:true,now}).status,'stale');
});

test('disabled feed and errors do not falsely assert a live connection',()=>{
  const inbox={receipts:[scout()],lastError:'Forschungsquelle HTTP 404',lastCheckAt:iso(now-2000)};
  const off=buildDotStatus(inbox,{enabled:false,now});
  assert.equal(off.status,'disabled');
  assert.ok(off.latest,'saved receipt remains visible even while polling disabled');
  const failed=buildDotStatus(inbox,{enabled:true,now});
  assert.equal(failed.status,'error');
  assert.equal(failed.last_error,'Forschungsquelle HTTP 404');
  assert.equal(failed.last_check_at_utc,iso(now-2000));
});

test('unknown senders, actionable messages, synthetic receipts and invalid dates are ignored',()=>{
  const unknown=scout(now-1000);unknown.message.producer='Unknown Researcher';
  const actionable=scout(now-1000);actionable.message.actionable=true;
  const synthetic=scout(now-1000);synthetic.delivery='SIMULATION';
  const future=scout(now+600000);
  const malformed=scout(now-1000);malformed.received_at_utc='invalid';
  const model=buildDotStatus({receipts:[unknown,actionable,synthetic,future,malformed]},{enabled:true,now});
  assert.equal(model.status,'no_receipt');
  assert.equal(model.latest,null);
});

test('empty and malformed persisted state are handled safely',()=>{
  assert.equal(buildDotStatus(null,{enabled:true,now}).status,'no_receipt');
  assert.equal(buildDotStatus({receipts:{}},{enabled:true,now}).roles.length,5);
  assert.equal(new Set(DOT_ROLES.map(x=>x.producer)).size,5);
});

test('dashboard and server wire only the read-only display; inline JS is syntactically valid',()=>{
  const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
  const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
  assert.match(html,/id="dotWidget"/);
  assert.match(html,/id="dotPublished"/);
  assert.match(html,/id="dotReceived"/);
  assert.match(html,/id="dotRoleDetails"/);
  assert.match(html,/renderDotStatus\(lastHealth\?\.dotStatus\)/);
  assert.match(html,/function dotRunnerOffline\(\)/);
  assert.match(server,/dotStatus:buildDotStatus\(state\.researchInbox/);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1,'expect a single inline application script');
  assert.doesNotThrow(()=>new Script(scripts[0][1],{filename:'dashboard-inline.js'}));
});
