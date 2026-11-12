import test from 'node:test';
import assert from 'node:assert/strict';
import {runR09SourceReplay,readR09SourceCorpus} from './dot-r09-provisional-replay.mjs';
test('R09: 61 days of source-grade replay; 10 dated platform posts; no historically verified buy',()=>{
 const r=runR09SourceReplay(readR09SourceCorpus());
 assert.equal(r.days,61);
 assert.equal(r.source_count,10);
 assert.equal(r.original_historical_byte_verified_sources,0);
 assert.equal(r.qualified_historical_buy_advisories,0);
 assert.equal(r.individual_five_cloud_dots_executed_in_replay,false);
 assert.equal(r.actually_autonomously_discovered,false);
});
test('provisional symbols can be observed only on or after original platform post date',()=>{
 const r=runR09SourceReplay(readR09SourceCorpus());
 assert.equal(r.daily.find(d=>d.day_utc==='2024-10-08').provisional_symbols_visible.length,0);
 assert(r.daily.find(d=>d.day_utc==='2024-10-09').provisional_symbols_visible.includes('HORSEMEAT'));
 assert(!r.daily.find(d=>d.day_utc==='2024-10-09').provisional_symbols_visible.includes('MAU'));
 assert(r.daily.find(d=>d.day_utc==='2024-11-05').provisional_symbols_visible.includes('MAU'));
});
test('a contract mentioned in November is never backdated to September',()=>{
 const r=runR09SourceReplay(readR09SourceCorpus());
 const sep=r.daily.find(d=>d.day_utc==='2024-09-30');
 const nov=r.daily.find(d=>d.day_utc==='2024-11-05');
 assert.equal(sep.provisional_token_identifiers_visible.length,0);
 assert(nov.provisional_token_identifiers_visible.some(v=>v.includes('7icRizvozWEg4TFqt1D8T8prTzCbG5Um8fU8MDYkpump')));
 assert(r.provisional_distinct_token_mints.every(v=>v.provenance==='PLATFORM_DATE_ONLY_CONTRACT_NOT_ONCHAIN_VERIFIED'));
});
test('source timestamps or address manipulations fail closed',()=>{
 const c=readR09SourceCorpus();
 const altered=structuredClone(c);
 altered.sources[0].day_utc='2024-12-01';
 assert.throws(()=>runR09SourceReplay(altered),/SOURCE_INVALID_OR_RETROACTIVE/);
 const a=structuredClone(c);
 a.sources[0].id=a.sources[1].id;
 assert.throws(()=>runR09SourceReplay(a),/SOURCE_INVALID_OR_RETROACTIVE/);
 const b=structuredClone(c);
 b.sources[8].token_addresses[0].token='invalid';
 assert.throws(()=>runR09SourceReplay(b),/INVALID_TOKEN_ADDRESS/);
});
test('no post-hoc promotion of platform date to high-certainty market signal',()=>{
 const r=runR09SourceReplay(readR09SourceCorpus());
 assert.equal(r.calibrated_probability_available,false);
 assert(r.daily.every(d=>d.original_byte_verified_sources===0&&d.historically_verified_early_trades===0));
});
