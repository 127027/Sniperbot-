import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildNeutralPoolRegistry} from '../src/v19-neutral-pool-registry.mjs';

const at='2026-10-12T09:35:00.000Z',pool='0x'+'a'.repeat(40);
const token='0x'+'b'.repeat(40);
const row=(time='2026-10-12T09:34:00.000Z',contract=token)=>({
 source_class:'ORIGINAL_CAPTURE',provenance:'CONTEMPORANEOUS_RECORD',
 observed_at_utc:time,archived_at_utc:time,available_at_utc:time,
 chain:'base',pool,contract,source_path:'research/feeds/fixture.json'
});
test('deduplicates genuine observations and stores earliest previously available source time',()=>{
 const r=buildNeutralPoolRegistry({asOfUtc:at,observations:[
  row('2026-10-12T09:34:00.000Z'),
  row('2026-10-12T09:30:00.000Z')]});
 assert.equal(r.counts.pools,1);
 assert.equal(r.entries[0].observations,2);
 assert.equal(r.entries[0].first_known_at_utc,'2026-10-12T09:30:00.000Z');
 assert.equal(r.entries[0].trade_authorized,false);
 assert.equal(r.counts.full_contracts,1);
 assert.equal(r.coverage_proven_complete,false);
});
test('records DATA_GAP without dropping pool and conflicts without treating identity as verified',()=>{
 const noContract=row();delete noContract.contract;
 const r=buildNeutralPoolRegistry({asOfUtc:at,observations:[
  noContract,row('2026-10-12T09:31:00.000Z',token),
  row('2026-10-12T09:32:00.000Z','0x'+'c'.repeat(40))]});
 assert.equal(r.counts.pools,1);
 assert.equal(r.counts.identity_conflicts,1);
 assert.equal(r.counts.full_contracts,0);
 assert.equal(r.entries[0].identity_status,'IDENTITY_CONFLICT');
 assert.equal(r.entries[0].identity_conflicts.length,2);
});
test('forbids all winner labels even if they declare themselves as prior captures',()=>{
 const r=buildNeutralPoolRegistry({asOfUtc:at,observations:[
  {...row(),reported_gain_pct:5000},
  {...row(),future_winner_label:true},
  {...row(),source_class:'POST_EVENT_ORACLE'},
  {...row(),observed_at_utc:'2026-10-12T10:00:00.000Z',archived_at_utc:'2026-10-12T10:00:00.000Z',available_at_utc:'2026-10-12T10:00:00.000Z'},
  row()
 ]});
 assert.equal(r.counts.pools,1);
 assert.equal(r.counts.rejected,4);
 assert.equal(r.winners_list_or_oracle_used,false);
});
test('the 65 Excel entries are evaluation-only; none is permitted to seed discovery',async()=>{
 const archive=JSON.parse(await readFile(new URL(
  '../research/evaluation/2026-10-12/v19-winner-reference-identity-status.json',
  import.meta.url),'utf8'));
 assert.equal(archive.entries.length,65);
 assert.equal(archive.statistics.pool_links,8);
 assert.equal(archive.statistics.name_only,57);
 assert.equal(archive.source_class,'POST_EVENT_ORACLE');
 const observations=archive.entries.map(r=>({...r,source_class:'POST_EVENT_ORACLE'}));
 const evaluated=buildNeutralPoolRegistry({asOfUtc:at,observations});
 assert.equal(evaluated.counts.pools,0);
 assert.equal(evaluated.counts.rejected,65);
});
