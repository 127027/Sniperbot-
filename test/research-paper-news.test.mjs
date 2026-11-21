import test from 'node:test';
import assert from 'node:assert/strict';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
const date='2026-11-15',contract='0x'+'a'.repeat(40),address='0x'+'b'.repeat(40);
const c=(t,price)=>({known_no_earlier_than_utc:date+'T'+t+':00Z',close_usd:price,volume_usd:6000});
const pool={id:'base:'+address,chain:'base',pool:address,contract,symbol:'SYNTH',pool_created_at_utc:date+'T00:00:00Z',
 candles:[c('00:05',1),c('00:10',1),c('00:15',1),c('00:30',1.045),c('01:30',1.3)]};
const news=(source,seen=date+'T00:25:00Z')=>({source_origin:source,
 chain:'base',pool:address,contract,independent_origin_verified:true,
 published_at_utc:date+'T00:20:00Z',first_captured_at_utc:seen});
test('no media proof: news-aware research results are bit-for-bit identical baseline',()=>{
 const a=runResearchPaperLab({date,preset:'guarded_reentry',pools:[pool]});
 const b=runResearchPaperLab({date,preset:'guarded_reentry',pools:[pool],mediaEvidence:[]});
 assert.deepEqual(a.events,b.events);assert.equal(a.realized_hypothetical_pnl_test_usdc,b.realized_hypothetical_pnl_test_usdc);
});
test('two independent exact-contract pre-decision captures can change ONLY research momentum threshold',()=>{
 const a=runResearchPaperLab({date,preset:'guarded_reentry',pools:[pool]});
 const b=runResearchPaperLab({date,preset:'guarded_reentry',pools:[pool],mediaEvidence:[news('POST_A'),news('POST_B')]});
 assert.notEqual(a.scans[0].decisions[0].action,'BUY_EXPERIMENT');
 assert.equal(b.scans[0].decisions[0].action,'BUY_EXPERIMENT');
 assert.equal(b.scans[0].decisions[0].media_sufficient_evidence,true);
 assert.equal(b.verified_client_fills,0);
});
test('same article twice, old quotes, wrong pool, retroactively discovered media NEVER boost scan',()=>{
 const trials=[[news('SAME'),news('SAME')],
  [news('A',date+'T01:35:00Z'),news('B')],
  [{...news('A'),pool:'0x'+'c'.repeat(40)},news('B')],
  [{...news('A'),independent_origin_verified:false},news('B')],
  [{...news('A'),published_at_utc:date+'T01:00:00Z'},news('B')]];
 for(const events of trials){
  const r=runResearchPaperLab({date,preset:'guarded_reentry',pools:[pool],mediaEvidence:events});
  assert.notEqual(r.scans[0].decisions[0].action,'BUY_EXPERIMENT');
 }
});
