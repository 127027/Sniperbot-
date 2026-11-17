import test from 'node:test';
import assert from 'node:assert/strict';
import {probeArchiveAnchors,anchorURL,ANCHORS} from './neutral-second-archive-head-pilot.mjs';
test('only neutral historical days and fixed first hour are used',()=>{
 assert.equal(anchorURL('2026-07-20'),'https://replay.pumpapi.io/2026/07/20/00.jsonl.zst');
 assert.equal(anchorURL('2026-11-16',23),'https://replay.pumpapi.io/2026/11/16/23.jsonl.zst');
 assert.equal(ANCHORS.length,8);
 assert.throws(()=>anchorURL('../2026-07-20'),/UNTRUSTED/);
 assert.throws(()=>anchorURL('2026-07-20',24),/UNTRUSTED/);
});
test('successful HEAD is NOT falsely counted as full day or executable trade',async()=>{
 const out=await probeArchiveAnchors({days:['2026-07-20'],fetcher:async(_url,opts)=>{
 assert.equal(opts.method,'HEAD');
 return {ok:true,status:200,headers:{get:key=>key==='content-length'?'420000000':'application/zstd'}}}});
 assert.equal(out.head_ok_count,1);
 assert.equal(out.anchors[0].complete_24h_day_proven,false);
 assert.equal(out.anchors[0].original_event_availability_proven,false);
 assert.equal(out.portfolio_pnl_test_usdc,null);
});
test('HTTP errors remain unknown, never trade evidence',async()=>{
 const out=await probeArchiveAnchors({days:['2026-11-16'],fetcher:async()=>({ok:false,status:403,headers:{get:()=>null}})});
 assert.equal(out.head_ok_count,0);
 assert.equal(out.anchors[0].head_status,'UNKNOWN');
 assert.equal(out.virtual_trades_confirmed,0);
});
