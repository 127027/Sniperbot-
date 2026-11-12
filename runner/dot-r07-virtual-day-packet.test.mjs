import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseR07VirtualDay} from './dot-r07-virtual-day-packet.mjs';
const source='https://news.example.org/original';
const base={kind:'ORIGINAL_POST',source_url:source,published_at_utc:'2024-10-10T00:01:00Z',
 captured_at_utc:'2024-10-10T18:20:00Z',
 archive_url:'https://web.archive.org/web/20241010182000/'+source,
 capture_verified:true,sha256:'a'.repeat(64),token_address:'SOLTOKEN',
 future_ath_price:9999,winner_label:'known_after_event'};
test('a 2024 day receives the archival metadata if captured within day, without any future outcome fields',()=>{
 const r=releaseR07VirtualDay({virtual_day_utc:'2024-10-10',events:[base]});
 assert.equal(r.source_packets.length,1);assert.equal(r.actionable,false);
 assert(!JSON.stringify(r).includes('future_ath_price'));
 assert(!JSON.stringify(r).includes('winner_label'));
 assert.equal(r.real_archived_bytes_independently_audited,false);
});
test('post from future day and later archived rewrite are not visible in previous days',()=>{
 const r=releaseR07VirtualDay({virtual_day_utc:'2024-10-09',events:[base]});
 assert.equal(r.source_packets.length,0);assert.equal(r.excluded_by_reason.FUTURE_CAPTURE,1);
 const later=releaseR07VirtualDay({virtual_day_utc:'2024-10-10',events:[{...base,
 captured_at_utc:'2024-10-11T18:20:00Z',
 archive_url:'https://web.archive.org/web/20241011182000/'+source}]});
 assert.equal(later.source_packets.length,0);
});
test('old published-at date alone never creates an admissible historical item',()=>{
 const r=releaseR07VirtualDay({virtual_day_utc:'2024-10-11',
 events:[{...base,capture_verified:false}, {...base,archive_url:'https://wrong.net/not-wayback'},
 {...base,published_at_utc:'2024-10-12T00:00:00Z'}]});
 assert.equal(r.source_packets.length,0);assert.equal(r.excluded_by_reason.NO_VERIFIED_ASOF_PROVENANCE,3);
});
test('on-chain event needs verified block/time + tx id and no price from future',()=>{
 const event={kind:'ONCHAIN_POOL',chain:'solana',chain_provenance_verified:true,
 block_time_utc:'2024-10-10T20:00:00Z',block_height:295907953,
 explorer_url:'https://explorer.solana.com/tx/test',transaction_id:'a'.repeat(50),
 token_address:'TESTTOKEN',pool_address:'TESTPOOL',future_pnl:12345};
 const x=releaseR07VirtualDay({virtual_day_utc:'2024-10-10',events:[event]});
 assert.equal(x.source_packets.length,1);
 assert(!JSON.stringify(x).includes('future_pnl'));
 assert.equal(releaseR07VirtualDay({virtual_day_utc:'2024-10-09',events:[event]}).source_packets.length,0);
});
test('day outside the 61-day interval is rejected and the packet cannot execute a buy',()=>{
 assert.throws(()=>releaseR07VirtualDay({virtual_day_utc:'2024-11-10',events:[]}));
 assert.throws(()=>releaseR07VirtualDay({virtual_day_utc:'2024-02-30',events:[]}));
 const p=releaseR07VirtualDay({virtual_day_utc:'2024-11-09',events:[]});
 assert.equal(p.paper_only,true);assert.equal(p.actionable,false);
});
