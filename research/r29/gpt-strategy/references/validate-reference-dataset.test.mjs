import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
 validateUserSuppliedMemecoinReferences,blockPosthocReferencesInDecisionContext
} from './validate-reference-dataset.mjs';
const folder=path.dirname(fileURLToPath(import.meta.url));
const read=async()=>JSON.parse(await readFile(path.join(folder,
 'USER_SUPPLIED_40_MEMECOIN_WINNERS_20261117.json'),'utf8'));
test('40 entries in their original three evidence tiers, ZERO verified trade claims',async()=>{
 const d=await read(),result=validateUserSuppliedMemecoinReferences(d);
 assert.equal(result.rows,40);
 assert.deepEqual(result.by_reported_evidence_type,{
  REPORTED_WALLET_TRANSACTIONS:12,
  REPORTED_MARKET_PRICE_MOVE:16,
  REPORTED_DAILY_PRICE_MOVE:12});
 assert.equal(result.unique_onchain_tokens_verified,0);
 assert.equal(result.unresolved_alias_groups,1);
 assert(result.reference_items_extending_beyond_holdout>0);
 assert(d.cases.every(x=>x.reported_profit_not_verified&&x.realisable_pnl_not_proven));
 assert.equal(result.data_usable_for_historical_gpt_decisions,false);
});
test('do not mistake the same symbol/alias for independent contract identity',async()=>{
 const d=await read();
 assert(d.cases.some(c=>c.case_id==='wallet_09'&&c.name==='Dacity Coin'));
 assert(d.cases.some(c=>c.case_id==='market_16'&&c.name==='AudaCity'));
 assert.equal(d.counts.unique_onchain_tokens_verified,0);
});
test('strict all-or-none posthoc blindtest guard rejects after-the-fact winner dataset',async()=>{
 const d=await read();
 assert.throws(()=>blockPosthocReferencesInDecisionContext(d),/LEAKAGE/);
 assert.throws(()=>blockPosthocReferencesInDecisionContext({
  file:'USER_SUPPLIED_40_MEMECOIN_WINNERS_20261117.json'
 }),/LEAKAGE/);
 assert.deepEqual(blockPosthocReferencesInDecisionContext({
  discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',market_events:[]
 }),{discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',market_events:[]});
});
test('source facts cannot become verified or realtime PnL by editing the reference',async()=>{
 const d=await read();
 const tampered=structuredClone(d);
 tampered.cases[0].reported_profit_not_verified=false;
 assert.throws(()=>validateUserSuppliedMemecoinReferences(tampered));
 const future=structuredClone(d);
 future.cases[0].sell_reference_utc_date='2026-11-18';
 assert.throws(()=>validateUserSuppliedMemecoinReferences(future));
 const forged=structuredClone(d);
 forged.cases[0].transaction_ids=['SOME_UNVERIFIED_ID'];
 assert.throws(()=>validateUserSuppliedMemecoinReferences(forged));
});
