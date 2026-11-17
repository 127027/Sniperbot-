import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublishedFeatureManifest,compare60DayManifest} from './source-manifest-audit.mjs';
const hash='a'.repeat(64),newHash='b'.repeat(64);
const dates=Array.from({length:60},(_,i)=>new Date(Date.UTC(2026,8,18+i)).toISOString().slice(0,10));
const rows=(n=43)=>dates.map((d,i)=>[d,i>=6&&i<6+n?'10':'',i>=6&&i<6+n?hash:''].join(','));
const archive=['day_utc,minute_asof_feature_rows_verified,minute_feature_sha256',...rows()].join('\n');
const readme=(extra=false)=>[
 ...dates.slice(6,49).map(d=>'| features | data/features/'+d+'.parquet | 10 | 400 | '+hash+' |'),
 ...(extra?['| features | data/features/2026-11-06.parquet | 20 | 800 | '+newHash+' |']:[])
].join('\n');
test('reconciles archived 43 days, 17 manifest gaps, no hypothetical PnL',()=>{
 const a=compare60DayManifest(readme(),archive);
 assert.equal(a.archived_verified_matching_latest,43);
 assert.equal(a.no_minute_source_manifest_days.length,17);
 assert.equal(a.newly_listed_unverified_days.length,0);
 assert.equal(a.verified_60day_gpt_dex_pnl_test_usdc,null);
});
test('new manifest date remains UNVERIFIED and does not imply a trade',()=>{
 const a=compare60DayManifest(readme(true),archive);
 assert.deepEqual(a.newly_listed_unverified_days,['2026-11-06']);
 assert.equal(a.archived_verified_matching_latest,43);
 assert.equal(a.historical_bidirectional_dex_fills_proven,false);
});
test('changed source hash is flagged rather than silently reverified',()=>{
 const changed=readme().replace('data/features/2026-10-15.parquet | 10 | 400 | '+hash,
 'data/features/2026-10-15.parquet | 10 | 400 | '+newHash);
 const a=compare60DayManifest(changed,archive);
 assert.deepEqual(a.archived_source_changed_or_removed_days,['2026-10-15']);
});
test('duplicate manifest file is invalid and matrix must have all days',()=>{
 assert.throws(()=>parsePublishedFeatureManifest(readme()+'\n'+readme().split('\n')[0]),/DUPLICATE/);
 assert.throws(()=>compare60DayManifest(readme(),archive.split('\n').slice(0,-1).join('\n')),/NOT_60_ARCHIVED_DAYS/);
});
test('do not interpret a coin summary as a features manifest',()=>{
 assert.throws(()=>parsePublishedFeatureManifest('launches | data/launches/2026-10-15.parquet | 10 | 400 | '+hash),/NO_FEATURE_FILES/);
});
