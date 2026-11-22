import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planAppendPaperOrderIndex}
 from '../src/v19-signal-index-integrity.mjs';

const path=id=>'signals/orders/order-'+id+'.json';
const sha=n=>n.toString(16).padStart(40,'0');
const existing=n=>({schema:1,mode:'PAPER',orders:Array.from({length:n},(_,i)=>({
 path:path(String(i).padStart(8,'0')),sha:sha(i+1)}))});

test('D5-02: append preserves every older order and stable order ID',()=>{
 const original=existing(399),before=JSON.stringify(original);
 const r=planAppendPaperOrderIndex({index:original,
  orderPath:path('neworder01'),orderSha:sha(444)});
 assert.equal(r.alreadyIndexed,false);
 assert.equal(r.order_count,400);
 assert.deepEqual(r.index.orders.slice(0,399),original.orders);
 assert.equal(r.index.orders[399].path,path('neworder01'));
 assert.equal(JSON.stringify(original),before);
});
test('SYS-09: at capacity reject rather than evict any unprocessed order pointer',()=>{
 const full=existing(400);
 const snapshot=JSON.stringify(full);
 assert.throws(()=>planAppendPaperOrderIndex({index:full,
  orderPath:path('neworder02'),orderSha:sha(555)}),
  /SIGNAL_INDEX_AT_CAPACITY_NO_EVICTION_ALLOWED/);
 assert.equal(JSON.stringify(full),snapshot);
});
test('publisher retry idempotency: same order and SHA is safe even at full index',()=>{
 const full=existing(400),item=full.orders[250];
 const reused=planAppendPaperOrderIndex({index:full,orderPath:item.path,
  orderSha:item.sha,maxIndexSize:400});
 assert.equal(reused.alreadyIndexed,true);
 assert.deepEqual(reused.index,full);
 assert.equal(reused.order_count,400);
 assert.throws(()=>planAppendPaperOrderIndex({index:full,
  orderPath:item.path,orderSha:sha(9999)}),/ORDER_ID_REUSED/);
});
test('invalid index entries, duplicate IDs and bad configuration are refused',()=>{
 const duplicate=existing(2);duplicate.orders[1].path=duplicate.orders[0].path;
 assert.throws(()=>planAppendPaperOrderIndex({index:duplicate,
  orderPath:path('neworder03'),orderSha:sha(123)}),
  /INVALID_OR_DUPLICATED_EXISTING_SIGNAL_INDEX/);
 assert.throws(()=>planAppendPaperOrderIndex({index:existing(1),
  orderPath:'signals/orders/../escape.json',orderSha:sha(33)}),
  /INVALID_SIGNAL_INDEX_OR_NEW_ORDER/);
 assert.throws(()=>planAppendPaperOrderIndex({index:existing(1),
  orderPath:path('neworder03'),orderSha:sha(33),maxIndexSize:501}),
  /INVALID_SIGNAL_INDEX_OR_NEW_ORDER/);
 const polluted=existing(1);polluted.orders[0].sha='bad';
 assert.throws(()=>planAppendPaperOrderIndex({index:polluted,
  orderPath:path('neworder03'),orderSha:sha(33)}),
  /INVALID_OR_DUPLICATED_EXISTING_SIGNAL_INDEX/);
});
test('publisher checks capacity BEFORE writing any new order and never slices old pointers',async()=>{
 const code=await readFile('src/publisher.mjs','utf8');
 const preflight=code.indexOf("const indexBefore=await transport.read('signals/index.json')");
 const firstPut=code.indexOf("await transport.request(path,{method:'PUT'");
 assert.ok(preflight>=0&&firstPut>preflight);
 assert.match(code,/planAppendPaperOrderIndex/);
 assert.doesNotMatch(code,/\.slice\(-maxIndexSize\)/);
 assert.match(code,/DOT3_AUTH_NOT_VERIFIED/);
 assert.match(code,/SELL_OPENING_LOT_ID_REQUIRED/);
});
